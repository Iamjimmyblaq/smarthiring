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

REVOKE EXECUTE ON FUNCTION public._sh_call_edge(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sh_call_edge(TEXT, JSONB) TO service_role;