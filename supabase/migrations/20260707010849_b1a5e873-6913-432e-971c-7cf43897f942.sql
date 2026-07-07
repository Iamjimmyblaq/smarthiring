
-- Enable pg_net for outbound HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============ api_keys ============
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.api_keys(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api keys select" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own api keys insert" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own api keys update" ON public.api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own api keys delete" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ webhook_endpoints ============
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.webhook_endpoints(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own webhooks all" ON public.webhook_endpoints FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ webhook_deliveries ============
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.webhook_deliveries(user_id);
CREATE INDEX ON public.webhook_deliveries(endpoint_id);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deliveries select" ON public.webhook_deliveries FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ Trigger helpers ============
-- Store project URL + service key reference for HTTP callouts
CREATE OR REPLACE FUNCTION public._sh_call_edge(fn_name TEXT, body JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url TEXT := 'https://yafghloodzqbcjmupuwb.supabase.co/functions/v1/';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmdobG9vZHpxYmNqbXVwdXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDk2MzQsImV4cCI6MjA5Mjk4NTYzNH0.gbVjrKgFDYgu6sUGHdqK--UJPKziW113RkvhkJPx9EE';
BEGIN
  PERFORM net.http_post(
    url := base_url || fn_name,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon_key),
    body := body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'edge call failed: %', SQLERRM;
END;
$$;

-- Candidate stage change trigger
CREATE OR REPLACE FUNCTION public._sh_on_candidate_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM public._sh_call_edge('candidate-stage-notify',
      jsonb_build_object('candidate_id', NEW.id, 'old_stage', OLD.stage, 'new_stage', NEW.stage));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_candidate_stage_change ON public.candidates;
CREATE TRIGGER trg_candidate_stage_change
AFTER UPDATE OF stage ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public._sh_on_candidate_stage_change();

-- Interview scheduled trigger
CREATE OR REPLACE FUNCTION public._sh_on_interview_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._sh_call_edge('interview-scheduled-notify',
    jsonb_build_object('kind','human','interview_id', NEW.id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_interview_created ON public.interviews;
CREATE TRIGGER trg_interview_created AFTER INSERT ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public._sh_on_interview_created();

-- AI interview session created trigger
CREATE OR REPLACE FUNCTION public._sh_on_ai_session_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._sh_call_edge('interview-scheduled-notify',
    jsonb_build_object('kind','ai','session_id', NEW.id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ai_session_created ON public.interview_sessions;
CREATE TRIGGER trg_ai_session_created AFTER INSERT ON public.interview_sessions
FOR EACH ROW EXECUTE FUNCTION public._sh_on_ai_session_created();
