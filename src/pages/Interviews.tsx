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
import { toast } from "sonner";
import { Plus, Calendar, Trash2, Mail, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { generateDecisionEmail, openInMailClient } from "@/lib/recruitment-emails";

type Interview = Tables<"interviews">;
type Candidate = Pick<Tables<"candidates">, "id" | "name" | "job_id" | "email" | "decision_email_kind" | "decision_email_sent_at">;
type JobLite = Pick<Tables<"jobs">, "id" | "title" | "company_name" | "hr_email">;
type ProfileLite = Pick<Tables<"profiles">, "id" | "company_name" | "hr_email" | "full_name">;

export default function Interviews() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Interview[]>([]);
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
    const [{ data: ints }, { data: cands }, { data: jbs }, { data: prof }] = await Promise.all([
      supabase.from("interviews").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("candidates").select("id, name, job_id, email, decision_email_kind, decision_email_sent_at"),
      supabase.from("jobs").select("id, title, company_name, hr_email"),
      u.user
        ? supabase.from("profiles").select("id, company_name, hr_email, full_name").eq("id", u.user.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: ProfileLite | null }),
    ]);
    setItems(ints ?? []);
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
        ) : items.length === 0 ? (
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
      </main>
    </div>
  );
}