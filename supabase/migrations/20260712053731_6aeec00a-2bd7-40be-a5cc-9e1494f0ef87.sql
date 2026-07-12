
-- Job dedup / idempotency for external integrations
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_source TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_user_external_uidx
  ON public.jobs (user_id, external_source, external_id)
  WHERE external_id IS NOT NULL;
-- Best-effort dedup fallback on title+company for same user
CREATE INDEX IF NOT EXISTS jobs_user_title_company_idx
  ON public.jobs (user_id, lower(title), lower(coalesce(company_name,'')));

-- Email delivery log (admin visibility + idempotent sends)
CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'stage_change' | 'interview_scheduled' | 'ai_interview'
  context JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed|skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  provider_status INTEGER,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_deliveries_idem_uidx
  ON public.email_deliveries (user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS email_deliveries_user_created_idx
  ON public.email_deliveries (user_id, created_at DESC);

GRANT SELECT ON public.email_deliveries TO authenticated;
GRANT ALL ON public.email_deliveries TO service_role;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own email deliveries"
  ON public.email_deliveries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER email_deliveries_set_updated_at
  BEFORE UPDATE ON public.email_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Restore/ensure triggers wired to notify functions
DROP TRIGGER IF EXISTS trg_candidate_stage_change ON public.candidates;
CREATE TRIGGER trg_candidate_stage_change
  AFTER UPDATE OF stage ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public._sh_on_candidate_stage_change();

DROP TRIGGER IF EXISTS trg_interview_created ON public.interviews;
CREATE TRIGGER trg_interview_created
  AFTER INSERT ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public._sh_on_interview_created();

DROP TRIGGER IF EXISTS trg_ai_session_created ON public.interview_sessions;
CREATE TRIGGER trg_ai_session_created
  AFTER INSERT ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public._sh_on_ai_session_created();
