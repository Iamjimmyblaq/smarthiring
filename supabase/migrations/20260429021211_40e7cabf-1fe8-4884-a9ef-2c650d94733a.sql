-- Jobs: structured requirements
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_years_experience integer NOT NULL DEFAULT 0;

-- Candidates: explainability + quality
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS matched_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience numeric,
  ADD COLUMN IF NOT EXISTS resume_quality_score integer,
  ADD COLUMN IF NOT EXISTS resume_quality_issues text[] NOT NULL DEFAULT '{}';

-- User plans
CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_plans_select_own ON public.user_plans;
CREATE POLICY user_plans_select_own ON public.user_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_plans_insert_own ON public.user_plans;
CREATE POLICY user_plans_insert_own ON public.user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_plans_updated_at ON public.user_plans;
CREATE TRIGGER trg_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();