import { useCallback, useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CalendarCheck, CheckCircle2, Clock, Lock, ShieldCheck, ThumbsDown, Users, XCircle,
} from "lucide-react";

interface DossierPayload {
  error?: string;
  dossier?: {
    expires_at: string;
    manager_decision: string | null;
    manager_feedback: string | null;
    manager_name: string | null;
    recipient_name: string | null;
    view_count: number;
  };
  candidate?: {
    name: string | null; email: string | null; phone: string | null;
    overall_score: number | null; skills_score: number | null;
    experience_score: number | null; education_score: number | null;
    strengths: string[] | null; gaps: string[] | null; summary: string | null;
    matched_skills: string[] | null; missing_skills: string[] | null;
    years_experience: number | null; stage: string | null;
  };
  job?: { title: string | null; company_name: string | null; required_skills: string[] | null };
  interviews?: {
    summary: string | null; recommendation: string | null; sentiment: string | null;
    status: string | null; ended_at: string | null;
    scores: Record<string, number> | null;
    proctoring: Record<string, unknown> | null;
  }[];
  assessments?: {
    title: string; category: string; score: number | null; max_score: number | null;
    percentage: number | null; status: string; plagiarism_score: number | null;
  }[];
}

const DECISIONS = [
  { key: "advance", label: "Advance to next round", icon: CheckCircle2, tone: "default" as const },
  { key: "onsite", label: "Request in-person interview", icon: CalendarCheck, tone: "outline" as const },
  { key: "hold", label: "Keep on hold", icon: Clock, tone: "outline" as const },
  { key: "reject", label: "Not a fit", icon: ThumbsDown, tone: "outline" as const },
];

export default function Dossier() {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState("");
  const [needsPin, setNeedsPin] = useState(false);
  const [data, setData] = useState<DossierPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState("");
  const [feedback, setFeedback] = useState("");
  const [managerName, setManagerName] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async (withPin?: string) => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_dossier_by_token", {
      _token: token ?? "",
      _pin: withPin ?? "",
    });
    setLoading(false);
    if (error) { toast.error("This link could not be opened."); return; }
    const payload = res as unknown as DossierPayload;
    if (payload?.error === "pin_required") { setNeedsPin(true); return; }
    setNeedsPin(false);
    setData(payload);
    if (payload?.dossier?.manager_decision) setDecision(payload.dossier.manager_decision);
    if (payload?.dossier?.manager_feedback) setFeedback(payload.dossier.manager_feedback);
    if (payload?.dossier?.manager_name) setManagerName(payload.dossier.manager_name);
  }, [token]);

  useEffect(() => {
    document.title = "Candidate dossier — Talenval";
    void load();
  }, [load]);

  const submit = async () => {
    if (!decision) { toast.error("Pick a decision first."); return; }
    setSending(true);
    const { data: res, error } = await supabase.rpc("submit_dossier_decision", {
      _token: token ?? "",
      _pin: pin || "",
      _decision: decision,
      _feedback: feedback,
      _manager_name: managerName,
    });
    setSending(false);
    const payload = res as unknown as { ok?: boolean; error?: string };
    if (error || payload?.error) { toast.error("Your decision could not be saved."); return; }
    toast.success("Decision sent to the recruiter.");
    void load(pin || undefined);
  };

  if (loading && !data && !needsPin) {
    return <Shell><p className="text-muted-foreground">Opening dossier…</p></Shell>;
  }

  if (needsPin) {
    return (
      <Shell>
        <Card className="max-w-sm mx-auto">
          <CardHeader className="text-center space-y-2">
            <Lock className="h-8 w-8 mx-auto text-primary" />
            <h1 className="text-lg font-semibold">This dossier is PIN protected</h1>
            <p className="text-sm text-muted-foreground">Enter the PIN the recruiter shared with you.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(pin)}
              placeholder="PIN"
              aria-label="Dossier PIN"
            />
            <Button className="w-full" onClick={() => load(pin)} disabled={!pin.trim()}>Open dossier</Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!data || data.error) {
    const msg =
      data?.error === "expired" ? "This dossier link has expired."
      : data?.error === "revoked" ? "This dossier link was withdrawn by the recruiter."
      : "This dossier link is not valid.";
    return (
      <Shell>
        <Card className="max-w-sm mx-auto text-center py-10">
          <CardContent className="space-y-2">
            <XCircle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">{msg}</p>
            <p className="text-sm text-muted-foreground">Ask the recruiter for a fresh link.</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const c = data.candidate!;
  const interview = (data.interviews ?? []).find((i) => i.summary || i.scores);
  const assessments = data.assessments ?? [];

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hiring manager dossier</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.name ?? "Candidate"}</h1>
              <p className="text-muted-foreground">
                {data.job?.title}{data.job?.company_name ? ` · ${data.job.company_name}` : ""}
              </p>
            </div>
            {c.overall_score != null && (
              <div className="text-right">
                <p className="text-4xl font-semibold text-primary">{c.overall_score}</p>
                <p className="text-xs text-muted-foreground">Overall fit score</p>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ScoreBar label="Skills" value={c.skills_score} />
            <ScoreBar label="Experience" value={c.experience_score} />
            <ScoreBar label="Education" value={c.education_score} />
          </div>
        </div>

        {c.summary && (
          <Section title="Evaluation summary"><p className="text-sm leading-relaxed">{c.summary}</p></Section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Strengths">
            <ul className="space-y-1.5 text-sm">
              {(c.strengths ?? []).map((s, i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />{s}</li>
              ))}
              {(c.strengths ?? []).length === 0 && <li className="text-muted-foreground">Not recorded</li>}
            </ul>
          </Section>
          <Section title="Gaps to probe">
            <ul className="space-y-1.5 text-sm">
              {(c.gaps ?? []).map((s, i) => (
                <li key={i} className="flex gap-2"><XCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />{s}</li>
              ))}
              {(c.gaps ?? []).length === 0 && <li className="text-muted-foreground">None flagged</li>}
            </ul>
          </Section>
        </div>

        {(c.matched_skills?.length || c.missing_skills?.length) && (
          <Section title="Skill match">
            <div className="flex flex-wrap gap-1.5">
              {(c.matched_skills ?? []).map((s) => (
                <Badge key={`m-${s}`} className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40" variant="outline">{s}</Badge>
              ))}
              {(c.missing_skills ?? []).map((s) => (
                <Badge key={`x-${s}`} variant="outline" className="text-muted-foreground line-through">{s}</Badge>
              ))}
            </div>
          </Section>
        )}

        {interview && (
          <Section title="AI video interview">
            {interview.summary && <p className="text-sm leading-relaxed">{interview.summary}</p>}
            {interview.recommendation && (
              <p className="mt-2 text-sm"><strong>Recommendation:</strong> {interview.recommendation}</p>
            )}
            {interview.scores && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(interview.scores).map(([k, v]) => (
                  <ScoreBar key={k} label={k.replace(/_/g, " ")} value={Number(v)} />
                ))}
              </div>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Webcam proctored · composure and movement monitored throughout
            </p>
          </Section>
        )}

        {assessments.length > 0 && (
          <Section title="Proctored skills assessments">
            <div className="space-y-2">
              {assessments.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.category} · {a.status}</p>
                  </div>
                  <span className="font-semibold">
                    {a.percentage != null ? `${Math.round(Number(a.percentage))}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Your decision">
          {data.dossier?.manager_decision && (
            <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">
              Recorded decision: <strong>{DECISIONS.find((d) => d.key === data.dossier!.manager_decision)?.label}</strong>
              {data.dossier.manager_name ? ` — ${data.dossier.manager_name}` : ""}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <Button
                key={d.key}
                variant={decision === d.key ? "default" : "outline"}
                className="justify-start gap-2"
                onClick={() => setDecision(d.key)}
              >
                <d.icon className="h-4 w-4" /> {d.label}
              </Button>
            ))}
          </div>
          <Input
            className="mt-3"
            placeholder="Your name"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            aria-label="Your name"
          />
          <Textarea
            className="mt-2"
            rows={3}
            placeholder="Feedback for the recruiter (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            aria-label="Feedback"
          />
          <Button className="mt-3 w-full" onClick={submit} disabled={sending || !decision}>
            {sending ? "Sending…" : "Send decision to recruiter"}
          </Button>
        </Section>

        <p className="flex items-center justify-center gap-1.5 pb-10 text-center text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Shared securely via Talenval · link expires{" "}
          {data.dossier ? new Date(data.dossier.expires_at).toLocaleDateString() : ""}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Logo size={26} wordmarkClassName="text-foreground" />
          <span className="text-xs text-muted-foreground">Confidential candidate dossier</span>
        </div>
      </header>
      <main className="container mx-auto py-8">{children}</main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-medium">{value ?? "—"}</span>
      </div>
      <Progress value={Number(value ?? 0)} className="mt-1 h-1.5" />
    </div>
  );
}
