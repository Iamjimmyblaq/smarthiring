CREATE TABLE public.skill_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  skill_area text NOT NULL,
  description text,
  difficulty text NOT NULL DEFAULT 'intermediate',
  duration_minutes integer NOT NULL DEFAULT 20,
  question_count integer NOT NULL DEFAULT 10,
  proctored boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skill_tests TO authenticated;
GRANT ALL ON public.skill_tests TO service_role;
ALTER TABLE public.skill_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can browse tests" ON public.skill_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tests" ON public.skill_tests FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER skill_tests_updated_at BEFORE UPDATE ON public.skill_tests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX skill_tests_category_idx ON public.skill_tests (category, skill_area);

CREATE TABLE public.skill_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.skill_tests(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_option integer,
  explanation text,
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.skill_test_questions TO service_role;
ALTER TABLE public.skill_test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read question bank" ON public.skill_test_questions FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));
CREATE INDEX skill_test_questions_test_idx ON public.skill_test_questions (test_id, position);

CREATE TABLE public.skill_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  test_id uuid NOT NULL REFERENCES public.skill_tests(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  score integer,
  max_score integer,
  percentage numeric,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  proctoring jsonb,
  integrity_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  plagiarism_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_test_assignments TO authenticated;
GRANT ALL ON public.skill_test_assignments TO service_role;
ALTER TABLE public.skill_test_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their assignments" ON public.skill_test_assignments FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER skill_test_assignments_updated_at BEFORE UPDATE ON public.skill_test_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX skill_test_assignments_candidate_idx ON public.skill_test_assignments (candidate_id);