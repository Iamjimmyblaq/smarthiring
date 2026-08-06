import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Calendar, Trash2, Mail, Star, Sparkles, Copy, FileText, Loader2, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { generateDecisionEmail, openInMailClient } from "@/lib/recruitment-emails";
import { downloadProctoringPdf, proctoringRows, type ProctoringData } from "@/lib/proctoring-report";

type Interview = Tables<"interviews">;
type AiSession = Tables<"interview_sessions">;
type Candidate = Pick<Tables<"candidates">, "id" | "name" | "job_id" | "email" | "decision_email_kind" | "decision_email_sent_at">;
type JobLite = Pick<Tables<"jobs">, "id" | "title" | "company_name" | "hr_email">;
type ProfileLite = Pick<Tables<"profiles">, "id" | "company_name" | "hr_email" | "full_name">;

export default function Interviews() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Interview[]>([]);
  const [aiSessions, setAiSessions] = useState<AiSession[]>([]);
  const [reportOpen, setReportOpen] = useState<AiSession | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // form
  const [candidateId, setCandidateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState("video");
  const [interviewer, setInterviewer] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Interviews — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const [{ data: ints }, { data: ai }, { data: cands }, { data: jbs }, { data: prof }] = await Promise.all([
      supabase.from("interviews").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("candidates").select("id, name, job_id, email, decision_email_kind, decision_email_sent_at"),
      supabase.from("jobs").select("id, title, company_name, hr_email"),
      u.user
        ? supabase.from("profiles").select("id, company_name, hr_email, full_name").eq("id", u.user.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: ProfileLite | null }),
    ]);
    setItems(ints ?? []);
    setAiSessions(ai ?? []);
    setCandidates(cands ?? []);
    setJobs(jbs ?? []);
    setProfile(prof ?? null);
    setLoading(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const cand = candidates.find((c) => c.id === candidateId);
    if (!u.user || !cand) { setSaving(false); return; }
    const { error } = await supabase.from("interviews").insert({
      user_id: u.user.id,
      candidate_id: cand.id,
      job_id: cand.job_id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      interview_type: type,
      interviewer: interviewer || null,
      location: location || null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    // also bump candidate stage
    await supabase.from("candidates").update({ stage: "interview" }).eq("id", cand.id);
    toast.success("Interview scheduled");
    setOpen(false);
    setCandidateId(""); setScheduledAt(""); setDuration(30); setType("video"); setInterviewer(""); setLocation(""); setNotes("");
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("interviews").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const sendDecisionEmail = async (iv: Interview, kind: "interview" | "rejection") => {
    const cand = candidates.find((c) => c.id === iv.candidate_id);
    const job = jobs.find((j) => j.id === iv.job_id);
    if (!cand) return toast.error("Candidate not found");
    if (!cand.email) return toast.error("Candidate has no email on file");

    const companyName = job?.company_name || profile?.company_name || "";
    const hrEmail = job?.hr_email || profile?.hr_email || "";
    const email = generateDecisionEmail(kind, {
      candidateName: cand.name ?? "",
      candidateEmail: cand.email,
      jobTitle: job?.title ?? "the role",
      companyName,
      hrEmail,
      hrName: profile?.full_name ?? null,
      scheduledAt: iv.scheduled_at,
      durationMinutes: iv.duration_minutes,
      interviewType: iv.interview_type,
      interviewer: iv.interviewer,
      location: iv.location,
      notes: iv.notes,
    });

    openInMailClient(email);

    await supabase
      .from("candidates")
      .update({
        decision_email_kind: kind,
        decision_email_sent_at: new Date().toISOString(),
        stage: kind === "interview" ? "offer" : "rejected",
        status: kind === "interview" ? "shortlisted" : "rejected",
      })
      .eq("id", cand.id);

    toast.success(
      kind === "interview"
        ? "Interview email opened in your mail app"
        : "Rejection email opened in your mail app"
    );
    load();
  };

  const setRating = async (iv: Interview, rating: number) => {
    const { error } = await supabase
      .from("interviews")
      .update({ rating, status: "completed" })
      .eq("id", iv.id);
    if (error) return toast.error(error.message);

    const cand = candidates.find((c) => c.id === iv.candidate_id);
    const alreadySent = !!cand?.decision_email_sent_at;
    if (!alreadySent && cand?.email) {
      const kind: "interview" | "rejection" = rating >= 3 ? "interview" : "rejection";
      // Auto-open the pre-filled email for HR to review and send.
      await sendDecisionEmail(iv, kind);
    } else {
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete interview?")) return;
    const { error } = await supabase.from("interviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((x) => x.filter((i) => i.id !== id));
  };

  const candName = (id: string) => candidates.find((c) => c.id === id)?.name ?? "Candidate";

  const copyLink = async (token: string) => {
    // Always share the public production URL — preview origins require auth and
    // render a blank page for candidates.
    const origin = window.location.hostname.includes("lovable.app") && !window.location.hostname.includes("id-preview")
      ? window.location.origin
      : "https://smarthiring.lovable.app";
    const link = `${origin}/interview/${token}`;
    try { await navigator.clipboard.writeText(link); toast.success("Link copied"); }
    catch { toast.error("Could not copy"); }
  };

  const deleteAiSession = async (id: string) => {
    if (!confirm("Delete this AI interview session?")) return;
    const { error } = await supabase.from("interview_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAiSessions((x) => x.filter((s) => s.id !== id));
  };

  const downloadReport = (s: AiSession) => {
    downloadProctoringPdf({
      candidateName: candName(s.candidate_id),
      jobTitle: jobs.find((j) => j.id === s.job_id)?.title ?? "Role",
      completedAt: s.ended_at ?? s.created_at,
      scores: (s.scores ?? {}) as Record<string, number>,
      sentiment: s.sentiment,
      recommendation: s.recommendation,
      summary: s.summary,
      proctoring: (s.proctoring ?? null) as ProctoringData | null,
      transcript: (s.transcript ?? []) as { role: string; text: string }[],
    });
    toast.success("Proctoring report downloaded");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Interviews</h1>
            <p className="text-muted-foreground mt-1">Schedule and review candidate interviews.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Schedule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label>Candidate</Label>
                  <Select value={candidateId} onValueChange={setCandidateId}>
                    <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name ?? "Unnamed"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date & time</Label>
                    <Input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(parseInt(e.target.value || "30"))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Interviewer</Label>
                    <Input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="Jane Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Venue / meeting link</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office address, phone number, or video link" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving || !candidateId || !scheduledAt}>
                    {saving ? "Saving…" : "Schedule"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
        <Tabs defaultValue="scheduled">
          <TabsList className="mb-6">
            <TabsTrigger value="scheduled" className="gap-2"><Calendar className="h-4 w-4" /> Scheduled ({items.length})</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Sparkles className="h-4 w-4" /> AI Sessions ({aiSessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled">
        {items.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">No interviews scheduled</p>
              <p className="text-muted-foreground">Schedule one to move a candidate forward.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((iv) => {
              const cand = candidates.find((c) => c.id === iv.candidate_id);
              const sentKind = cand?.decision_email_kind;
              return (
                <Card key={iv.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium">{candName(iv.candidate_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(iv.scheduled_at).toLocaleString()} · {iv.duration_minutes}min · {iv.interview_type}
                          {iv.interviewer ? ` · with ${iv.interviewer}` : ""}
                          {iv.location ? ` · ${iv.location}` : ""}
                        </p>
                      </div>
                      <Badge variant={iv.status === "completed" ? "default" : iv.status === "cancelled" ? "secondary" : "outline"}>
                        {iv.status}
                      </Badge>
                      <Select value={iv.status} onValueChange={(v) => updateStatus(iv.id, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No-show</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => remove(iv.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Rate candidate:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRating(iv, n)}
                            className="p-0.5"
                            aria-label={`Rate ${n} of 5`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                (iv.rating ?? 0) >= n
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {iv.rating != null && (
                        <span className="text-xs text-muted-foreground">
                          {iv.rating >= 3 ? "→ Interview email" : "→ Rejection email"}
                        </span>
                      )}
                      <div className="flex-1" />
                      {sentKind ? (
                        <Badge variant="secondary" className="gap-1">
                          <Mail className="h-3 w-3" />
                          {sentKind === "interview" ? "Interview email opened" : "Rejection email opened"}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={!cand?.email}
                            onClick={() => sendDecisionEmail(iv, "interview")}
                          >
                            <Mail className="h-4 w-4" /> Interview email
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={!cand?.email}
                            onClick={() => sendDecisionEmail(iv, "rejection")}
                          >
                            <Mail className="h-4 w-4" /> Rejection email
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="ai">
            {aiSessions.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-2">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-lg font-medium">No AI interviews yet</p>
                  <p className="text-muted-foreground">Start one from a candidate row in any job.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {aiSessions.map((s) => {
                  const job = jobs.find((j) => j.id === s.job_id);
                  const overall = (s.scores as { overall?: number } | null)?.overall;
                  return (
                    <Card key={s.id}>
                      <CardContent className="py-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium">{candName(s.candidate_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {job?.title ?? "—"} · {new Date(s.created_at).toLocaleString()}
                            {s.recommendation && s.status === "completed" ? ` · ${s.recommendation.replace("_", " ")}` : ""}
                          </p>
                        </div>
                        {overall != null && (
                          <Badge className="bg-accent text-accent-foreground">{overall}/100</Badge>
                        )}
                        <Badge variant={s.status === "completed" ? "default" : s.status === "live" ? "secondary" : "outline"}>
                          {s.status === "live" ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> live</span> : s.status}
                        </Badge>
                        {s.status !== "completed" && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => copyLink(s.token)}>
                            <Copy className="h-3.5 w-3.5" /> Copy link
                          </Button>
                        )}
                        {s.status === "completed" && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setReportOpen(s)}>
                            <FileText className="h-3.5 w-3.5" /> View report
                          </Button>
                        )}
                        {s.status === "completed" && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(s)}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteAiSession(s.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}

        <Dialog open={!!reportOpen} onOpenChange={(o) => !o && setReportOpen(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Interview Report — {reportOpen ? candName(reportOpen.candidate_id) : ""}</DialogTitle>
            </DialogHeader>
            {reportOpen && (() => {
              const scores = (reportOpen.scores ?? {}) as Record<string, number>;
              const transcript = (reportOpen.transcript ?? []) as Array<{ role: string; text: string }>;
              const proctor = (reportOpen.proctoring ?? null) as ProctoringData | null;
              return (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(reportOpen)}>
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {["overall", "communication", "confidence", "technical"].map((k) => (
                      <div key={k} className="rounded-lg border p-3">
                        <p className="text-xs uppercase text-muted-foreground">{k}</p>
                        <p className="text-2xl font-semibold">{scores[k] ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Proctoring report</p>
                    <div className="rounded-lg border divide-y text-sm">
                      {proctoringRows(proctor).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 px-3 py-2">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-medium text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                    {(proctor?.events ?? []).length > 0 && (
                      <div className="mt-2 rounded-lg border bg-muted/30 p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                        {(proctor?.events ?? []).slice(0, 40).map((ev, i) => (
                          <div key={i}>
                            <span className="text-muted-foreground">{new Date(ev.at).toLocaleTimeString()}</span> — {ev.type}
                            {ev.detail ? `: ${ev.detail}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Sentiment: {reportOpen.sentiment ?? "—"}</Badge>
                    <Badge className="bg-accent text-accent-foreground">Recommendation: {reportOpen.recommendation?.replace("_", " ") ?? "—"}</Badge>
                  </div>
                  {reportOpen.summary && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
                      <p className="text-sm">{reportOpen.summary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Transcript</p>
                    <div className="rounded-lg border bg-muted/30 p-3 max-h-72 overflow-y-auto text-sm space-y-1.5">
                      {transcript.length === 0 && <p className="text-muted-foreground">No transcript captured.</p>}
                      {transcript.map((t, i) => (
                        <div key={i}>
                          <span className="font-medium">{t.role === "agent" ? "Interviewer" : "Candidate"}:</span> {t.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}