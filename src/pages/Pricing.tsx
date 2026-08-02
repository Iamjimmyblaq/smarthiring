import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { usePlan, FREE_JOB_LIMIT, FREE_RESUME_LIMIT } from "@/hooks/usePlan";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Tier {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  billing_period: string;
  max_jobs: number | null;
  max_resumes: number | null;
  max_ai_interviews: number | null;
  features: string[];
}

const fmtLimit = (v: number | null, label: string) => (v === null ? `Unlimited ${label}` : `${v.toLocaleString()} ${label}`);

const Pricing = () => {
  const navigate = useNavigate();
  const planState = usePlan();
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    document.title = "Pricing — SmartHire";
    supabase
      .from("plan_tiers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setTiers(((data ?? []) as any[]).map((t) => ({ ...t, features: t.features ?? [] })) as Tier[]));
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { callback_url: `${window.location.origin}/payment/verify` },
      });
      if (error) throw error;
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing — SmartHire</title>
        <meta name="description" content="SmartHire pricing: start free with 1 job and 100 resumes, or upgrade to Pro at $29/mo for unlimited jobs, unlimited resumes and advanced AI insights." />
        <link rel="canonical" href="https://smarthiring.lovable.app/pricing" />
        <meta property="og:title" content="Pricing — SmartHire" />
        <meta property="og:description" content="Free plan for 1 job and 100 resumes. Pro at $29/mo for unlimited hiring." />
        <meta property="og:url" content="https://smarthiring.lovable.app/pricing" />
        <meta name="twitter:title" content="Pricing — SmartHire" />
        <meta name="twitter:description" content="Free plan for 1 job and 100 resumes. Pro at $29/mo for unlimited hiring." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "SmartHire Pro",
          "description": "Unlimited jobs, unlimited resumes, advanced AI insights, bias reduction mode, bulk actions and priority support.",
          "brand": { "@type": "Brand", "name": "SmartHire" },
          "offers": [
            { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "url": "https://smarthiring.lovable.app/pricing" },
            { "@type": "Offer", "name": "Pro", "price": "29", "priceCurrency": "USD", "url": "https://smarthiring.lovable.app/pricing" }
          ]
        })}</script>
      </Helmet>
      <AppHeader />
      <main className="container mx-auto py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Plans built for serious hiring</h1>
          <p className="text-muted-foreground mt-3">Start free. Upgrade when you need more roles or volume.</p>
        </div>

        <h2 className="sr-only">Plans</h2>
        {tiers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => {
              const isCurrent = planState.plan === tier.key;
              const isFree = Number(tier.price_amount) === 0;
              return (
                <Card key={tier.id} className={isCurrent ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-semibold leading-none tracking-tight">{tier.name}</h3>
                      {isCurrent && <span className="text-xs rounded-full bg-secondary px-2 py-0.5">Current</span>}
                    </div>
                    <p className="text-3xl font-semibold mt-2">
                      {tier.currency === "USD" ? "$" : `${tier.currency} `}
                      {Number(tier.price_amount).toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground">/{tier.billing_period}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Feature>{fmtLimit(tier.max_resumes, "resume uploads")}</Feature>
                    <Feature>{fmtLimit(tier.max_jobs, "active jobs")}</Feature>
                    <Feature>{fmtLimit(tier.max_ai_interviews, "AI interviews")}</Feature>
                    {tier.features.map((f) => <Feature key={f}>{f}</Feature>)}
                    <Button
                      className="w-full mt-4 gap-2"
                      variant={isFree ? "outline" : "default"}
                      disabled={isCurrent || loading}
                      onClick={() => (isFree ? navigate("/jobs") : handleUpgrade())}
                    >
                      {isCurrent ? "Current plan" : isFree ? "Get started" : loading ? "Redirecting…" : <>Choose {tier.name} <Sparkles className="h-4 w-4" /></>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className={planState.plan === "free" ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Free</h2>
                {planState.plan === "free" && <span className="text-xs rounded-full bg-secondary px-2 py-0.5">Current</span>}
              </div>
              <p className="text-3xl font-semibold mt-2">$0</p>
              <p className="text-sm text-muted-foreground">Forever — try the full ranking flow.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Feature>{FREE_JOB_LIMIT} active job</Feature>
              <Feature>Up to {FREE_RESUME_LIMIT} resumes total</Feature>
              <Feature>AI scoring & ranking</Feature>
              <Feature>Top 5 auto-shortlist</Feature>
              <Feature>Skill match breakdown</Feature>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/jobs")}>Go to dashboard</Button>
            </CardContent>
          </Card>

          <Card className="border-accent relative overflow-hidden">
            <div className="absolute top-3 right-3 text-xs rounded-full bg-accent text-accent-foreground px-2 py-0.5">Recommended</div>
            <CardHeader>
              <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Pro</h2>
              <p className="text-3xl font-semibold mt-2">$29<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground">For teams hiring at volume.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Feature>Unlimited jobs</Feature>
              <Feature>Unlimited resumes</Feature>
              <Feature>Advanced AI insights</Feature>
              <Feature>Bias reduction mode</Feature>
              <Feature>Bulk actions & exports</Feature>
              <Feature>Priority support</Feature>
              <Button className="w-full mt-4 gap-2" onClick={handleUpgrade} disabled={planState.plan === "pro" || loading}>
                {planState.plan === "pro" ? "Current plan" : loading ? "Redirecting…" : <>Upgrade to Pro <Sparkles className="h-4 w-4" /></>}
              </Button>
            </CardContent>
          </Card>
        </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-10">
          Questions? <Link to="/jobs" className="underline">Back to dashboard</Link>
        </p>
      </main>
    </div>
  );
};

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default Pricing;