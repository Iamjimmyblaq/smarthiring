CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "admins manage tiers" ON public.plan_tiers;
DROP POLICY IF EXISTS "anyone reads active tiers" ON public.plan_tiers;
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins manage team members" ON public.team_members;
DROP POLICY IF EXISTS "admins manage teams" ON public.teams;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;

CREATE POLICY "admins manage tiers" ON public.plan_tiers FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "anyone reads active tiers" ON public.plan_tiers FOR SELECT
  USING (is_active OR private.is_admin(auth.uid()));
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));
CREATE POLICY "admins manage team members" ON public.team_members FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) OR (user_id = auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) OR (owner_id = auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) OR (owner_id = auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin(uuid);