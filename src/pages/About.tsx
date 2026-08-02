import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingNav from "@/components/marketing/MarketingNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Globe2, ShieldCheck, Zap } from "lucide-react";

const values = [
  { icon: Brain, title: "Intelligence first", body: "Every resume, interview and decision is enriched with AI scoring so hiring teams act on evidence, not gut feel." },
  { icon: Zap, title: "Speed without shortcuts", body: "Automated screening, AI video interviews and one-click pipelines cut weeks out of the hiring cycle." },
  { icon: ShieldCheck, title: "Fair and auditable", body: "Structured scoring, transparent criteria and full activity history keep every hiring decision defensible." },
  { icon: Globe2, title: "Built for everywhere", body: "Global payments, multi-currency pricing and an open API mean SmartHire works for teams on any continent." },
];

const stats = [
  { value: "5-stage", label: "Recruitment lifecycle" },
  { value: "AI video", label: "Proctored interviews" },
  { value: "REST + webhooks", label: "Developer platform" },
];

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <Helmet>
        <title>About SmartHire — AI Talent Intelligence Platform</title>
        <meta name="description" content="SmartHire is an AI-powered talent intelligence platform that screens resumes, runs proctored AI video interviews and manages the full hiring lifecycle." />
        <link rel="canonical" href="https://smarthiring.lovable.app/about" />
        <meta property="og:title" content="About SmartHire" />
        <meta property="og:description" content="Why SmartHire exists and how AI screening, interviews and pipelines help teams hire better." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <MarketingNav />

      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">About us</p>
          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Hiring should be intelligent, fast and fair</h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            SmartHire was built for recruiters drowning in resumes and founders who cannot afford a bad hire. We combine
            AI resume scoring, proctored AI video interviews and a complete recruitment pipeline into one operating
            system for talent — so a two-person team can hire like a hundred-person one.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="rounded-xl px-8">Start free</Button></Link>
            <Link to="/faq"><Button size="lg" variant="outline" className="rounded-xl px-8">Read the FAQ</Button></Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="text-center">
              <CardContent className="py-6">
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight text-center">What we stand for</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {values.map((v) => (
              <Card key={v.title}>
                <CardContent className="p-6 flex gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <v.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium">{v.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{v.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Talk to us</h2>
          <p className="mt-3 text-muted-foreground">
            Questions, partnerships or enterprise rollouts — reach the team at{" "}
            <a className="underline" href="mailto:help.smarthire@gmail.com">help.smarthire@gmail.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
