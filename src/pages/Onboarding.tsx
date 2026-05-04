import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, UserCheck } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_ONBOARDING_TASKS } from "@/lib/lifecycle";

type Task = Tables<"onboarding_tasks">;
type Candidate = Pick<Tables<"candidates">, "id" | "name" | "stage">;

export default function Onboarding() {
  const navigate = useNavigate();
  const [hires, setHires] = useState<Candidate[]>([]);
  const [tasksByCand, setTasksByCand] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Onboarding — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: cands } = await supabase
      .from("candidates")
      .select("id, name, stage")
      .eq("stage", "hired");
    const list = (cands ?? []) as Candidate[];
    setHires(list);
    if (list.length) {
      const { data: ts } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .in("candidate_id", list.map((c) => c.id))
        .order("sort_order", { ascending: true });
      const grouped: Record<string, Task[]> = {};
      (ts ?? []).forEach((t) => {
        (grouped[t.candidate_id] ??= []).push(t);
      });
      setTasksByCand(grouped);
    }
    setLoading(false);
  };

  const seedDefaults = async (candidateId: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = DEFAULT_ONBOARDING_TASKS.map((title, i) => ({
      user_id: u.user!.id, candidate_id: candidateId, title, sort_order: i,
    }));
    const { error } = await supabase.from("onboarding_tasks").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Default checklist added");
    load();
  };

  const addTask = async (candidateId: string) => {
    const title = (newTaskInputs[candidateId] || "").trim();
    if (!title) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const order = (tasksByCand[candidateId]?.length ?? 0);
    const { error } = await supabase.from("onboarding_tasks").insert({
      user_id: u.user.id, candidate_id: candidateId, title, sort_order: order,
    });
    if (error) return toast.error(error.message);
    setNewTaskInputs((p) => ({ ...p, [candidateId]: "" }));
    load();
  };

  const toggle = async (t: Task) => {
    const next = !t.completed;
    const { error } = await supabase.from("onboarding_tasks")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    setTasksByCand((prev) => ({
      ...prev,
      [t.candidate_id]: prev[t.candidate_id].map((x) => x.id === t.id ? { ...x, completed: next } : x),
    }));
  };

  const remove = async (t: Task) => {
    const { error } = await supabase.from("onboarding_tasks").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    setTasksByCand((prev) => ({
      ...prev,
      [t.candidate_id]: prev[t.candidate_id].filter((x) => x.id !== t.id),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">Track onboarding tasks for every new hire.</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : hires.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-2">
              <UserCheck className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">No hires yet</p>
              <p className="text-muted-foreground">Move a candidate to "Hired" in the Pipeline to start onboarding.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {hires.map((h) => {
              const tasks = tasksByCand[h.id] ?? [];
              const done = tasks.filter((t) => t.completed).length;
              const pct = tasks.length ? (done / tasks.length) * 100 : 0;
              return (
                <Card key={h.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{h.name ?? "New hire"}</CardTitle>
                      <span className="text-xs text-muted-foreground">{done}/{tasks.length} complete</span>
                    </div>
                    <Progress value={pct} className="mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tasks.length === 0 ? (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => seedDefaults(h.id)}>
                        <Sparkles className="h-4 w-4" /> Add default checklist
                      </Button>
                    ) : (
                      tasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 py-1">
                          <Checkbox checked={t.completed} onCheckedChange={() => toggle(t)} />
                          <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                          <Button variant="ghost" size="icon" onClick={() => remove(t)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder="Add a task…"
                        value={newTaskInputs[h.id] ?? ""}
                        onChange={(e) => setNewTaskInputs((p) => ({ ...p, [h.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(h.id); } }}
                      />
                      <Button size="sm" onClick={() => addTask(h.id)} className="gap-1"><Plus className="h-4 w-4" />Add</Button>
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