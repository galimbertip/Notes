// GPverse Notes — Edge Function "translate" (proxy verso DeepL)
// La chiave DeepL resta qui, sul server: il browser non la vede mai.
//
// Secrets richiesti (Supabase → Edge Functions → Secrets):
//   DEEPL_API_KEY        chiave DeepL (le chiavi Free finiscono con ":fx")
// Facoltativo:
//   USER_MONTHLY_LIMIT   caratteri al mese per utente (default 100000)
//
// Richiesta:  POST { texts: string[], target_lang: "IT", source_lang?: "EN" }
// Risposta:   { translations: [{ text, detected_source_language }], usage: { used, limit } }

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region, x-supabase-api-version, x-retry-count",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_CHARS_PER_REQUEST = 100_000;
const MAX_BATCH_BYTES = 100 * 1024;   // DeepL accetta al massimo 128 KiB per richiesta
const MAX_BATCH_TEXTS = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const deeplKey = Deno.env.get("DEEPL_API_KEY");
  if (!deeplKey) return json({ error: "not_configured" }, 500);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey!, { auth: { persistSession: false } });

  // solo utenti autenticati dell'app
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);
  const userId = auth.user.id;

  let body: { texts?: unknown; target_lang?: unknown; source_lang?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const texts = Array.isArray(body.texts) ? body.texts.filter((t): t is string => typeof t === "string") : [];
  const target = String(body.target_lang ?? "").toUpperCase();
  const source = body.source_lang ? String(body.source_lang).toUpperCase().slice(0, 2) : undefined;
  if (!texts.length || !/^[A-Z]{2}(-[A-Z]{2,4})?$/.test(target)) return json({ error: "bad_request" }, 400);

  const chars = texts.reduce((n, t) => n + [...t].length, 0);
  if (chars > MAX_CHARS_PER_REQUEST) return json({ error: "too_long" }, 413);

  // limite mensile per utente
  const limit = Number(Deno.env.get("USER_MONTHLY_LIMIT") ?? 100_000);
  const month = new Date().toISOString().slice(0, 7);
  const { data: row } = await admin.from("translation_usage")
    .select("chars").eq("user_id", userId).eq("month", month).maybeSingle();
  const used = Number(row?.chars ?? 0);
  if (used + chars > limit) return json({ error: "user_limit", usage: { used, limit } }, 429);

  // chiamate a DeepL in blocchi
  const base = deeplKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const enc = new TextEncoder();
  const batches: string[][] = [];
  let cur: string[] = [], bytes = 0;
  for (const t of texts) {
    const b = enc.encode(t).length;
    if (cur.length && (cur.length >= MAX_BATCH_TEXTS || bytes + b > MAX_BATCH_BYTES)) { batches.push(cur); cur = []; bytes = 0; }
    cur.push(t); bytes += b;
  }
  if (cur.length) batches.push(cur);

  const out: { text: string; detected_source_language?: string }[] = [];
  for (const batch of batches) {
    const r = await fetch(`${base}/v2/translate`, {
      method: "POST",
      headers: { "Authorization": `DeepL-Auth-Key ${deeplKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: batch,
        target_lang: target,
        ...(source ? { source_lang: source } : {}),
        preserve_formatting: true,
      }),
    });
    if (r.status === 456) return json({ error: "deepl_quota" }, 429);
    if (r.status === 401 || r.status === 403) return json({ error: "deepl_auth" }, 502);
    if (!r.ok) return json({ error: "deepl_error", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    const d = await r.json();
    out.push(...d.translations);
  }

  const { data: total } = await admin.rpc("add_translation_usage", { p_user: userId, p_chars: chars });
  return json({ translations: out, usage: { used: Number(total ?? used + chars), limit } });
});
