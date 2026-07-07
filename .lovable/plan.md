# Plan

## 1. Automatic stage-change emails
- Add a Postgres trigger on `candidates` (AFTER UPDATE OF stage) that calls a new edge function `candidate-stage-notify` via `pg_net` when `NEW.stage IS DISTINCT FROM OLD.stage`.
- `candidate-stage-notify` (Deno, no JWT) loads the candidate, job, and recruiter, then sends a Gmail email to the candidate. The **From** header uses the HR's registered email (`jobs.hr_email` → `profiles.hr_email` → `profiles.email`) so replies go to HR. Templates for `screening`, `interview`, `offer`, `hired`, `rejected`.
- Also emit a webhook event `candidate.stage_changed` (see §4).

## 2. Interview scheduling emails (fix)
Currently `sendDecisionEmail` in `Interviews.tsx` just opens a mailto: draft, and the AI link is only copied.
- On interview `INSERT`: DB trigger calls new edge function `interview-scheduled-notify` → emails the candidate with date/time/type/interviewer + optional meeting link, from the HR address. (Traditional interviews)
- On `interview_sessions` `INSERT` (AI interview): DB trigger calls same function → emails the candidate the AI interview link `${SITE_URL}/interview/{token}`.
- Add `SITE_URL` runtime env (default `https://smarthiring.lovable.app`).

## 3. Public REST API (`/functions/v1/api/...`)
New edge function `api` (no JWT — validates its own API key header `X-API-Key: sh_live_...`).

New tables:
- `api_keys` (id, user_id, name, key_prefix, key_hash, last_used_at, revoked_at, created_at) — bcrypt-style SHA-256 hash stored, plaintext shown once.
- `webhook_endpoints` (id, user_id, url, secret, events[], enabled, created_at).
- `webhook_deliveries` (id, endpoint_id, event, payload, status, response_code, attempts, created_at).

Endpoints (scoped to the key's `user_id`):
- `GET/POST/PATCH/DELETE /api/v1/jobs[/{id}]`
- `GET/POST/PATCH /api/v1/candidates[/{id}]` — POST creates a candidate + associates job
- `POST /api/v1/interviews` — schedule human interview
- `POST /api/v1/interviews/ai-sessions` — creates `interview_sessions` row, returns `interview_url`
- `GET /api/v1/interviews/ai-sessions/{id}` — status, scores
- `GET/POST/DELETE /api/v1/webhooks`

Standard JSON errors, pagination `?limit&cursor`, rate limit via `last_used_at`.

## 4. Webhooks
- Events: `candidate.created`, `candidate.stage_changed`, `interview.scheduled`, `interview.completed`, `offer.created`, `offer.status_changed`.
- Emitted by the notify functions and `interview-finalize`. Signed with HMAC-SHA256 in header `X-SmartHire-Signature`.

## 5. UI additions
- **Settings → Developers** page (`/developers`): manage API keys (create, reveal once, revoke) and webhook endpoints. Link from `AppHeader`.
- Public API docs page (`/api-docs`) with curl examples.

## 6. Files
Create:
- `supabase/functions/candidate-stage-notify/index.ts`
- `supabase/functions/interview-scheduled-notify/index.ts`
- `supabase/functions/api/index.ts`
- migrations: `api_keys`, `webhook_endpoints`, `webhook_deliveries`, triggers on `candidates.stage`, `interviews`, `interview_sessions`, enable `pg_net`, vault secret for internal auth
- `src/pages/Developers.tsx`, `src/pages/ApiDocs.tsx`, route entries, header link
- Update `supabase/config.toml` (new functions, `verify_jwt = false`)
- Extend `interview-finalize` to fire webhooks

## Notes / assumptions
- Uses existing Gmail connector for outbound mail (`GOOGLE_MAIL_API_KEY`).
- Webhooks are best-effort with 1 immediate retry; a full retry queue can come later if needed.
- API keys are shown once in plaintext on creation, then only prefix is visible.
