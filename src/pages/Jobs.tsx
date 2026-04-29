import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Briefcase, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { usePlan, FREE_JOB_LIMIT, FREE_RESUME_LIMIT } from "@/hooks/usePlan";
import { Sparkles } from "lucide-react";

type Job = Tables<"jobs"> & { candidate_count?: number };

const Jobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minYears, setMinYears] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const planState = usePlan();

  useEffect(() => {
    document.title = "Jobs — SmartHire";
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else loadJobs();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/auth", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setJobs(data ?? []);
    setLoading(false);
  };

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planState.canCreateJob) {
      toast.error(`Free plan limited to ${FREE_JOB_LIMIT} job. Upgrade to create more.`);
      navigate("/pricing");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const required_skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title,
        description,
        requirements,
        required_skills,
        min_years_experience: Number.isFinite(minYears) ? minYears : 0,
        user_id: userData.user.id,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    setTitle(""); setDescription(""); setRequirements(""); setSkillsInput(""); setMinYears(0);
    planState.refresh();
    toast.success("Job created");
    if (data) navigate(`/jobs/${data.id}`);
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job and all its candidates?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setJobs((j) => j.filter((x) => x.id !== id));
    planState.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
            <p className="text-muted-foreground mt-1">Create a role and start screening candidates.</p>
          </div>
          <div className="flex items-center gap-2">
            {planState.plan === "free" && (
              <Link to="/pricing">
                <Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" /> Upgrade</Button>
              </Link>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create a new job</DialogTitle></DialogHeader>
              <form onSubmit={createJob} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job title</Label>
                  <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the role entails…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="req">Key requirements</Label>
                  <Textarea id="req" rows={5} required value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="e.g. 5+ yrs Python, distributed systems, AWS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Required skills (comma-separated)</Label>
                  <Input id="skills" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="Python, PostgreSQL, AWS, Docker, Kubernetes" />
                  <p className="text-xs text-muted-foreground">Each skill is matched against the resume to power explainable scoring.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years">Minimum years of experience</Label>
                  <Input id="years" type="number" min={0} max={30} value={minYears} onChange={(e) => setMinYears(parseInt(e.target.value || "0", 10))} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create job"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {planState.plan === "free" && !planState.loading && (
          <Card className="mb-6 border-dashed">
            <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">Free plan</span>
                <span className="text-muted-foreground"> · {planState.jobCount}/{FREE_JOB_LIMIT} job · {planState.resumeCount}/{FREE_RESUME_LIMIT} resumes used</span>
              </div>
              <Link to="/pricing">
                <Button size="sm" variant="outline" className="gap-2"><Sparkles className="h-4 w-4" /> Upgrade to Pro</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-3">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">No jobs yet</p>
              <p className="text-muted-foreground">Create your first job to start screening resumes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <Link to={`/jobs/${job.id}`} className="space-y-1 flex-1">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <Badge variant="secondary">{job.status}</Badge>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <Link to={`/jobs/${job.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
                      {job.description || job.requirements}
                    </p>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Jobs;