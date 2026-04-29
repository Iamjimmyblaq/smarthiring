
alter publication supabase_realtime add table public.candidates;
alter table public.candidates replica identity full;
