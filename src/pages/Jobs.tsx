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
import { Plus, Briefcase, Trash2, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { usePlan, FREE_JOB_LIMIT, FREE_RESUME_LIMIT } from "@/hooks/usePlan";

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
  const [companyName, setCompanyName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
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
        company_name: companyName.trim() || null,
        hr_email: hrEmail.trim() || null,
        user_id: userData.user.id,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    setTitle(""); setDescription(""); setRequirements(""); setSkillsInput(""); setMinYears(0);
    setCompanyName(""); setHrEmail("");
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
              <p className="text-muted-foreground mt-1">Create a role and start screening candidates.</p>
            </div>
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
            <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company name</Label>
                    <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hr">HR / Hiring email</Label>
                    <Input id="hr" type="email" value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} placeholder="hiring@acme.com" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Used to sign auto-generated interview/rejection emails. Leave blank to use your profile defaults.
                </p>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="group relative overflow-hidden border-2 hover:border-accent/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <Link to={`/jobs/${job.id}`} className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/20 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-accent" />
                      </div>
                      <CardTitle className="text-base group-hover:text-accent transition-colors">{job.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="capitalize">{job.status}</Badge>
                  </Link>
                  <Button variant="ghost" size="icon" aria-label="Delete job" onClick={() => deleteJob(job.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
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