CREATE OR REPLACE FUNCTION public.get_public_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE j public.jobs; p public.careers_pages; pr public.profiles;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND status = 'open';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  SELECT * INTO p FROM public.careers_pages WHERE user_id = j.user_id;
  SELECT * INTO pr FROM public.profiles WHERE id = j.user_id;
  RETURN jsonb_build_object(
    'job', jsonb_build_object('id', j.id, 'title', j.title, 'description', j.description,
      'requirements', j.requirements, 'required_skills', j.required_skills,
      'min_years_experience', j.min_years_experience, 'created_at', j.created_at),
    'company', jsonb_build_object(
      'name', coalesce(nullif(j.company_name,''), p.company_name, pr.company_name, 'Hiring team'),
      'brand_color', coalesce(p.brand_color, '#0ea5e9'),
      'location', p.location, 'website', p.website, 'tagline', p.tagline));
END; $fn$;

CREATE OR REPLACE FUNCTION public.submit_job_link_application(_job_id uuid, _full_name text, _email text, _phone text, _resume_text text, _cover_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE j public.jobs; new_candidate uuid; app_id uuid; em text := lower(trim(coalesce(_email,'')));
BEGIN
  IF coalesce(trim(_full_name),'') = '' OR em = '' THEN RETURN jsonb_build_object('error','missing_fields'); END IF;
  IF length(em) > 255 OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN jsonb_build_object('error','invalid_email'); END IF;
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND status = 'open';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','job_closed'); END IF;
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE job_id = _job_id AND lower(email) = em) THEN
    RETURN jsonb_build_object('error','duplicate'); END IF;
  IF (SELECT count(*) FROM public.job_applications WHERE lower(email) = em AND created_at > now() - interval '1 hour') >= 5
     OR (SELECT count(*) FROM public.job_applications WHERE job_id = _job_id AND created_at > now() - interval '1 hour') >= 200 THEN
    RETURN jsonb_build_object('error','rate_limited'); END IF;
  INSERT INTO public.candidates (job_id, user_id, name, email, phone, resume_text, status, processing_status, stage)
  VALUES (_job_id, j.user_id, left(trim(_full_name),160), em, left(coalesce(_phone,''),40),
          left(coalesce(_resume_text,''), 60000), 'new', 'pending', 'sourced')
  RETURNING id INTO new_candidate;
  INSERT INTO public.job_applications (user_id, job_id, candidate_id, full_name, email, phone, resume_text, cover_note, source)
  VALUES (j.user_id, _job_id, new_candidate, left(trim(_full_name),160), em, left(coalesce(_phone,''),40),
          left(coalesce(_resume_text,''), 60000), left(coalesce(_cover_note,''), 4000), 'job_link')
  RETURNING id INTO app_id;
  RETURN jsonb_build_object('ok', true, 'application_id', app_id, 'candidate_id', new_candidate);
END; $fn$;

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_user_id uuid, _plan text, _period_end timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _plan <> 'free' AND NOT EXISTS (SELECT 1 FROM public.plan_tiers WHERE key = _plan) THEN
    RETURN jsonb_build_object('error','unknown_plan'); END IF;
  INSERT INTO public.user_plans (user_id, plan, current_period_end)
  VALUES (_user_id, _plan, _period_end)
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, current_period_end = EXCLUDED.current_period_end, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $fn$;

REVOKE ALL ON FUNCTION public.get_public_job(uuid), public.submit_job_link_application(uuid,text,text,text,text,text), public.admin_set_user_plan(uuid,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_job(uuid), public.submit_job_link_application(uuid,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid,text,timestamptz) TO authenticated;