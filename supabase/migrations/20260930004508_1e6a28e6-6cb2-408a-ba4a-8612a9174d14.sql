GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_dossiers TO authenticated;
GRANT ALL ON public.candidate_dossiers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.careers_pages TO authenticated;
GRANT SELECT ON public.careers_pages TO anon;
GRANT ALL ON public.careers_pages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

GRANT SELECT ON public.credit_packs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.credit_packs TO authenticated;
GRANT ALL ON public.credit_packs TO service_role;

GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;