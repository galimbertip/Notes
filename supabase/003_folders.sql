-- GPverse Notes — aggiornamento per V.0.3.0 (corsi e cartelle)
-- Esegui in Supabase → SQL Editor → New query → Run.
-- È sicuro eseguirlo più volte.

create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  color      text not null default '#2ee6ff',
  created_at timestamptz not null default now()
);
create index if not exists folders_user on public.folders (user_id, name);

alter table public.folders enable row level security;
drop policy if exists folders_owner on public.folders;
create policy folders_owner on public.folders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ogni nota può stare in una cartella; eliminando la cartella le note restano (senza cartella)
alter table public.notes add column if not exists folder_id uuid references public.folders(id) on delete set null;
create index if not exists notes_folder on public.notes (user_id, folder_id);

-- Spostare una nota in un'altra cartella aggiorna la data di modifica
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.drawing is distinct from old.drawing
     or new.folder_id is distinct from old.folder_id then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

-- Una nota può essere messa solo in una cartella propria
create or replace function public.check_note_folder() returns trigger
language plpgsql as $$
begin
  if new.folder_id is not null and not exists (
    select 1 from public.folders f where f.id = new.folder_id and f.user_id = new.user_id
  ) then
    raise exception 'folder not found';
  end if;
  return new;
end $$;

drop trigger if exists notes_folder_check on public.notes;
create trigger notes_folder_check before insert or update of folder_id on public.notes
  for each row execute function public.check_note_folder();
