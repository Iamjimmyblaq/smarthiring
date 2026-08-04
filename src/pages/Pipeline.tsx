import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, Download, FileSpreadsheet, FileText, Users, Video } from "lucide-react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { normalizeParseStatus, parseProgress, retryAllFailed, retryResumeParse } from "@/lib/resume-parsing";
import { toast } from "sonner";
import { STAGES, type StageKey } from "@/lib/lifecycle";
import type { Tables } from "@/integrations/supabase/types";
import { createAiInterview } from "@/lib/ai-interview";
import aiRoom from "@/assets/ai-interview-room.jpg";
import {
  exportAllStagesExcel,
  exportAllStagesPdf,
  exportStageExcel,
  exportStagePdf,
} from "@/lib/candidate-exports";

type Candidate = Tables<"candidates"> & { jobs?: { title: string } | null };

export default function Pipeline() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Pipeline — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select("*, jobs(title)")
      .order("overall_score", { ascending: false, nullsFirst: false });
    if (error) toast.error(error.message);
    else setCandidates((data ?? []) as Candidate[]);
    setLoading(false);
  };

  // Live parsing updates so the pipeline reflects scan progress without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-candidates")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = parseProgress(candidates);

  const moveStage = async (id: string, stage: StageKey) => {
    const prev = candidates;
    setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)));
    const { error } = await supabase.from("candidates").update({ stage }).eq("id", id);
    if (error) {
      toast.error(error.message);
      setCandidates(prev);
    } else toast.success(`Moved to ${stage}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Recruitment Pipeline</h1>
              <p className="text-muted-foreground mt-1">
                Track every candidate through the full hiring lifecycle.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STAGES.map((s) => {
                  const count = candidates.filter((c) => (c.stage ?? "sourced") === s.key).length;
                  return (
                    <span
                      key={s.key}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label} · {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={candidates.length === 0}>
                <Download className="h-4 w-4" /> Download all stages
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export full pipeline</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportAllStagesExcel(candidates)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAllStagesPdf(candidates)}>
                <FileText className="h-4 w-4 mr-2" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* AI interview showcase */}
        <section className="mb-8 grid gap-6 rounded-2xl border bg-gradient-to-br from-accent/10 via-background to-primary/5 p-6 shadow-sm lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Bot className="h-3.5 w-3.5" /> AI Video Interview
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              Let the AI interviewer run the first round.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Send a proctored video interview link to anyone in the pipeline. The AI asks role-specific
              questions on camera, watches for malpractice, then scores and emails the report back to you.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/interviews"><Video className="h-4 w-4" /> Manage AI sessions</Link>
              </Button>
              <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
                Use the <Bot className="h-3.5 w-3.5 text-primary" /> button on any candidate card
              </span>
            </div>
          </div>
          <img
            src={aiRoom}
            alt="AI video interview room with candidate camera, audio waveform and live scoring panel"
            width={1280}
            height={896}
            loading="lazy"
            className="w-full rounded-xl border object-cover shadow-md"
          />
        </section>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : candidates.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-2">
              <p className="text-lg font-medium">No candidates yet</p>
              <p className="text-muted-foreground">
                Upload resumes from a <Link to="/jobs" className="underline">job</Link> to populate your pipeline.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((s) => {
              const list = candidates.filter((c) => (c.stage ?? "sourced") === s.key);
              return (
                <div
                  key={s.key}
                  className={`rounded-2xl border-2 p-3 min-h-[320px] shadow-sm transition-shadow hover:shadow-md ${s.column}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className={s.accent}>{s.label}</span>
                    </h2>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs border ${s.color}`} variant="outline">{list.length}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={list.length === 0}
                            aria-label={`Download ${s.label}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Download {s.label}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportStageExcel(s.key, list)}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportStagePdf(s.key, list)}>
                            <FileText className="h-4 w-4 mr-2" /> PDF (.pdf)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {list.map((c) => (
                      <Card key={c.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/jobs/${c.job_id}`} className="font-medium text-sm hover:underline truncate">
                              {c.name ?? "Unnamed"}
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                              {c.overall_score != null && (
                                <Badge variant="outline" className="text-xs">{c.overall_score}</Badge>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-primary"
                                title="Start AI video interview"
                                aria-label={`Start AI video interview for ${c.name ?? "candidate"}`}
                                onClick={() => createAiInterview(c, c.jobs?.title)}
                              >
                                <Bot className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {c.jobs?.title && (
                            <p className="text-xs text-muted-foreground truncate">{c.jobs.title}</p>
                          )}
                          <Select
                            value={(c.stage as StageKey) ?? "sourced"}
                            onValueChange={(v) => moveStage(c.id, v as StageKey)}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((st) => (
                                <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                    {list.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}