REVOKE EXECUTE ON FUNCTION public.get_interview_session_by_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_interview_session_by_token(TEXT) TO service_role;