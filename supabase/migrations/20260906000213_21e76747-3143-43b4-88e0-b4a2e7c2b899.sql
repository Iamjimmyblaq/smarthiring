REVOKE ALL ON FUNCTION public.plan_limit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plan_assessments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plan_ai_interviews() FROM PUBLIC, anon, authenticated;