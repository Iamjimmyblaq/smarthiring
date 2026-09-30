ALTER TABLE public.candidate_dossiers ADD COLUMN IF NOT EXISTS failed_pin_attempts integer NOT NULL DEFAULT 0;

-- Careers pages: public reads only via get_public_careers (hides owner id + internal settings)
DROP POLICY IF EXISTS "Published careers pages are public" ON public.careers_pages;
REVOKE SELECT ON public.careers_pages FROM anon;

-- has_role is used inside RLS policies; signed-in users need to run it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dossier_by_token(_token text, _pin text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d public.candidate_dossiers; c public.candidates; j public.jobs; s jsonb; a jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 32 OR length(_token) > 128 THEN RETURN jsonb_build_object('error','not_found'); END IF;
  SELECT * INTO d FROM public.candidate_dossiers WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF d.revoked THEN RETURN jsonb_build_object('error','revoked'); END IF;
  IF d.expires_at < now() THEN RETURN jsonb_build_object('error','expired'); END IF;
  IF d.pin IS NOT NULL AND d.pin <> '' THEN
    IF d.failed_pin_attempts >= 10 THEN
      UPDATE public.candidate_dossiers SET revoked = true WHERE id = d.id;
      RETURN jsonb_build_object('error','revoked');
    END IF;
    IF _pin IS NULL OR _pin = '' THEN RETURN jsonb_build_object('error','pin_required'); END IF;
    IF _pin <> d.pin THEN
      UPDATE public.candidate_dossiers SET failed_pin_attempts = failed_pin_attempts + 1 WHERE id = d.id;
      RETURN jsonb_build_object('error','pin_required');
    END IF;
    IF d.failed_pin_attempts > 0 THEN UPDATE public.candidate_dossiers SET failed_pin_attempts = 0 WHERE id = d.id; END IF;
  END IF;

  SELECT * INTO c FROM public.candidates WHERE id = d.candidate_id;
  SELECT * INTO j FROM public.jobs WHERE id = c.job_id;
  UPDATE public.candidate_dossiers SET view_count = view_count + 1, last_viewed_at = now() WHERE id = d.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'summary', x.summary, 'recommendation', x.recommendation, 'scores', x.scores,
      'sentiment', x.sentiment, 'proctoring', x.proctoring, 'status', x.status, 'ended_at', x.ended_at)), '[]'::jsonb)
    INTO s FROM public.interview_sessions x WHERE x.candidate_id = c.id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'title', t.title, 'category', t.category, 'score', sa.score, 'max_score', sa.max_score,
      'percentage', sa.percentage, 'status', sa.status, 'plagiarism_score', sa.plagiarism_score)), '[]'::jsonb)
    INTO a FROM public.skill_test_assignments sa JOIN public.skill_tests t ON t.id = sa.test_id WHERE sa.candidate_id = c.id;

  RETURN jsonb_build_object(
    'dossier', jsonb_build_object('expires_at', d.expires_at, 'manager_decision', d.manager_decision,
      'manager_feedback', d.manager_feedback, 'manager_name', d.manager_name, 'recipient_name', d.recipient_name,
      'view_count', d.view_count),
    'candidate', jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone,
      'overall_score', c.overall_score, 'skills_score', c.skills_score, 'experience_score', c.experience_score,
      'education_score', c.education_score, 'strengths', c.strengths, 'gaps', c.gaps, 'summary', c.summary,
      'matched_skills', c.matched_skills, 'missing_skills', c.missing_skills,
      'years_experience', c.years_experience, 'stage', c.stage),
    'job', jsonb_build_object('title', j.title, 'company_name', j.company_name, 'required_skills', j.required_skills),
    'interviews', s, 'assessments', a);
END; $function$;

CREATE OR REPLACE FUNCTION public.submit_dossier_decision(_token text, _pin text, _decision text, _feedback text, _manager_name text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d public.candidate_dossiers;
BEGIN
  IF _decision NOT IN ('advance','onsite','reject','hold') THEN RETURN jsonb_build_object('error','invalid_decision'); END IF;
  SELECT * INTO d FROM public.candidate_dossiers WHERE token = _token;
  IF NOT FOUND OR d.revoked OR d.expires_at < now() THEN RETURN jsonb_build_object('error','not_available'); END IF;
  IF d.pin IS NOT NULL AND d.pin <> '' THEN
    IF d.failed_pin_attempts >= 10 THEN RETURN jsonb_build_object('error','not_available'); END IF;
    IF _pin IS NULL OR _pin <> d.pin THEN
      UPDATE public.candidate_dossiers SET failed_pin_attempts = failed_pin_attempts + 1 WHERE id = d.id;
      RETURN jsonb_build_object('error','pin_required');
    END IF;
  END IF;
  UPDATE public.candidate_dossiers
     SET manager_decision = _decision,
         manager_feedback = left(coalesce(_feedback,''), 4000),
         manager_name = left(coalesce(_manager_name,''), 120),
         decided_at = now()
   WHERE id = d.id;
  RETURN jsonb_build_object('ok', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.submit_job_application(_slug text, _job_id uuid, _full_name text, _email text, _phone text, _resume_text text, _cover_note text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.careers_pages; j public.jobs; new_candidate uuid; app_id uuid; em text := lower(trim(coalesce(_email,'')));
BEGIN
  IF coalesce(trim(_full_name),'') = '' OR em = '' THEN RETURN jsonb_build_object('error','missing_fields'); END IF;
  IF length(em) > 255 OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN jsonb_build_object('error','invalid_email'); END IF;
  SELECT * INTO p FROM public.careers_pages WHERE slug = lower(_slug) AND is_published;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND user_id = p.user_id AND status = 'open';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','job_closed'); END IF;
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE job_id = _job_id AND lower(email) = em) THEN
    RETURN jsonb_build_object('error','duplicate');
  END IF;
  -- Spam guard: cap applications per email and per job
  IF (SELECT count(*) FROM public.job_applications WHERE lower(email) = em AND created_at > now() - interval '1 hour') >= 5
     OR (SELECT count(*) FROM public.job_applications WHERE job_id = _job_id AND created_at > now() - interval '1 hour') >= 200 THEN
    RETURN jsonb_build_object('error','rate_limited');
  END IF;

  INSERT INTO public.candidates (job_id, user_id, name, email, phone, resume_text, status, processing_status, stage)
  VALUES (_job_id, p.user_id, left(trim(_full_name),160), em, left(coalesce(_phone,''),40),
          left(coalesce(_resume_text,''), 60000), 'new', 'pending', 'sourced')
  RETURNING id INTO new_candidate;
  INSERT INTO public.job_applications (user_id, job_id, candidate_id, full_name, email, phone, resume_text, cover_note)
  VALUES (p.user_id, _job_id, new_candidate, left(trim(_full_name),160), em,
          left(coalesce(_phone,''),40), left(coalesce(_resume_text,''), 60000), left(coalesce(_cover_note,''), 4000))
  RETURNING id INTO app_id;
  RETURN jsonb_build_object('ok', true, 'application_id', app_id, 'candidate_id', new_candidate);
END; $function$;

REVOKE ALL ON FUNCTION public.get_dossier_by_token(text,text), public.submit_dossier_decision(text,text,text,text,text), public.submit_job_application(text,uuid,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dossier_by_token(text,text), public.submit_dossier_decision(text,text,text,text,text), public.submit_job_application(text,uuid,text,text,text,text,text), public.get_public_careers(text) TO anon, authenticated;