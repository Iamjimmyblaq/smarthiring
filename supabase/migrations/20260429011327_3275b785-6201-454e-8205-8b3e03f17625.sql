
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  requirements text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create index jobs_user_idx on public.jobs(user_id);

create policy "jobs_select_own" on public.jobs for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update using (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs for delete using (auth.uid() = user_id);

create trigger trg_jobs_updated before update on public.jobs
for each row execute function public.set_updated_at();

-- Candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  resume_path text,
  resume_text text,
  overall_score int,
  skills_score int,
  experience_score int,
  education_score int,
  strengths text[] default '{}',
  gaps text[] default '{}',
  summary text,
  status text not null default 'new', -- new | shortlisted | rejected
  processing_status text not null default 'pending', -- pending | processing | done | error
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.candidates enable row level security;
create index candidates_job_idx on public.candidates(job_id);
create index candidates_user_idx on public.candidates(user_id);
create index candidates_score_idx on public.candidates(job_id, overall_score desc);

create policy "candidates_select_own" on public.candidates for select using (auth.uid() = user_id);
create policy "candidates_insert_own" on public.candidates for insert with check (auth.uid() = user_id);
create policy "candidates_update_own" on public.candidates for update using (auth.uid() = user_id);
create policy "candidates_delete_own" on public.candidates for delete using (auth.uid() = user_id);

create trigger trg_candidates_updated before update on public.candidates
for each row execute function public.set_updated_at();

-- Storage bucket for resumes (private)
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Storage policies: files keyed by user id prefix (auth.uid()/...)
create policy "resumes_select_own" on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_insert_own" on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_delete_own" on storage.objects for delete
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
