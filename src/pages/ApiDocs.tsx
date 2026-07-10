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
            <p>Every request needs an API key in the <code>X-API-Key</code> header (or <code>Authorization: Bearer</code>).</p>
            <p>Generate keys in <a className="underline" href="/developers">Developers</a>.</p>
            <Code>{`curl -H "X-API-Key: sh_live_..." ${BASE}/jobs`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><code>GET /jobs</code> — list your jobs</p>
            <p><code>POST /jobs</code> — create a job and list it in SmartHire automatically</p>
            <p><code>GET /jobs/:id</code> — retrieve</p>
            <p><code>PATCH /jobs/:id</code> — update</p>
            <p><code>DELETE /jobs/:id</code> — delete</p>
            <Code>{`curl -X POST ${BASE}/jobs \\
  -H "X-API-Key: sh_live_..." -H "Content-Type: application/json" \\
  -d '{"title":"Senior Engineer","description":"Build product features","requirements":"5+ years React","required_skills":["React","TypeScript"],"company_name":"Acme","hr_email":"hiring@acme.com"}'`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Candidates</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><code>POST /candidates</code> — submit an application from your site.</p>
            <Code>{`curl -X POST ${BASE}/candidates \\
  -H "X-API-Key: sh_live_..." -H "Content-Type: application/json" \\
  -d '{"job_id":"...","name":"Ada Lovelace","email":"ada@example.com","resume_url":"https://..."}'`}</Code>
            <p><code>GET /candidates?job_id=…</code> · <code>PATCH /candidates/:id</code> — update stage etc.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Interviews</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><code>POST /interviews</code> — schedule a human interview. The candidate is emailed automatically.</p>
            <Code>{`{"candidate_id":"...","scheduled_at":"2026-07-10T15:00:00Z","duration_minutes":45,"interview_type":"virtual","interviewer":"Jane","meeting_link":"https://meet..."}`}</Code>
            <p><code>POST /interviews/ai-sessions</code> — create an AI interview and get a shareable link.</p>
            <Code>{`curl -X POST ${BASE}/interviews/ai-sessions \\
  -H "X-API-Key: sh_live_..." -H "Content-Type: application/json" \\
  -d '{"candidate_id":"..."}'
# → { data: { id, token, interview_url: "https://smarthiring.lovable.app/interview/…" } }`}</Code>
            <p><code>GET /interviews/ai-sessions/:id</code> — status, transcript, scores.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Subscribe to real-time events. Each request is POST JSON with header <code>X-SmartHire-Signature: sha256=…</code> (HMAC of the raw body using your endpoint secret).</p>
            <p>Events: <code>candidate.created</code>, <code>candidate.stage_changed</code>, <code>interview.scheduled</code>, <code>interview.ai_session_created</code>, <code>interview.completed</code>, <code>offer.created</code>.</p>
            <Code>{`curl -X POST ${BASE}/webhooks \\
  -H "X-API-Key: sh_live_..." -H "Content-Type: application/json" \\
  -d '{"url":"https://your-app.com/hooks/sh","events":["candidate.stage_changed","interview.completed"]}'`}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Errors</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>All errors return JSON <code>{`{ "error": "message" }`}</code> with 4xx/5xx status. 401 = invalid API key, 404 = not found, 400 = validation.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}