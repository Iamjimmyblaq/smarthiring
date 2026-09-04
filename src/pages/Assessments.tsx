import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Loader2, Search, Send, ShieldCheck, Clock, Sparkles, Download } from "lucide-react";
import { downloadAssessmentPdf, downloadAssessmentsBulkPdf, type AssessmentReportInput } from "@/lib/assessment-report";

import type { Tables } from "@/integrations/supabase/types";

type SkillTest = Tables<"skill_tests">;
type Assignment = Tables<"skill_test_assignments">;
type Candidate = Pick<Tables<"candidates">, "id" | "name" | "email" | "job_id">;

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  language: "Language proficiency",
  cognitive: "Cognitive ability",
  situational: "Situational judgement",
  role_specific: "Role-specific",
};

export default function Assessments() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [assignTest, setAssignTest] = useState<SkillTest | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [sending, setSending] = useState(false);
  const [visible, setVisible] = useState(24);

  useEffect(() => {
    document.title = "Skills assessments — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: a }, { data: c }] = await Promise.all([
      supabase.from("skill_tests").select("*").eq("is_active", true).order("category").order("title"),
      supabase.from("skill_test_assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("candidates").select("id, name, email, job_id").order("created_at", { ascending: false }),
    ]);
    setTests(t ?? []);
    setAssignments(a ?? []);
    setCandidates(c ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (difficulty !== "all" && t.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.skill_area.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [tests, query, category, difficulty]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    tests.forEach((t) => { map[t.category] = (map[t.category] ?? 0) + 1; });
    return map;
  }, [tests]);

  const send = async () => {
    if (!assignTest || !candidateId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("skill-test-assign", {
        body: { candidateId, testId: assignTest.id, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await navigator.clipboard.writeText(data.link).catch(() => undefined);
      toast.success(
        data.emailed ? "Assessment invite emailed — link copied too" : "Assessment created — link copied to clipboard",
      );
      setAssignTest(null);
      setCandidateId("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the assessment");
    } finally {
      setSending(false);
    }
  };

  const testById = (id: string) => tests.find((t) => t.id === id);
  const candidateById = (id: string) => candidates.find((c) => c.id === id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills assessments</h1>
          <p className="text-muted-foreground">
            {tests.length}+ validated tests across coding, language, cognitive ability, situational judgement and
            role-specific competencies — each webcam proctored with plagiarism detection.
          </p>
        </div>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Test library</TabsTrigger>
            <TabsTrigger value="results">Candidate results ({assignments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by skill, title or tag…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setVisible(24); }}
                />
              </div>
              <Select value={category} onValueChange={(v) => { setCategory(v); setVisible(24); }}>
                <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories ({tests.length})</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label} ({counts[key] ?? 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setVisible(24); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">No tests match those filters.</CardContent></Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{filtered.length} test(s)</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.slice(0, visible).map((t) => (
                    <Card key={t.id} className="flex flex-col hover:shadow-md transition-shadow">
                      <CardContent className="p-5 flex flex-col gap-3 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="secondary" className="capitalize">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>
                          {t.proctored && <ShieldCheck className="h-4 w-4 text-accent shrink-0" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold leading-snug">{t.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{t.skill_area}</p>
                          {t.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes} min</span>
                          <span>{t.question_count} questions</span>
                          <span className="capitalize">{t.difficulty}</span>
                        </div>
                        <Button size="sm" className="gap-2" onClick={() => setAssignTest(t)}>
                          <Send className="h-4 w-4" /> Invite candidate
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {visible < filtered.length && (
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={() => setVisible((v) => v + 24)}>Load more tests</Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-3 pt-4">
            {assignments.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                No assessments sent yet. Invite a candidate from the test library.
              </CardContent></Card>
            ) : (
              assignments.map((a) => {
                const t = testById(a.test_id);
                const c = candidateById(a.candidate_id);
                const flags = (a.integrity_flags ?? {}) as Record<string, unknown>;
                const verdict = typeof flags.verdict === "string" ? flags.verdict : null;
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium">{c?.name ?? "Candidate"}</p>
                        <p className="text-sm text-muted-foreground">{t?.title ?? "Assessment"}</p>
                      </div>
                      <Badge variant={a.status === "submitted" ? "default" : "outline"} className="capitalize">
                        {a.status.replace(/_/g, " ")}
                      </Badge>
                      {a.percentage !== null && (
                        <Badge variant="secondary">{a.score}/{a.max_score} · {a.percentage}%</Badge>
                      )}
                      {verdict && (
                        <Badge variant={verdict === "clean" ? "outline" : "destructive"} className="gap-1">
                          <ShieldCheck className="h-3 w-3" /> {verdict}
                          {a.plagiarism_score !== null ? ` (${a.plagiarism_score})` : ""}
                        </Badge>
                      )}
                      <Button
                        size="sm" variant="ghost" className="gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/assessment/${a.token}`);
                          toast.success("Assessment link copied");
                        }}
                      >
                        <Copy className="h-4 w-4" /> Link
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!assignTest} onOpenChange={(o) => !o && setAssignTest(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Invite to {assignTest?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select a candidate" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.email || "Unnamed candidate"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              The candidate gets a single-use, {assignTest?.duration_minutes}-minute proctored link by email. Copy and paste
              are blocked, the webcam is monitored, and the scored report with the integrity check is emailed to your HR
              inbox on submission.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTest(null)}>Cancel</Button>
            <Button onClick={send} disabled={!candidateId || sending} className="gap-2">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send invite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
