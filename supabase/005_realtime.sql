-- GPverse Notes — aggiornamento per V.0.8.0 (collaborazione in tempo reale)
-- Esegui in Supabase → SQL Editor → New query → Run.
-- Richiede 004_sharing.sql già eseguito. È sicuro eseguirlo più volte.
--
-- Attiva Supabase Realtime sulle tabelle dell'app: le modifiche arrivano subito
-- a chi ha accesso alla nota (le regole di sicurezza valgono anche qui).

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['notes', 'recordings', 'shares'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
