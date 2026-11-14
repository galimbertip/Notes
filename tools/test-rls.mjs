import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
// Uso: cd tools && npm i @electric-sql/pglite@0.2.17 && node test-rls.mjs
// Esegue gli script SQL su un Postgres locale (PGlite) con Supabase simulato e verifica chi vede/modifica cosa.
const R = new URL("../supabase/", import.meta.url).pathname;
const db = new PGlite();
const ex = q => db.exec(q);
// ── stub di Supabase ──
await ex(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema auth, storage, public to authenticated;
grant execute on all functions in schema auth to authenticated;
grant all on storage.objects to authenticated;
`);
for (const f of ["schema.sql", "002_translation.sql", "003_folders.sql", "004_sharing.sql", "004_sharing.sql"]) {
  try { await ex(fs.readFileSync(R + f, "utf8").replace(/create extension if not exists pgcrypto;/, "")); console.log("OK  ", f); }
  catch (e) { console.log("FAIL", f, e.message); process.exit(1); }
}
await ex(`grant all on all tables in schema public to authenticated; grant execute on all functions in schema public to authenticated;`);

const U = { paolo: "11111111-1111-1111-1111-111111111111", anna: "22222222-2222-2222-2222-222222222222", marco: "33333333-3333-3333-3333-333333333333" };
const EM = { paolo: "paolo@x.it", anna: "Anna@X.it", marco: "marco@x.it" };
for (const k in U) await ex(`insert into auth.users values ('${U[k]}', '${EM[k]}')`);

let pass = 0, fail = 0;
async function as(who, q, params) {
  await ex(`reset role`);
  await ex(`select set_config('request.jwt.claim.sub', '${U[who]}', false), set_config('request.jwt.claims', '${JSON.stringify({ sub: U[who], email: EM[who] })}', false)`);
  await ex(`set role authenticated`);
  return db.query(q, params);
}
async function check(label, fn, expect) {
  let got;
  try { got = await fn(); } catch (e) { got = "ERR: " + e.message.split("\n")[0]; }
  const ok = typeof expect === "function" ? expect(got) : JSON.stringify(got) === JSON.stringify(expect);
  ok ? pass++ : fail++;
  console.log(ok ? "  ✓" : "  ✗", label, ok ? "" : "→ " + JSON.stringify(got));
}
const rows = r => r.rows.length;
const isErr = g => typeof g === "string" && g.startsWith("ERR");

// dati di Paolo
await as("paolo", `insert into folders (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Sicurezza')`);
await as("paolo", `insert into notes (id, title, folder_id) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Nota nel corso', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Nota singola', null),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Nota privata', null)`);
await as("paolo", `insert into recordings (id, note_id, storage_path) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '${U.paolo}/rec1.webm')`);
await ex(`reset role; insert into storage.objects (bucket_id, name, owner) values ('audio', '${U.paolo}/rec1.webm', '${U.paolo}')`);

console.log("Prima della condivisione");
await check("Anna non vede note di Paolo", async () => rows(await as("anna", `select * from notes`)), 0);

console.log("Condivisioni");
await check("Paolo condivide il corso con Anna (modifica, email maiuscola)", async () => rows(await as("paolo",
  `insert into shares (folder_id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001', ' ANNA@x.it ', 'edit') returning id`)), 1);
await check("Paolo condivide la nota singola con Marco (lettura)", async () => rows(await as("paolo",
  `insert into shares (note_id, email, role) values ('bbbbbbbb-0000-0000-0000-000000000002', 'marco@x.it', 'view') returning id`)), 1);
await check("owner_email salvata", async () => (await as("paolo", `select owner_email from shares limit 1`)).rows[0].owner_email, "paolo@x.it");
await check("Marco non può condividere una nota di Paolo", async () => await as("marco",
  `insert into shares (note_id, email) values ('bbbbbbbb-0000-0000-0000-000000000003', 'marco@x.it')`), isErr);
await check("doppia condivisione stessa email rifiutata", async () => await as("paolo",
  `insert into shares (note_id, email) values ('bbbbbbbb-0000-0000-0000-000000000002', 'MARCO@x.it')`), isErr);

console.log("Anna (corso, modifica)");
await check("vede solo la nota del corso", async () => (await as("anna", `select title from notes`)).rows.map(r => r.title), ["Nota nel corso"]);
await check("vede il nome del corso", async () => (await as("anna", `select name from folders`)).rows.map(r => r.name), ["Sicurezza"]);
await check("note_access = 2", async () => (await as("anna", `select note_access('bbbbbbbb-0000-0000-0000-000000000001') a`)).rows[0].a, 2);
await check("può modificare il testo", async () => (await as("anna",
  `update notes set body = 'aggiunto da Anna' where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning body`)).rows.length, 1);
await check("non può cambiare proprietario", async () => await as("anna",
  `update notes set user_id = '${U.anna}' where id = 'bbbbbbbb-0000-0000-0000-000000000001'`), isErr);
await check("non può spostare la nota di corso", async () => await as("anna",
  `update notes set folder_id = null where id = 'bbbbbbbb-0000-0000-0000-000000000001'`), isErr);
await check("non può eliminare la nota", async () => (await as("anna",
  `delete from notes where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id`)).rows.length, 0);
await check("vede la registrazione", async () => rows(await as("anna", `select * from recordings`)), 1);
await check("vede l'audio nello storage", async () => rows(await as("anna", `select * from storage.objects`)), 1);
await check("può correggere la trascrizione", async () => rows(await as("anna",
  `update recordings set transcript = '[{"t":0,"text":"x"}]' where id = 'cccccccc-0000-0000-0000-000000000001' returning id`)), 1);
await check("può aggiungere una registrazione", async () => rows(await as("anna",
  `insert into recordings (id, note_id, storage_path) values ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '${U.anna}/rec2.webm') returning id`)), 1);
await check("non può creare note nel corso di Paolo", async () => await as("anna",
  `insert into notes (title, folder_id) values ('x', 'aaaaaaaa-0000-0000-0000-000000000001')`), isErr);
await check("non vede la condivisione fatta a Marco", async () => rows(await as("anna", `select * from shares where email = 'marco@x.it'`)), 0);

console.log("Marco (nota singola, lettura)");
await check("vede solo la nota singola", async () => (await as("marco", `select title from notes`)).rows.map(r => r.title), ["Nota singola"]);
await check("note_access = 1", async () => (await as("marco", `select note_access('bbbbbbbb-0000-0000-0000-000000000002') a`)).rows[0].a, 1);
await check("non può modificare", async () => rows(await as("marco",
  `update notes set body = 'hack' where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning id`)), 0);
await check("non vede il corso", async () => rows(await as("marco", `select * from folders`)), 0);
await check("non vede l'audio del corso", async () => rows(await as("marco", `select * from storage.objects`)), 0);
await check("non può aggiungere registrazioni", async () => await as("marco",
  `insert into recordings (id, note_id, storage_path) values (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002', '${U.marco}/x.webm')`), isErr);
await check("upsert di nota propria funziona ancora", async () => rows(await as("marco",
  `insert into notes (id, title) values ('dddddddd-0000-0000-0000-000000000001', 'mia') on conflict (id) do update set title = excluded.title returning id`)), 1);

console.log("Paolo (proprietario)");
await check("vede la registrazione aggiunta da Anna", async () => rows(await as("paolo", `select * from recordings`)), 2);
await check("non vede la nota di Marco", async () => rows(await as("paolo", `select * from notes where title = 'mia'`)), 0);
await check("può ancora fare upsert delle sue note", async () => rows(await as("paolo",
  `insert into notes (id, title) values ('bbbbbbbb-0000-0000-0000-000000000003', 'Nota privata 2') on conflict (id) do update set title = excluded.title returning id`)), 1);
await check("può spostare la sua nota", async () => rows(await as("paolo",
  `update notes set folder_id = null where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id`)), 1);
await check("…e Anna non la vede più (era condivisa via corso)", async () => rows(await as("anna", `select * from notes`)), 0);
await check("revoca della condivisione a Marco", async () => rows(await as("paolo", `delete from shares where email = 'marco@x.it' returning id`)), 1);
await check("…Marco non vede più la nota", async () => rows(await as("marco", `select * from notes where user_id = '${U.paolo}'`)), 0);
await check("updated_at non cambia salvando solo traduzioni", async () => {
  const a = (await as("paolo", `select updated_at from notes where id='bbbbbbbb-0000-0000-0000-000000000002'`)).rows[0].updated_at;
  await as("paolo", `update notes set translations='{"EN":{}}' where id='bbbbbbbb-0000-0000-0000-000000000002'`);
  const b = (await as("paolo", `select updated_at from notes where id='bbbbbbbb-0000-0000-0000-000000000002'`)).rows[0].updated_at;
  return +a === +b; }, true);
console.log(`\n${pass} ok, ${fail} falliti`);
process.exit(fail ? 1 : 0);
