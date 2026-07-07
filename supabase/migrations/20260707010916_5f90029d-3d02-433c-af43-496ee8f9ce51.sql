
REVOKE EXECUTE ON FUNCTION public._sh_call_edge(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_candidate_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_interview_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sh_on_ai_session_created() FROM PUBLIC, anon, authenticated;
