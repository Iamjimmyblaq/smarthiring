-- 1. Blind screening preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blind_mode boolean NOT NULL DEFAULT false;

-- 2. Candidate dossiers ------------------------------------------------
CREATE TABLE public.candidate_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  pin text,
  recipient_email text,
  recipient_name text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  revoked boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamp with time zone,
  manager_decision text,
  manager_feedback text,
  manager_name text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_dossiers TO authenticated;
GRANT ALL ON public.candidate_dossiers TO service_role;
ALTER TABLE public.candidate_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their dossiers" ON public.candidate_dossiers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_candidate_dossiers_updated BEFORE UPDATE ON public.candidate_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_candidate_dossiers_candidate ON public.candidate_dossiers(candidate_id);

CREATE OR REPLACE FUNCTION public.get_dossier_by_token(_token text, _pin text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE d public.candidate_dossiers; c public.candidates; j public.jobs; s jsonb; a jsonb;
BEGIN
  SELECT * INTO d FROM public.candidate_dossiers WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF d.revoked THEN RETURN jsonb_build_object('error','revoked'); END IF;
  IF d.expires_at < now() THEN RETURN jsonb_build_object('error','expired'); END IF;
  IF d.pin IS NOT NULL AND d.pin <> '' AND (_pin IS NULL OR _pin <> d.pin) THEN
    RETURN jsonb_build_object('error','pin_required');
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
    INTO a FROM public.skill_test_assignments sa
    JOIN public.skill_tests t ON t.id = sa.test_id WHERE sa.candidate_id = c.id;

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
END; $fn$;
GRANT EXECUTE ON FUNCTION public.get_dossier_by_token(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_dossier_decision(
  _token text, _pin text, _decision text, _feedback text, _manager_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE d public.candidate_dossiers;
BEGIN
  IF _decision NOT IN ('advance','onsite','reject','hold') THEN
    RETURN jsonb_build_object('error','invalid_decision');
  END IF;
  SELECT * INTO d FROM public.candidate_dossiers WHERE token = _token;
  IF NOT FOUND OR d.revoked OR d.expires_at < now() THEN RETURN jsonb_build_object('error','not_available'); END IF;
  IF d.pin IS NOT NULL AND d.pin <> '' AND (_pin IS NULL OR _pin <> d.pin) THEN
    RETURN jsonb_build_object('error','pin_required');
  END IF;
  UPDATE public.candidate_dossiers
     SET manager_decision = _decision,
         manager_feedback = left(coalesce(_feedback,''), 4000),
         manager_name = left(coalesce(_manager_name,''), 120),
         decided_at = now()
   WHERE id = d.id;
  RETURN jsonb_build_object('ok', true);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.submit_dossier_decision(text, text, text, text, text) TO anon, authenticated;

-- 3. Public careers pages ---------------------------------------------
CREATE TABLE public.careers_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  company_name text NOT NULL,
  tagline text,
  about text,
  brand_color text NOT NULL DEFAULT '#0ea5e9',
  location text,
  website text,
  is_published boolean NOT NULL DEFAULT true,
  auto_invite_test_id uuid REFERENCES public.skill_tests(id) ON DELETE SET NULL,
  auto_invite_ai_interview boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.careers_pages TO authenticated;
GRANT SELECT ON public.careers_pages TO anon;
GRANT ALL ON public.careers_pages TO service_role;
ALTER TABLE public.careers_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their careers page" ON public.careers_pages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Published careers pages are public" ON public.careers_pages
  FOR SELECT TO anon USING (is_published);
CREATE TRIGGER trg_careers_pages_updated BEFORE UPDATE ON public.careers_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_public_careers(_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE p public.careers_pages; jl jsonb;
BEGIN
  SELECT * INTO p FROM public.careers_pages WHERE slug = lower(_slug) AND is_published;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', j.id, 'title', j.title, 'description', j.description, 'requirements', j.requirements,
      'required_skills', j.required_skills, 'min_years_experience', j.min_years_experience,
      'created_at', j.created_at) ORDER BY j.created_at DESC), '[]'::jsonb)
    INTO jl FROM public.jobs j WHERE j.user_id = p.user_id AND j.status = 'open';
  RETURN jsonb_build_object(
    'page', jsonb_build_object('slug', p.slug, 'company_name', p.company_name, 'tagline', p.tagline,
      'about', p.about, 'brand_color', p.brand_color, 'location', p.location, 'website', p.website),
    'jobs', jl);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.get_public_careers(text) TO anon, authenticated;

-- 4. Job applications --------------------------------------------------
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_text text,
  cover_note text,
  source text NOT NULL DEFAULT 'careers_page',
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their applications" ON public.job_applications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_job_applications_updated BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);

CREATE OR REPLACE FUNCTION public.submit_job_application(
  _slug text, _job_id uuid, _full_name text, _email text, _phone text, _resume_text text, _cover_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE p public.careers_pages; j public.jobs; new_candidate uuid; app_id uuid;
BEGIN
  IF coalesce(trim(_full_name),'') = '' OR coalesce(trim(_email),'') = '' THEN
    RETURN jsonb_build_object('error','missing_fields');
  END IF;
  SELECT * INTO p FROM public.careers_pages WHERE slug = lower(_slug) AND is_published;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  SELECT * INTO j FROM public.jobs WHERE id = _job_id AND user_id = p.user_id AND status = 'open';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','job_closed'); END IF;

  IF EXISTS (SELECT 1 FROM public.job_applications
             WHERE job_id = _job_id AND lower(email) = lower(trim(_email))) THEN
    RETURN jsonb_build_object('error','duplicate');
  END IF;

  INSERT INTO public.candidates (job_id, user_id, name, email, phone, resume_text, status, processing_status, stage)
  VALUES (_job_id, p.user_id, left(trim(_full_name),160), lower(trim(_email)), left(coalesce(_phone,''),40),
          left(coalesce(_resume_text,''), 60000), 'new', 'pending', 'sourced')
  RETURNING id INTO new_candidate;

  INSERT INTO public.job_applications (user_id, job_id, candidate_id, full_name, email, phone, resume_text, cover_note)
  VALUES (p.user_id, _job_id, new_candidate, left(trim(_full_name),160), lower(trim(_email)),
          left(coalesce(_phone,''),40), left(coalesce(_resume_text,''), 60000), left(coalesce(_cover_note,''), 4000))
  RETURNING id INTO app_id;

  RETURN jsonb_build_object('ok', true, 'application_id', app_id, 'candidate_id', new_candidate);
END; $fn$;
GRANT EXECUTE ON FUNCTION public.submit_job_application(text, uuid, text, text, text, text, text) TO anon, authenticated;

-- 5. Credit top-up packs -----------------------------------------------
CREATE TABLE public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  kind text NOT NULL CHECK (kind IN ('ai_interviews','assessments','resumes')),
  quantity integer NOT NULL CHECK (quantity > 0),
  price_amount numeric NOT NULL CHECK (price_amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.credit_packs TO authenticated;
GRANT ALL ON public.credit_packs TO service_role;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packs" ON public.credit_packs
  FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage packs" ON public.credit_packs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_credit_packs_updated BEFORE UPDATE ON public.credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ai_interviews','assessments','resumes')),
  balance integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own credits" ON public.user_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_user_credits_updated BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_key text NOT NULL,
  kind text NOT NULL,
  quantity integer NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  provider text NOT NULL DEFAULT 'stripe',
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own purchases" ON public.credit_purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_credit_purchases_updated BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.credit_packs (key, name, description, kind, quantity, price_amount, currency, sort_order) VALUES
  ('ai20',  '20 AI Interviews',  'Top up 20 extra proctored AI video interviews.', 'ai_interviews', 20, 49,  'USD', 1),
  ('ai50',  '50 AI Interviews',  'Top up 50 extra proctored AI video interviews.', 'ai_interviews', 50, 99,  'USD', 2),
  ('as50',  '50 Assessments',    'Top up 50 extra proctored skills assessments.',  'assessments',   50, 39,  'USD', 3),
  ('as200', '200 Assessments',   'Top up 200 extra proctored skills assessments.', 'assessments',  200, 129, 'USD', 4),
  ('cv500', '500 Resume Scans',  'Top up 500 extra AI resume scans.',              'resumes',      500, 59,  'USD', 5);

-- 6. Credits count toward plan limits ----------------------------------
CREATE OR REPLACE FUNCTION public.credit_balance(_user_id uuid, _kind text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce((SELECT balance FROM public.user_credits WHERE user_id = _user_id AND kind = _kind), 0);
$fn$;
GRANT EXECUTE ON FUNCTION public.credit_balance(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_plan_ai_interviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'ai_interviews');
  IF lim IS NULL THEN RETURN NEW; END IF;
  lim := lim + public.credit_balance(NEW.user_id, 'ai_interviews');
  SELECT count(*) INTO used FROM public.interview_sessions WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % AI interview(s). Upgrade or buy a top-up pack to run more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $fn$;

CREATE OR REPLACE FUNCTION public.enforce_plan_assessments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE lim integer; used integer;
BEGIN
  lim := public.plan_limit(NEW.user_id, 'assessments');
  IF lim IS NULL THEN RETURN NEW; END IF;
  lim := lim + public.credit_balance(NEW.user_id, 'assessments');
  SELECT count(*) INTO used FROM public.skill_test_assignments WHERE user_id = NEW.user_id;
  IF used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % assessment(s). Upgrade or buy a top-up pack to send more.', lim USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $fn$;