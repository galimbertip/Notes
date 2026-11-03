-- GPverse Notes — aggiornamento per V.0.2.0 (traduzione DeepL)
-- Esegui in Supabase → SQL Editor → New query → Run.
-- È sicuro eseguirlo più volte.

-- Traduzioni salvate in cache, per non riconsumare caratteri DeepL
alter table public.notes      add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.recordings add column if not exists translations jsonb not null default '{}'::jsonb;

-- updated_at cambia solo se cambia il contenuto (non quando si salva una traduzione)
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.drawing is distinct from old.drawing then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

-- Caratteri tradotti per utente e per mese
create table if not exists public.translation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month   text not null,               -- 'YYYY-MM'
  chars   bigint not null default 0,
  primary key (user_id, month)
);
alter table public.translation_usage enable row level security;
drop policy if exists usage_select_own on public.translation_usage;
create policy usage_select_own on public.translation_usage
  for select to authenticated using (auth.uid() = user_id);

-- Incremento atomico, chiamabile solo dalla Edge Function (service role)
create or replace function public.add_translation_usage(p_user uuid, p_chars integer)
returns bigint
language sql security definer set search_path = public as $$
  insert into public.translation_usage (user_id, month, chars)
  values (p_user, to_char(now() at time zone 'utc', 'YYYY-MM'), p_chars)
  on conflict (user_id, month) do update set chars = public.translation_usage.chars + excluded.chars
  returning chars;
$$;
revoke all on function public.add_translation_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_translation_usage(uuid, integer) to service_role;
