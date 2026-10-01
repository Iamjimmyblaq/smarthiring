import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MapPin, Upload } from "lucide-react";

interface PublicJob {
  job: { id: string; title: string; description: string | null; requirements: string | null; required_skills: string[] | null; min_years_experience: number | null };
  company: { name: string; brand_color: string; location: string | null; website: string | null; tagline: string | null };
}

export default function ApplyJob() {
  const { jobId } = useParams({ strict: false }) as { jobId: string };
  const [data, setData] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: res } = await supabase.rpc("get_public_job" as never, { _job_id: jobId } as never);
      const r = res as unknown as PublicJob & { error?: string };
      if (r && !r.error) setData(r);
      setLoading(false);
    })();
  }, [jobId]);

  const readFile = async (file: File) => {
    setFileName(file.name);
    try {
      const { extractResumeText } = await import("@/lib/resume-parser");
      setResumeText(await extractResumeText(file));
    } catch {
      setResumeText(await file.text());
    }
  };

  const submit = async () => {
    if (!resumeText.trim()) { toast.error("Please attach your resume."); return; }
    setSending(true);
    const { data: res, error } = await supabase.rpc("submit_job_link_application" as never, {
      _job_id: jobId, _full_name: name, _email: email, _phone: phone, _resume_text: resumeText, _cover_note: note,
    } as never);
    setSending(false);
    const p = res as unknown as { ok?: boolean; error?: string };
    if (error || p?.error) {
      toast.error(
        p?.error === "duplicate" ? "You've already applied to this role."
          : p?.error === "job_closed" ? "This role is no longer open."
          : p?.error === "invalid_email" ? "Please enter a valid email."
          : p?.error === "rate_limited" ? "Too many applications — please try again later."
          : "Your application couldn't be sent. Please try again.",
      );
      return;
    }
    setDone(true);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <Logo size={32} />
      <h1 className="text-xl font-semibold">This role is no longer open</h1>
      <p className="text-muted-foreground">The link may have expired or the position has been filled.</p>
    </div>
  );

  const { job, company } = data;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ borderTop: `4px solid ${company.brand_color}` }}>
        <div className="container mx-auto flex items-center justify-between py-4">
          <span className="text-lg font-semibold">{company.name}</span>
          <Logo size={22} />
        </div>
      </header>
      <main className="container mx-auto grid max-w-5xl gap-6 py-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {company.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{company.location}</span>}
            {job.min_years_experience ? <span>{job.min_years_experience}+ years experience</span> : null}
          </div>
          {job.required_skills?.length ? (
            <div className="flex flex-wrap gap-2">{job.required_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
          ) : null}
          {job.description && <div><h2 className="mb-1 font-semibold">About the role</h2><p className="whitespace-pre-line text-muted-foreground">{job.description}</p></div>}
          {job.requirements && <div><h2 className="mb-1 font-semibold">Requirements</h2><p className="whitespace-pre-line text-muted-foreground">{job.requirements}</p></div>}
        </section>
        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="space-y-3 pt-6">
            {done ? (
              <div className="space-y-3 py-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <p className="font-medium">Thanks, {name.split(" ")[0] || "there"}!</p>
                <p className="text-sm text-muted-foreground">Your application is in. If there's a next step, you'll receive an email shortly.</p>
              </div>
            ) : (
              <>
                <h2 className="font-semibold">Apply for this role</h2>
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
                <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40">
                  <Upload className="h-4 w-4" />{fileName || "Attach your resume (PDF or text)"}
                  <input type="file" className="sr-only" accept=".pdf,.txt,.md,.doc,.docx" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
                </label>
                <Textarea rows={3} placeholder="Why you're a fit (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Cover note" />
                <Button className="w-full" style={{ backgroundColor: company.brand_color }} disabled={sending || !name.trim() || !email.trim()} onClick={submit}>
                  {sending ? "Sending…" : "Submit application"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
