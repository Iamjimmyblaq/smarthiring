# SmartHire Upgrade — Phased Plan

The original brief is a multi-quarter roadmap. We ship in phases so each phase is usable on its own. Phase 1 starts immediately after you approve.

## Phase 1 — AI Voice Interview System (this iteration)

The marquee differentiator. Recruiters generate an interview link per candidate; the candidate joins, talks to a human-like AI interviewer, and the recruiter gets a transcript + AI scoring + summary.

**What gets built**
- `interview_sessions` table: token, job_id, candidate_id, status, started/ended_at, transcript JSON, scores, summary, recommendation.
- Public `/interview/:token` page — no login required for the candidate, mic permission, live status, ElevenLabs Conversational AI agent (WebRTC).
- Edge function `elevenlabs-token` — issues a short-lived conversation token using your ElevenLabs API key (server-side only).
- Edge function `interview-finalize` — receives transcript on session end, calls Lovable AI (Gemini) to produce: communication score, confidence score, sentiment, strengths, gaps, hiring recommendation. Persists to `interview_sessions` and updates the candidate.
- Recruiter UI:
  - On a candidate row in Pipeline / JobDetail: **"Start AI interview"** → creates session, copies shareable link, opens email draft to candidate.
  - On Interviews page: **AI Sessions** tab listing sessions with status (pending / live / completed), with a **View report** modal showing transcript, per-skill scores, AI summary, recommendation.
- Dynamic agent prompt: built per-session from the job description + required skills + candidate name, sent as ElevenLabs `overrides.agent.prompt`.

**What you must provide**
- An **ElevenLabs API key** (I'll request it via the secrets tool).
- An **ElevenLabs Agent ID** — created in the ElevenLabs dashboard with "Overrides → System prompt" + "First message" enabled so we can customize per interview. I'll give you exact step-by-step setup instructions in chat after you approve.

## Phase 2 — Candidate accounts + public profiles

- Add `app_role` enum + `user_roles` table with `recruiter` / `candidate` / `admin` (proper security-definer RBAC, no role-on-profile).
- Auth page splits to "I'm hiring" vs "I'm a job seeker"; route guards by role.
- Candidate dashboard: applications, interview invites, AI Career Copilot (resume optimizer + interview prep, both via Lovable AI).
- Public talent profile at `/talent/:handle` with verified-skills badges (great for SEO).
- Public apply page `/jobs/:id/apply` so candidates can apply without a recruiter inviting them.

## Phase 3 — Google & Microsoft integrations

- Connect Google (Gmail / Calendar / Meet) and Microsoft (Outlook / Teams) connectors.
- Send interview invites and offer letters as real emails (not just `mailto:`) from the recruiter's connected mailbox.
- Auto-create calendar events with Meet/Teams links when scheduling a human interview.

## Phase 4 — SEO & marketing engine

- React Helmet–style meta/OG/JSON-LD per route, sitemap.xml, robots.txt updates.
- Programmatic landing pages: `/hiring/:city`, `/salary/:role`, `/guides/:slug`, all server-rendered as static HTML at build time using Vite SSG (vite-plugin-ssr equivalent kept inside Vite).
- Blog driven by markdown in repo.

## Phase 5 — Stretch (separate conversations, each non-trivial)

RBAC admin panel · workforce analytics dashboards · WhatsApp recruiter (needs Meta Business approval — you'd own that) · marketplace · billing tiers beyond current Pro · audit logs · MFA · bias/explainability reports.

Items I will **not** build because they're out of scope for this stack: Next.js SSR migration, blockchain credential verification node, on-prem malware scanning, real prompt-injection firewall infra. We can approximate several of these with existing primitives if/when needed.

## Technical details (Phase 1)

**Schema**
```text
interview_sessions(
  id, user_id (recruiter), job_id, candidate_id,
  token TEXT UNIQUE, status TEXT ('pending'|'live'|'completed'|'expired'),
  agent_id TEXT, conversation_id TEXT,
  started_at, ended_at,
  transcript JSONB,         -- [{role, text, ts}]
  scores JSONB,             -- {communication, confidence, technical, overall}
  sentiment TEXT, summary TEXT, recommendation TEXT,
  expires_at TIMESTAMPTZ
)
```
RLS: recruiter (`auth.uid() = user_id`) full CRUD. Public SELECT allowed only by `token` via security-definer RPC `get_interview_session_by_token(token)` so candidates never need an account.

**Edge functions** (`verify_jwt = false` for the public-token paths, validated in code by token lookup):
- `elevenlabs-token` — POST `{ token }` → `{ conversationToken, agentOverrides }`.
- `interview-finalize` — POST `{ token, transcript }` → runs Lovable AI scoring, updates row.

**Frontend**
- New page `src/pages/InterviewRoom.tsx` (public route).
- New tab in `src/pages/Interviews.tsx`: "AI Sessions".
- Reuse `useConversation` from `@elevenlabs/react`.

**Secrets needed**
- `ELEVENLABS_API_KEY` (requested via secrets tool after approval).
- `ELEVENLABS_AGENT_ID` (also stored as a secret for now).
