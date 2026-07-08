CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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