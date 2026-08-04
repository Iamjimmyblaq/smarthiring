-- 1. Candidate name override history
CREATE TABLE public.candidate_name_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  old_name text,
  new_name text NOT NULL,
  reason text,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.candidate_name_edits TO authenticated;
GRANT ALL ON public.candidate_name_edits TO service_role;
ALTER TABLE public.candidate_name_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "name edits readable by owner or admin" ON public.candidate_name_edits FOR SELECT TO authenticated
USING (private.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid()));
CREATE POLICY "name edits insertable by owner or admin" ON public.candidate_name_edits FOR INSERT TO authenticated
WITH CHECK (edited_by = auth.uid() AND (private.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid())));

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS name_overridden_at timestamptz;

-- admins may update candidates (name override)
CREATE POLICY "admins update all candidates" ON public.candidates FOR UPDATE TO authenticated
USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

-- 2. Role permissions matrix
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO anon;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role permissions readable" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "admins manage role permissions" ON public.role_permissions FOR ALL TO authenticated
USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_permissions (role, permission, allowed)
SELECT r.role, p.permission,
  CASE
    WHEN r.role = 'super_admin' THEN true
    WHEN r.role = 'admin' THEN p.permission <> 'manage_platform_settings'
    WHEN r.role = 'recruiter' THEN p.permission IN ('view_jobs','create_jobs','upload_resumes','view_candidates','move_candidate_stage','schedule_interviews','run_ai_interviews','view_offers','create_offers','export_data','use_api')
    ELSE p.permission IN ('view_jobs','view_candidates','view_offers')
  END
FROM (VALUES ('super_admin'::app_role),('admin'),('recruiter'),('member')) AS r(role)
CROSS JOIN (VALUES
  ('view_jobs'),('create_jobs'),('delete_jobs'),('upload_resumes'),('view_candidates'),
  ('edit_candidate_name'),('move_candidate_stage'),('delete_candidates'),('schedule_interviews'),
  ('run_ai_interviews'),('view_offers'),('create_offers'),('manage_onboarding'),('export_data'),
  ('use_api'),('manage_billing'),('manage_team'),('manage_coupons'),('manage_users'),('manage_platform_settings')
) AS p(permission)
ON CONFLICT DO NOTHING;

-- 3. IP tracking + blocking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_ip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip text;

CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage blocked ips" ON public.blocked_ips FOR ALL TO authenticated
USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated
USING (private.is_admin(auth.uid()));
CREATE POLICY "admins update all profiles" ON public.profiles FOR UPDATE TO authenticated
USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

-- admins visibility for the user drilldown
CREATE POLICY "admins read all interviews" ON public.interviews FOR SELECT TO authenticated
USING (private.is_admin(auth.uid()));
CREATE POLICY "admins read all offers" ON public.offers FOR SELECT TO authenticated
USING (private.is_admin(auth.uid()));
CREATE POLICY "admins read all teams" ON public.teams FOR SELECT TO authenticated
USING (private.is_admin(auth.uid()));
CREATE POLICY "admins read all user roles" ON public.user_roles FOR SELECT TO authenticated
USING (private.is_admin(auth.uid()));

-- 4. Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  applies_to_tiers text[] NOT NULL DEFAULT '{}',
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  show_on_home boolean NOT NULL DEFAULT false,
  headline text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT ON public.coupons TO anon;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read live coupons" ON public.coupons FOR SELECT
USING (is_active AND (valid_until IS NULL OR valid_until > now()));
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tier_key text,
  amount_discounted numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.is_admin(auth.uid()));

-- 5. Single-use interview links
CREATE OR REPLACE FUNCTION public.get_interview_session_by_token(_token text)
 RETURNS TABLE(id uuid, status text, candidate_name text, job_title text, job_description text, required_skills text[], company_name text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.status, c.name, j.title, j.description, j.required_skills, j.company_name, s.expires_at
  FROM public.interview_sessions s
  JOIN public.candidates c ON c.id = s.candidate_id
  JOIN public.jobs j ON j.id = s.job_id
  WHERE s.token = _token
    AND s.expires_at > now()
    AND s.status <> 'completed';
$function$;
REVOKE EXECUTE ON FUNCTION public.get_interview_session_by_token(text) FROM PUBLIC, anon, authenticated;