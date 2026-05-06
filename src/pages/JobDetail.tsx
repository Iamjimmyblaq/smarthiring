import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, type StageKey } from "@/lib/lifecycle";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, ChevronRight, CheckCircle2, XCircle, Loader2, Star,
  Trophy, AlertTriangle, FileWarning, FileText, PlayCircle,
} from "lucide-react";
import { extractResumeText, quickExtractMeta } from "@/lib/resume-parser";
import type { Tables } from "@/integrations/supabase/types";
import { usePlan, FREE_RESUME_LIMIT } from "@/hooks/usePlan";

type Candidate = Tables<"candidates">;
type Job = Tables<"jobs">;

const CONCURRENCY = 3;

const scoreColor = (s: number | null) => {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 80) return "bg-accent text-accent-foreground";
  if (s >= 60) return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
};

const qualityLabel = (q: number | null) => {
  if (q == null) return null;
  if (q >= 80) return { label: "Strong resume", tone: "bg-accent/10 text-accent-foreground border-accent/30" };
  if (q >= 60) return { label: "Decent resume", tone: "bg-muted text-muted-foreground border-border" };
  if (q >= 40) return { label: "Weak resume", tone: "bg-warning/10 text-warning-foreground border-warning/30" };
  return { label: "Poor resume", tone: "bg-destructive/10 text-destructive border-destructive/30" };
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
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const planState = usePlan();

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

  const queueFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let arr = Array.from(files);
    if (planState.plan === "free") {
      const remaining = planState.remainingResumes;
      if (remaining <= 0) {
        toast.error(`Free plan limit reached (${FREE_RESUME_LIMIT} resumes). Upgrade to upload more.`);
        navigate("/pricing");
        return;
      }
      if (arr.length > remaining) {
        toast.warning(`Free plan limit: only the first ${remaining} of ${arr.length} files will be processed.`);
        arr = arr.slice(0, remaining);
      }
    }
    setQueuedFiles(arr);
    setUploadProgress({ done: 0, total: arr.length });
    toast.success(`${arr.length} resume${arr.length > 1 ? "s" : ""} ready to scan`);
  };

  const processQueuedFiles = async () => {
    let arr = queuedFiles;
    if (arr.length === 0) return;
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
    setQueuedFiles([]);
    await loadAll();
    planState.refresh();
    toast.success(`Processed ${arr.length} resume${arr.length > 1 ? "s" : ""}`);
  };

  const setStatus = async (cid: string, status: string) => {
    const { error } = await supabase.from("candidates").update({ status }).eq("id", cid);
    if (error) toast.error(error.message);
  };

  const setStage = async (cid: string, stage: StageKey) => {
    const { error } = await supabase.from("candidates").update({ stage }).eq("id", cid);
    if (error) toast.error(error.message);
  };

  const bulkSetStatus = async (status: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("candidates").update({ status }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} candidate${ids.length > 1 ? "s" : ""} ${status === "shortlisted" ? "shortlisted" : status === "rejected" ? "rejected" : "updated"}`);
    setSelected(new Set());
  };

  const filtered = candidates.filter((c) => filter === "all" ? true : c.status === filter);

  const top5Ids = useMemo(() => {
    return new Set(
      [...candidates]
        .filter((c) => c.overall_score != null && c.processing_status === "done")
        .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
        .slice(0, 5)
        .map((c) => c.id)
    );
  }, [candidates]);

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

  const toggleSelect = (cid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const top5 = useMemo(
    () => candidates.filter((c) => top5Ids.has(c.id)).sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0)),
    [candidates, top5Ids]
  );

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
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {(job.required_skills ?? []).map((s) => (
                <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
              ))}
              {job.min_years_experience > 0 && (
                <Badge variant="outline">{job.min_years_experience}+ yrs experience</Badge>
              )}
            </div>
            {job.requirements && <p className="text-muted-foreground mt-3 max-w-3xl whitespace-pre-line line-clamp-3">{job.requirements}</p>}
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
              onDrop={(e) => { e.preventDefault(); queueFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">Drop resumes here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, or TXT — bulk upload supported</p>
              {planState.plan === "free" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Free plan: {planState.remainingResumes} of {FREE_RESUME_LIMIT} resumes remaining ·{" "}
                  <Link to="/pricing" className="text-accent underline">Upgrade</Link>
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => { queueFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            {queuedFiles.length > 0 && !uploading && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {queuedFiles.length} file{queuedFiles.length > 1 ? "s" : ""} uploaded
                    </p>
                    <p className="text-sm text-muted-foreground">Ready to scan and rank against this job.</p>
                  </div>
                  <Button onClick={processQueuedFiles} className="gap-2">
                    <PlayCircle className="h-4 w-4" /> Proceed to scan
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {queuedFiles.map((file) => (
                    <Badge key={`${file.name}-${file.size}`} variant="secondary" className="max-w-full truncate">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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

        {top5.length > 0 && (
          <Card className="mb-6 border-accent/40 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                Top {top5.length} candidate{top5.length > 1 ? "s" : ""}
                <span className="text-xs font-normal text-muted-foreground">— auto-shortlist suggestion</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {top5.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setExpanded(c.id); document.getElementById(`cand-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                  className="text-left rounded-lg border bg-card p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${scoreColor(c.overall_score)}`}>{c.overall_score}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{c.name ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(c.matched_skills?.length ?? 0)}/{((c.matched_skills?.length ?? 0) + (c.missing_skills?.length ?? 0)) || "—"} skills
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Ranked candidates</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 sticky top-[68px] z-10 shadow-sm">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" onClick={() => bulkSetStatus("shortlisted")} className="gap-1">
              <Star className="h-4 w-4" /> Shortlist
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulkSetStatus("rejected")}>
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("new")}>Reset</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-3 bg-muted/30 text-xs text-muted-foreground">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Select all ({filtered.length})</span>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No candidates {filter !== "all" ? `in “${filter}”` : "yet"}.</div>
            )}
            {filtered.map((c, i) => {
              const isTop = top5Ids.has(c.id);
              const totalSkills = (c.matched_skills?.length ?? 0) + (c.missing_skills?.length ?? 0);
              const quality = qualityLabel(c.resume_quality_score);
              return (
                <div key={c.id} id={`cand-${c.id}`}>
                  <div className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-3">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <div className="text-sm text-muted-foreground w-6 tabular-nums">{i + 1}</div>
                      <div className={`h-12 w-12 rounded-md flex flex-col items-center justify-center font-semibold ${scoreColor(c.overall_score)}`}>
                        {c.processing_status === "processing" || c.processing_status === "pending" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : c.processing_status === "error" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-base">{c.overall_score ?? "—"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{c.name ?? "Unnamed"}</p>
                          {isTop && <Badge className="bg-accent text-accent-foreground gap-1"><Trophy className="h-3 w-3" /> Top 5</Badge>}
                          {c.status === "shortlisted" && <Badge className="bg-accent text-accent-foreground">Shortlisted</Badge>}
                          {c.status === "rejected" && <Badge variant="secondary">Rejected</Badge>}
                          {quality && (
                            <Badge variant="outline" className={`gap-1 ${quality.tone}`}>
                              <FileWarning className="h-3 w-3" /> {quality.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {totalSkills > 0 && (
                            <span className="font-medium text-foreground">
                              Matched {c.matched_skills?.length ?? 0}/{totalSkills} skills
                            </span>
                          )}
                          {c.years_experience != null && job && (
                            <span> · {Number(c.years_experience).toFixed(c.years_experience % 1 === 0 ? 0 : 1)} yrs vs required {job.min_years_experience}</span>
                          )}
                          {!totalSkills && c.summary && <span>{c.summary}</span>}
                          {c.error_message && <span className="text-destructive"> · {c.error_message}</span>}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-90" : ""}`} />
                    </button>
                  </div>

                  {expanded === c.id && (
                    <div className="bg-muted/30 px-4 py-5 border-t">
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <ScoreBar label="Skills" value={c.skills_score} />
                        <ScoreBar label="Experience" value={c.experience_score} />
                        <ScoreBar label="Education" value={c.education_score} />
                      </div>

                      {(c.matched_skills?.length || c.missing_skills?.length) ? (
                        <div className="mb-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Skill match</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(c.matched_skills ?? []).map((s) => (
                              <Badge key={`m-${s}`} className="bg-accent/15 text-accent-foreground border border-accent/30 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> {s}
                              </Badge>
                            ))}
                            {(c.missing_skills ?? []).map((s) => (
                              <Badge key={`x-${s}`} variant="outline" className="text-destructive border-destructive/30 gap-1">
                                <XCircle className="h-3 w-3" /> {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {c.years_experience != null && job && (
                        <p className="text-sm mb-4">
                          <span className="font-medium">Experience: </span>
                          {Number(c.years_experience).toFixed(c.years_experience % 1 === 0 ? 0 : 1)} years
                          {" "}vs required {job.min_years_experience} years
                          {Number(c.years_experience) >= job.min_years_experience
                            ? <span className="text-accent ml-2">✓ meets requirement</span>
                            : <span className="text-destructive ml-2">✗ below requirement</span>}
                        </p>
                      )}

                      {(c.resume_quality_issues?.length ?? 0) > 0 && (
                        <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 p-3">
                          <p className="text-xs uppercase tracking-wide text-warning-foreground mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Resume quality issues
                          </p>
                          <ul className="text-sm space-y-0.5">
                            {(c.resume_quality_issues ?? []).map((q, idx) => (
                              <li key={idx}>• {q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

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
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Stage:</span>
                          <Select value={(c.stage as StageKey) ?? "sourced"} onValueChange={(v) => setStage(c.id, v as StageKey)}>
                            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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