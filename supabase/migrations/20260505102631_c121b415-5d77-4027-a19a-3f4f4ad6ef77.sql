-- Profile-level defaults
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS hr_email text;

-- Per-job overrides
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS hr_email text;

-- Track sent decision emails on candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS decision_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_email_kind text;
