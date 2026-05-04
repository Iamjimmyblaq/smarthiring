-- 1. Add stage column to candidates (5-stage pipeline)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'sourced';

-- Constrain via trigger (avoid CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_candidate_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stage NOT IN ('sourced','screening','interview','offer','hired','rejected') THEN
    RAISE EXCEPTION 'Invalid stage: %', NEW.stage;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_candidate_stage ON public.candidates;
CREATE TRIGGER trg_validate_candidate_stage
BEFORE INSERT OR UPDATE OF stage ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.validate_candidate_stage();

CREATE INDEX IF NOT EXISTS idx_candidates_stage ON public.candidates(stage);

-- 2. Interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  interview_type text NOT NULL DEFAULT 'video',
  interviewer text,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  feedback text,
  rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY interviews_select_own ON public.interviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY interviews_insert_own ON public.interviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY interviews_update_own ON public.interviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY interviews_delete_own ON public.interviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_interviews_candidate ON public.interviews(candidate_id);
CREATE INDEX idx_interviews_user ON public.interviews(user_id);

-- 3. Offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  salary_amount numeric,
  salary_currency text NOT NULL DEFAULT 'USD',
  start_date date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_select_own ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY offers_insert_own ON public.offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY offers_update_own ON public.offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY offers_delete_own ON public.offers FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offers_candidate ON public.offers(candidate_id);
CREATE INDEX idx_offers_user ON public.offers(user_id);

-- 4. Onboarding tasks table
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY onb_select_own ON public.onboarding_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY onb_insert_own ON public.onboarding_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY onb_update_own ON public.onboarding_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY onb_delete_own ON public.onboarding_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_onb_updated_at
BEFORE UPDATE ON public.onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onb_candidate ON public.onboarding_tasks(candidate_id);
CREATE INDEX idx_onb_user ON public.onboarding_tasks(user_id);

-- Lock down the validation function
REVOKE EXECUTE ON FUNCTION public.validate_candidate_stage() FROM public, anon, authenticated;