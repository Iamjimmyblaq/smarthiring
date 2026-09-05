ALTER TABLE public.plan_tiers ADD COLUMN IF NOT EXISTS max_assessments integer;

ALTER TABLE public.skill_tests
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_test_questions TO authenticated;
GRANT ALL ON public.skill_tests TO service_role;
GRANT ALL ON public.skill_test_questions TO service_role;

DROP POLICY IF EXISTS "Signed-in users can browse tests" ON public.skill_tests;
CREATE POLICY "Browse standard and own custom tests"
ON public.skill_tests FOR SELECT TO authenticated
USING (is_custom = false OR created_by = auth.uid() OR private.is_admin(auth.uid()));

CREATE POLICY "Owners manage their custom tests"
ON public.skill_tests FOR ALL TO authenticated
USING (is_custom = true AND created_by = auth.uid())
WITH CHECK (is_custom = true AND created_by = auth.uid());

CREATE POLICY "Owners manage questions on their custom tests"
ON public.skill_test_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.skill_tests t WHERE t.id = test_id AND t.is_custom AND t.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.skill_tests t WHERE t.id = test_id AND t.is_custom AND t.created_by = auth.uid()));

CREATE OR REPLACE FUNCTION public.plan_limit(_user_id uuid, _limit text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text;
  t public.plan_tiers%ROWTYPE;
BEGIN
  SELECT plan INTO _key FROM public.user_plans WHERE user_id = _user_id;
  IF _key IS NULL THEN _key := 'free'; END IF;
  SELECT * INTO t FROM public.plan_tiers WHERE key = _key AND is_active LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO t FROM public.plan_tiers WHERE is_active AND price_amount = 0 ORDER BY sort_order LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN CASE _limit
    WHEN 'jobs' THEN t.max_jobs
    WHEN 'resumes' THEN t.max_resumes
    WHEN 'ai_interviews' THEN t.max_ai_interviews
    WHEN 'assessments' THEN t.max_assessments
    ELSE NULL END;
END; $$;

REVOKE EXECUTE ON FUNCTION public.plan_limit(uuid, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_free_plan_jobs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'jobs');
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO used FROM public.jobs WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % job(s). Upgrade your subscription to create more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_free_plan_candidates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'resumes');
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO used FROM public.candidates WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % resume upload(s). Upgrade your subscription to upload more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_plan_assessments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'assessments');
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO used FROM public.skill_test_assignments WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % assessment(s). Upgrade your subscription to send more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_plan_assessments_trigger ON public.skill_test_assignments;
CREATE TRIGGER enforce_plan_assessments_trigger
BEFORE INSERT ON public.skill_test_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_assessments();

CREATE OR REPLACE FUNCTION public.enforce_plan_ai_interviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'ai_interviews');
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO used FROM public.interview_sessions WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % AI interview(s). Upgrade your subscription to run more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_plan_ai_interviews_trigger ON public.interview_sessions;
CREATE TRIGGER enforce_plan_ai_interviews_trigger
BEFORE INSERT ON public.interview_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_ai_interviews();

UPDATE public.plan_tiers SET max_assessments = CASE key
  WHEN 'basic' THEN 25 WHEN 'pro' THEN 150 WHEN 'promax' THEN 500 ELSE max_assessments END
WHERE max_assessments IS NULL AND key IN ('basic','pro','promax');

UPDATE public.plan_tiers SET max_assessments = 20 WHERE price_amount = 0 AND max_assessments IS NULL;