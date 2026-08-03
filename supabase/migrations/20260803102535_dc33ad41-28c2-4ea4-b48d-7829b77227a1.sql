ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE POLICY "admins read all candidates" ON public.candidates
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

CREATE POLICY "admins read all jobs" ON public.jobs
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

CREATE POLICY "admins read all user plans" ON public.user_plans
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

CREATE POLICY "admins read all interview sessions" ON public.interview_sessions
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));