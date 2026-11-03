-- GPverse Notes — schema V.0.1.0
-- Esegui tutto in Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- ── Appunti ──────────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  drawing     jsonb not null default '{"height":1400,"strokes":[]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_user_updated on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;
drop policy if exists notes_owner on public.notes;
create policy notes_owner on public.notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Registrazioni audio ─────────────────────────────────
create table if not exists public.recordings (
  id           uuid primary key,
  note_id      uuid not null references public.notes(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type    text,
  duration_ms  integer,
  speech_lang  text,
  transcript   jsonb not null default '[]'::jsonb,   -- [{t: ms, text: "..."}]
  created_at   timestamptz not null default now()
);
create index if not exists recordings_note on public.recordings (note_id, created_at);

alter table public.recordings enable row level security;
drop policy if exists recordings_owner on public.recordings;
create policy recordings_owner on public.recordings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── updated_at automatico ───────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- ── Storage audio (privato, una cartella per utente) ────
-- 50 MB per file = limite del piano Free (a 24 kbps ≈ 4,5 ore di audio).
insert into storage.buckets (id, name, public, file_size_limit)
values ('audio', 'audio', false, 52428800)
on conflict (id) do nothing;

drop policy if exists audio_select_own on storage.objects;
drop policy if exists audio_insert_own on storage.objects;
drop policy if exists audio_update_own on storage.objects;
drop policy if exists audio_delete_own on storage.objects;

create policy audio_select_own on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy audio_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy audio_update_own on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy audio_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
