
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status TEXT NOT NULL DEFAULT 'pending',
  agent_id TEXT,
  conversation_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  scores JSONB,
  sentiment TEXT,
  summary TEXT,
  recommendation TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_sessions_select_own" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_sessions_insert_own" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_sessions_update_own" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_sessions_delete_own" ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_interview_sessions_user ON public.interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_candidate ON public.interview_sessions(candidate_id);
CREATE INDEX idx_interview_sessions_token ON public.interview_sessions(token);

-- Public lookup by token: returns session + minimal job/candidate context, only if not expired
CREATE OR REPLACE FUNCTION public.get_interview_session_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  candidate_name TEXT,
  job_title TEXT,
  job_description TEXT,
  required_skills TEXT[],
  company_name TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.status, c.name, j.title, j.description, j.required_skills, j.company_name, s.expires_at
  FROM public.interview_sessions s
  JOIN public.candidates c ON c.id = s.candidate_id
  JOIN public.jobs j ON j.id = s.job_id
  WHERE s.token = _token
    AND s.expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_interview_session_by_token(TEXT) TO anon, authenticated;
