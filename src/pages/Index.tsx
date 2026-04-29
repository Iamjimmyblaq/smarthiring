import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles, Target, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "SmartHire — AI Resume Screening";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "AI-powered candidate screening. Rank resumes against your job in seconds.");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/jobs", { replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">SmartHire</span>
        </div>
        <Link to="/auth"><Button variant="outline">Sign in</Button></Link>
      </header>

      <section className="container mx-auto py-20 max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground">
          Screen 1,000 resumes in the time it took to read 10.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          SmartHire uses AI to parse, score and rank every applicant against your role — so you only spend time on the people worth interviewing.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          {[
            { icon: Zap, title: "Bulk upload", desc: "Drop hundreds of PDFs and DOCX resumes at once." },
            { icon: Target, title: "Scored to your role", desc: "Skills, experience, and education weighted per job." },
            { icon: Sparkles, title: "Actionable insights", desc: "Strengths, gaps, and a fit summary for every candidate." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;
