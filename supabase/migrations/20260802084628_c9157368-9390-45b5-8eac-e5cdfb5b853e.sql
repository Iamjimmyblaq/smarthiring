-- roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','admin','recruiter','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- bootstrap super admin for verified help.smarthire@gmail.com
CREATE OR REPLACE FUNCTION public.grant_super_admin_for_known_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'help.smarthire@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_super_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_for_known_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_super_admin
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_super_admin_for_known_email();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE lower(email) = 'help.smarthire@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- teams
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR owner_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "admins manage team members" ON public.team_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- subscription tiers
CREATE TABLE IF NOT EXISTS public.plan_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'month',
  max_jobs integer,
  max_resumes integer,
  max_ai_interviews integer,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tiers TO authenticated;
GRANT ALL ON public.plan_tiers TO service_role;
ALTER TABLE public.plan_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active tiers" ON public.plan_tiers FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage tiers" ON public.plan_tiers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER plan_tiers_updated_at BEFORE UPDATE ON public.plan_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plan_tiers (key, name, description, price_amount, max_jobs, max_resumes, max_ai_interviews, features, sort_order) VALUES
  ('basic','Basic','For small teams getting started', 0, 1, 100, 5, ARRAY['1 active job','100 resume uploads','5 AI interviews','Email support'], 1),
  ('pro','Pro','Growing recruitment teams', 29, 10, 2000, 100, ARRAY['10 active jobs','2,000 resume uploads','100 AI interviews','Webhooks & API'], 2),
  ('promax','Pro Max','High-volume hiring', 99, 50, 10000, 500, ARRAY['50 active jobs','10,000 resume uploads','500 AI interviews','Priority support'], 3),
  ('enterprise','Enterprise','Unlimited, custom SLAs', 499, NULL, NULL, NULL, ARRAY['Unlimited jobs','Unlimited resumes','Unlimited AI interviews','SSO & dedicated support'], 4)
ON CONFLICT (key) DO NOTHING;