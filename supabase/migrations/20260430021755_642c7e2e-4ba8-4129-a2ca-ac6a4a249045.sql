-- 1. Remove candidates from realtime publication (no current feature requires it)
ALTER PUBLICATION supabase_realtime DROP TABLE public.candidates;

-- 2. Server-side enforcement of free plan quotas
CREATE OR REPLACE FUNCTION public.enforce_free_plan_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  job_count integer;
BEGIN
  SELECT plan INTO user_plan FROM public.user_plans WHERE user_id = NEW.user_id;
  IF user_plan IS NULL THEN user_plan := 'free'; END IF;
  IF user_plan = 'free' THEN
    SELECT count(*) INTO job_count FROM public.jobs WHERE user_id = NEW.user_id;
    IF job_count >= 1 THEN
      RAISE EXCEPTION 'Free plan limited to 1 job. Upgrade to Pro to create more.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_plan_jobs_trigger ON public.jobs;
CREATE TRIGGER enforce_free_plan_jobs_trigger
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_jobs();

CREATE OR REPLACE FUNCTION public.enforce_free_plan_candidates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  cand_count integer;
BEGIN
  SELECT plan INTO user_plan FROM public.user_plans WHERE user_id = NEW.user_id;
  IF user_plan IS NULL THEN user_plan := 'free'; END IF;
  IF user_plan = 'free' THEN
    SELECT count(*) INTO cand_count FROM public.candidates WHERE user_id = NEW.user_id;
    IF cand_count >= 100 THEN
      RAISE EXCEPTION 'Free plan limited to 100 resumes. Upgrade to Pro to upload more.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_plan_candidates_trigger ON public.candidates;
CREATE TRIGGER enforce_free_plan_candidates_trigger
  BEFORE INSERT ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_candidates();

-- 3. Storage UPDATE policy for resumes bucket scoped to file owner
CREATE POLICY "resumes_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND (auth.uid())::text = (storage.foldername(name))[1]);