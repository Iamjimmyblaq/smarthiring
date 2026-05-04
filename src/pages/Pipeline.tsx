import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { STAGES, type StageKey } from "@/lib/lifecycle";
import type { Tables } from "@/integrations/supabase/types";

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
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Recruitment Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track every candidate through the full hiring lifecycle.
          </p>
        </div>

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
                <div key={s.key} className="rounded-xl border bg-card/40 p-3 min-h-[300px]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">{s.label}</h2>
                    <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {list.map((c) => (
                      <Card key={c.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/jobs/${c.job_id}`} className="font-medium text-sm hover:underline truncate">
                              {c.name ?? "Unnamed"}
                            </Link>
                            {c.overall_score != null && (
                              <Badge variant="outline" className="text-xs">{c.overall_score}</Badge>
                            )}
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