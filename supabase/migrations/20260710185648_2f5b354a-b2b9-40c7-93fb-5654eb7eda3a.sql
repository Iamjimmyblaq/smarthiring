CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public._sh_call_edge(fn_name TEXT, body JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url TEXT := 'https://yafghloodzqbcjmupuwb.supabase.co/functions/v1/';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InlhZmdobG9vZHpxYmNqbXVwdXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDk2MzQsImV4cCI6MjA5Mjk4NTYzNH0.gbVjrKgFDYgu6sUGHdqK--UJPKziW113RkvhkJPx9EE';
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

CREATE OR REPLACE FUNCTION public._sh_on_candidate_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM public._sh_call_edge('candidate-stage-notify', jsonb_build_object('candidate_id', NEW.id, 'old_stage', OLD.stage, 'new_stage', NEW.stage));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._sh_on_interview_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._sh_call_edge('interview-scheduled-notify', jsonb_build_object('kind','human','interview_id', NEW.id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._sh_on_ai_session_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._sh_call_edge('interview-scheduled-notify', jsonb_build_object('kind','ai','session_id', NEW.id));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._sh_call_edge(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_candidate_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_interview_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_ai_session_created() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sh_call_edge(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public._sh_on_candidate_stage_change() TO service_role;
GRANT EXECUTE ON FUNCTION public._sh_on_interview_created() TO service_role;
GRANT EXECUTE ON FUNCTION public._sh_on_ai_session_created() TO service_role;

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