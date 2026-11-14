-- GPverse Notes — aggiornamento per V.0.7.0 (condivisione con i colleghi)
-- Esegui in Supabase → SQL Editor → New query → Run.
-- Richiede 003_folders.sql già eseguito. È sicuro eseguirlo più volte.
--
-- Si condivide una nota o un intero corso con un indirizzo email:
--   view = sola lettura, edit = può modificare testo/disegni e aggiungere registrazioni.
-- Il collega deve avere (o creare) un account GPverse Notes con quella email.

-- ── Condivisioni ─────────────────────────────────────────
create table if not exists public.shares (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  note_id     uuid references public.notes(id) on delete cascade,
  folder_id   uuid references public.folders(id) on delete cascade,
  email       text not null,
  role        text not null default 'view' check (role in ('view', 'edit')),
  created_at  timestamptz not null default now(),
  check ((note_id is null) <> (folder_id is null))
);
create unique index if not exists shares_note_email   on public.shares (note_id, email)   where note_id is not null;
create unique index if not exists shares_folder_email on public.shares (folder_id, email) where folder_id is not null;
create index if not exists shares_email on public.shares (email);

-- email sempre in minuscolo
create or replace function public.shares_normalize() returns trigger
language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;
drop trigger if exists shares_normalize on public.shares;
create trigger shares_normalize before insert or update on public.shares
  for each row execute function public.shares_normalize();

-- email dell'utente collegato
create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- livello di accesso a una nota: 2 = proprietario o modifica, 1 = sola lettura, 0 = nessuno
create or replace function public.note_access(p_note uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when n.user_id = auth.uid() then 2
      else coalesce((
        select max(case s.role when 'edit' then 2 else 1 end)
        from public.shares s
        where s.email = public.my_email() and public.my_email() <> ''
          and s.owner_id = n.user_id
          and (s.note_id = n.id or (s.folder_id is not null and s.folder_id = n.folder_id))
      ), 0)
    end
    from public.notes n where n.id = p_note
  ), 0);
$$;
grant execute on function public.note_access(uuid) to authenticated;

-- controlli usati dalle regole (security definer: evitano richiami circolari tra le regole)
create or replace function public.owns_note(p_note uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.notes where id = p_note and user_id = auth.uid());
$$;
create or replace function public.owns_folder(p_folder uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.folders where id = p_folder and user_id = auth.uid());
$$;
create or replace function public.folder_shared_with_me(p_folder uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_email() <> '' and exists (
    select 1 from public.shares where folder_id = p_folder and email = public.my_email());
$$;
grant execute on function public.owns_note(uuid), public.owns_folder(uuid), public.folder_shared_with_me(uuid) to authenticated;

alter table public.shares enable row level security;
drop policy if exists shares_owner on public.shares;
create policy shares_owner on public.shares
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (note_id is null or public.owns_note(note_id))
    and (folder_id is null or public.owns_folder(folder_id))
  );
drop policy if exists shares_grantee on public.shares;
create policy shares_grantee on public.shares
  for select to authenticated
  using (email = public.my_email());

-- ── Note condivise ──────────────────────────────────────
drop policy if exists notes_shared_read on public.notes;
create policy notes_shared_read on public.notes
  for select to authenticated
  using (public.note_access(id) >= 1);

drop policy if exists notes_shared_edit on public.notes;
create policy notes_shared_edit on public.notes
  for update to authenticated
  using (public.note_access(id) = 2)
  with check (public.note_access(id) = 2);

-- chi modifica una nota altrui non può cambiarne il proprietario o spostarla di corso
create or replace function public.notes_guard() returns trigger
language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'cannot change note owner';
  end if;
  if old.user_id <> auth.uid() and new.folder_id is distinct from old.folder_id then
    raise exception 'only the owner can move a note';
  end if;
  return new;
end $$;
drop trigger if exists notes_guard on public.notes;
create trigger notes_guard before update on public.notes
  for each row execute function public.notes_guard();

-- ── Corsi condivisi (per vederne il nome) ───────────────
drop policy if exists folders_shared_read on public.folders;
create policy folders_shared_read on public.folders
  for select to authenticated
  using (public.folder_shared_with_me(id));

-- ── Registrazioni delle note condivise ─────────────────
drop policy if exists recordings_owner  on public.recordings;
drop policy if exists recordings_select on public.recordings;
drop policy if exists recordings_insert on public.recordings;
drop policy if exists recordings_update on public.recordings;
drop policy if exists recordings_delete on public.recordings;

create policy recordings_select on public.recordings for select to authenticated
  using (user_id = auth.uid() or public.note_access(note_id) >= 1);
create policy recordings_insert on public.recordings for insert to authenticated
  with check (user_id = auth.uid() and public.note_access(note_id) = 2);
create policy recordings_update on public.recordings for update to authenticated
  using (user_id = auth.uid() or public.note_access(note_id) = 2)
  with check (public.note_access(note_id) = 2);
create policy recordings_delete on public.recordings for delete to authenticated
  using (user_id = auth.uid() or public.owns_note(note_id));

-- ── Audio delle note condivise ──────────────────────────
drop policy if exists audio_select_shared on storage.objects;
create policy audio_select_shared on storage.objects for select to authenticated
  using (bucket_id = 'audio' and exists (
    select 1 from public.recordings r where r.storage_path = name and public.note_access(r.note_id) >= 1));

-- il proprietario della nota può eliminare anche l'audio aggiunto da un collega
drop policy if exists audio_delete_note_owner on storage.objects;
create policy audio_delete_note_owner on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and exists (
    select 1 from public.recordings r join public.notes n on n.id = r.note_id
    where r.storage_path = name and n.user_id = auth.uid()));
