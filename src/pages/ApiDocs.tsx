import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/v1`;

const Code = ({ children }: { children: string }) => (
  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto"><code>{children}</code></pre>
);

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">SmartHire API</h1>
          <p className="text-muted-foreground mt-2">Integrate SmartHire into your careers site, ATS, or backend. Jobs created through the API appear in your SmartHire jobs board automatically.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Every request needs an API key in the <code>X-API-Key</code> header (or <code>Authorization: Bearer</code>). Keys are per-workspace and start with <code>sh_live_</code>.</p>
            <p>Generate keys in <a className="underline" href="/developers">Developers</a>.</p>
            <Code>{`curl -H "X-API-Key: sh_live_..." ${BASE}/jobs`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Jobs — auto-listing on SmartHire</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>When a company posts a job on their careers site and calls <code>POST /jobs</code>, the job is inserted into their SmartHire jobs board automatically. Pass <code>external_id</code> + <code>external_source</code> for safe retries — duplicate calls update the same row instead of creating a copy.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>GET /jobs?limit=50</code> — list</li>
              <li><code>POST /jobs</code> — create or upsert (dedup)</li>
              <li><code>GET /jobs/:id</code> · <code>PATCH /jobs/:id</code> · <code>DELETE /jobs/:id</code></li>
            </ul>
            <p className="font-medium mt-2">Request</p>
            <Code>{`POST ${BASE}/jobs
X-API-Key: sh_live_...
Content-Type: application/json

{
  "external_id": "req-2891",           // your primary key — enables dedup
  "external_source": "acme-careers",   // your system name
  "title": "Senior Engineer",
  "description": "Build product features",
  "requirements": "5+ years React",
  "required_skills": ["React","TypeScript"],
  "min_years_experience": 5,
  "company_name": "Acme",
  "hr_email": "hiring@acme.com",
  "status": "open"
}`}</Code>
            <p className="font-medium">Response 201 Created (or 200 with <code>deduped: true</code>)</p>
            <Code>{`{
  "data": {
    "id": "0f1c...",
    "title": "Senior Engineer",
    "status": "open",
    "external_id": "req-2891",
    "external_source": "acme-careers",
    "created_at": "2026-07-12T09:12:00Z"
  }
}`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Candidates</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><code>POST /candidates</code> submit application · <code>GET /candidates?job_id=…</code> · <code>PATCH /candidates/:id</code> change stage (<code>screening|interview|offer|hired|rejected</code>) — triggers status email + webhook.</p>
            <Code>{`curl -X POST ${BASE}/candidates \\
  -H "X-API-Key: sh_live_..." -H "Content-Type: application/json" \\
  -d '{"job_id":"...","name":"Ada Lovelace","email":"ada@example.com","resume_url":"https://..."}'`}</Code>
            <Code>{`PATCH ${BASE}/candidates/{id}
{ "stage": "interview" }
// → emails candidate, fires webhook candidate.stage_changed`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Interviews (interactive video + AI)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>The AI interview is a live video session: the candidate's camera and microphone are on, they share their screen, and the AI asks questions in audio. Camera video is used to detect the candidate leaving frame (anti-malpractice).</p>
            <p><code>POST /interviews</code> — schedule a human interview; candidate is emailed.</p>
            <Code>{`POST ${BASE}/interviews
{
  "candidate_id": "...",
  "scheduled_at": "2026-07-15T15:00:00Z",
  "duration_minutes": 45,
  "interview_type": "virtual",
  "interviewer": "Jane Doe",
  "meeting_link": "https://meet.acme.com/xyz"
}`}</Code>
            <p><code>POST /interviews/ai-sessions</code> — create a live AI video interview and get a shareable link.</p>
            <Code>{`POST ${BASE}/interviews/ai-sessions
{ "candidate_id": "..." }

// 201 →
{ "data": {
    "id": "sess_...",
    "token": "abc...",
    "expires_at": "2026-07-19T09:00:00Z",
    "interview_url": "https://smarthiring.lovable.app/interview/abc..."
} }`}</Code>
            <p><code>GET /interviews/ai-sessions/:id</code> — status, transcript, per-skill scores.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Subscribe to real-time events. Each delivery is <code>POST</code> JSON with headers:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>X-SmartHire-Event</code> — e.g. <code>candidate.stage_changed</code></li>
              <li><code>X-SmartHire-Event-Id</code> — unique per event (use for idempotency)</li>
              <li><code>X-SmartHire-Signature: sha256=&lt;hex&gt;</code> — HMAC-SHA256 of the raw body with your endpoint secret</li>
            </ul>
            <p>Events: <code>candidate.stage_changed</code>, <code>interview.scheduled</code>, <code>interview.ai_session_created</code>, <code>interview.completed</code>, <code>offer.created</code>.</p>
            <p>Deliveries retry up to 3 times with exponential backoff on 5xx or network errors; 4xx are not retried. Response bodies (first 500 chars) are stored for debugging.</p>
            <Code>{`POST ${BASE}/webhooks
{ "url": "https://your-app.com/hooks/sh",
  "events": ["candidate.stage_changed","interview.completed"] }

// → { data: { id, url, secret: "whsec_..." } }`}</Code>
            <p className="font-medium">Sample delivery</p>
            <Code>{`POST /hooks/sh
X-SmartHire-Event: candidate.stage_changed
X-SmartHire-Event-Id: 8b0c...
X-SmartHire-Signature: sha256=9f2a...

{
  "id": "8b0c...",
  "event": "candidate.stage_changed",
  "created_at": "2026-07-12T09:12:00Z",
  "data": { "candidate_id": "...", "job_id": "...", "stage": "interview" }
}`}</Code>
            <p className="font-medium">Verify signature (Node)</p>
            <Code>{`import crypto from "node:crypto";
const sig = req.headers["x-smarthire-signature"].split("=")[1];
const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.status(401).end();`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Errors</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>All errors return JSON <code>{`{ "error": "message" }`}</code>.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>400</code> — validation error (missing/invalid field)</li>
              <li><code>401</code> — missing or invalid API key</li>
              <li><code>404</code> — resource not found or wrong version prefix</li>
              <li><code>410</code> — interview link expired / session already completed</li>
              <li><code>429</code> — rate limited</li>
              <li><code>500</code> — internal error (retry with backoff)</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}