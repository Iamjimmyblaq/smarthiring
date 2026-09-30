# Project rules

- Pages live in `src/pages/`; `src/routes/` files are thin wrappers that set `head()` metadata — keeps the TanStack migration reversible and metadata in one place per URL.
- All payments go through Paystack only (`paystack-initialize` / `-verify` / `-webhook`); Stripe is explicitly out of scope per the project owner.
- Public, token-gated pages (dossier, careers, assessment, interview) read data only through SECURITY DEFINER RPCs, never direct table access — the token is the authorization.
- Credit top-ups are applied server-side by `apply_credit_purchase` (service-role only, idempotent on payment reference) so a retried webhook can never double-credit.
- Every new `public` table needs explicit GRANTs in the same migration; RLS alone leaves PostgREST returning 401.
