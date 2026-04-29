import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Upload, ChevronRight, CheckCircle2, XCircle, Loader2, Star } from "lucide-react";
import { extractResumeText, quickExtractMeta } from "@/lib/resume-parser";
import type { Tables } from "@/integrations/supabase/types";

type Candidate = Tables<"candidates">;
type Job = Tables<"jobs">;

const CONCURRENCY = 3;

const statusColor = (s: number | null) => {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 80) return "bg-accent text-accent-foreground";
  if (s >= 60) return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
};

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filter, setFilter] = useState<"all" | "shortlisted" | "rejected">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!id) return;
    document.title = "Candidates — SmartHire";
    loadAll();

    const channel = supabase
      .channel(`candidates-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `job_id=eq.${id}` },
        (payload) => {
          setCandidates((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as Candidate, ...prev];
            if (payload.eventType === "UPDATE") return prev.map((c) => c.id === (payload.new as Candidate).id ? payload.new as Candidate : c);
            if (payload.eventType === "DELETE") return prev.filter((c) => c.id !== (payload.old as Candidate).id);
            return prev;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAll = async () => {
    const { data: jobData, error: jErr } = await supabase.from("jobs").select("*").eq("id", id!).maybeSingle();
    if (jErr || !jobData) { toast.error("Job not found"); navigate("/jobs"); return; }
    setJob(jobData);
    const { data: cands } = await supabase
      .from("candidates")
      .select("*")
      .eq("job_id", id!)
      .order("overall_score", { ascending: false, nullsFirst: false });
    setCandidates(cands ?? []);
  };

  const processFile = useCallback(async (file: File) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !id) return;
    const userId = userData.user.id;
    let candidateId: string | null = null;
    try {
      const text = await extractResumeText(file);
      if (!text || text.length < 30) throw new Error("Could not extract enough text from file");
      const meta = quickExtractMeta(text);

      const path = `${userId}/${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase.from("candidates").insert({
        job_id: id,
        user_id: userId,
        name: meta.name ?? file.name.replace(/\.[^.]+$/, ""),
        email: meta.email ?? null,
        resume_path: path,
        resume_text: text.slice(0, 50000),
        processing_status: "pending",
      }).select().single();
      if (insErr) throw insErr;
      candidateId = ins.id;

      const { error: fnErr } = await supabase.functions.invoke("score-candidate", {
        body: { candidate_id: ins.id },
      });
      if (fnErr) throw fnErr;
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`${file.name}: ${msg}`);
      if (candidateId) {
        await supabase.from("candidates").update({ processing_status: "error", error_message: msg }).eq("id", candidateId);
      }
    }
  }, [id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setUploading(true);
    setUploadProgress({ done: 0, total: arr.length });

    let idx = 0;
    let done = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, arr.length) }, async () => {
      while (idx < arr.length) {
        const myIdx = idx++;
        await processFile(arr[myIdx]);
        done++;
        setUploadProgress({ done, total: arr.length });
      }
    });
    await Promise.all(workers);
    setUploading(false);
    toast.success(`Processed ${arr.length} resume${arr.length > 1 ? "s" : ""}`);
  };

  const setStatus = async (cid: string, status: string) => {
    const { error } = await supabase.from("candidates").update({ status }).eq("id", cid);
    if (error) toast.error(error.message);
  };

  const filtered = candidates.filter((c) => filter === "all" ? true : c.status === filter);

  const stats = {
    total: candidates.length,
    done: candidates.filter((c) => c.processing_status === "done").length,
    processing: candidates.filter((c) => c.processing_status === "processing" || c.processing_status === "pending").length,
    avg: (() => {
      const scored = candidates.filter((c) => c.overall_score != null);
      if (!scored.length) return 0;
      return Math.round(scored.reduce((s, c) => s + (c.overall_score ?? 0), 0) / scored.length);
    })(),
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> All jobs
        </Link>

        {job && (
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
            {job.requirements && <p className="text-muted-foreground mt-2 max-w-3xl whitespace-pre-line line-clamp-3">{job.requirements}</p>}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Candidates" value={stats.total} />
          <StatCard label="Scored" value={stats.done} />
          <StatCard label="Processing" value={stats.processing} />
          <StatCard label="Avg score" value={stats.avg} suffix="/100" />
        </div>

        <Card className="mb-6">
          <CardContent className="py-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">Drop resumes here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, or TXT — bulk upload supported</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing resumes…</span>
                  <span>{uploadProgress.done} / {uploadProgress.total}</span>
                </div>
                <Progress value={(uploadProgress.done / Math.max(1, uploadProgress.total)) * 100} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ranked candidates</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No candidates {filter !== "all" ? `in “${filter}”` : "yet"}.</div>
            )}
            {filtered.map((c, i) => (
              <div key={c.id}>
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-4"
                >
                  <div className="text-sm text-muted-foreground w-6 tabular-nums">{i + 1}</div>
                  <div className={`h-12 w-12 rounded-md flex flex-col items-center justify-center font-semibold ${statusColor(c.overall_score)}`}>
                    {c.processing_status === "processing" || c.processing_status === "pending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : c.processing_status === "error" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-base">{c.overall_score ?? "—"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.name ?? "Unnamed"}</p>
                      {c.status === "shortlisted" && <Badge className="bg-accent text-accent-foreground">Shortlisted</Badge>}
                      {c.status === "rejected" && <Badge variant="secondary">Rejected</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.email ?? "no email"} {c.summary ? `• ${c.summary}` : c.error_message ? `• ${c.error_message}` : ""}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-90" : ""}`} />
                </button>

                {expanded === c.id && (
                  <div className="bg-muted/30 px-4 py-5 border-t">
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <ScoreBar label="Skills" value={c.skills_score} />
                      <ScoreBar label="Experience" value={c.experience_score} />
                      <ScoreBar label="Education" value={c.education_score} />
                    </div>
                    {c.summary && <p className="text-sm mb-4">{c.summary}</p>}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {(c.strengths ?? []).map((s, idx) => (
                            <li key={idx} className="text-sm flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />{s}</li>
                          ))}
                          {!(c.strengths?.length) && <li className="text-sm text-muted-foreground">—</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Gaps</p>
                        <ul className="space-y-1">
                          {(c.gaps ?? []).map((s, idx) => (
                            <li key={idx} className="text-sm flex gap-2"><XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />{s}</li>
                          ))}
                          {!(c.gaps?.length) && <li className="text-sm text-muted-foreground">—</li>}
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant={c.status === "shortlisted" ? "default" : "outline"} onClick={() => setStatus(c.id, c.status === "shortlisted" ? "new" : "shortlisted")} className="gap-1">
                        <Star className="h-4 w-4" /> {c.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
                      </Button>
                      <Button size="sm" variant={c.status === "rejected" ? "destructive" : "outline"} onClick={() => setStatus(c.id, c.status === "rejected" ? "new" : "rejected")}>
                        {c.status === "rejected" ? "Rejected" : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold">{value}{suffix}</p></CardContent>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value ?? "—"}</span>
      </div>
      <Progress value={value ?? 0} />
    </div>
  );
}

export default JobDetail;