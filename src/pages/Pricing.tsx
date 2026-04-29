import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { usePlan, FREE_JOB_LIMIT, FREE_RESUME_LIMIT } from "@/hooks/usePlan";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const navigate = useNavigate();
  const planState = usePlan();
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Pricing — SmartHire"; }, []);

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
      <AppHeader />
      <main className="container mx-auto py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Plans built for serious hiring</h1>
          <p className="text-muted-foreground mt-3">Start free. Upgrade when you need more roles or volume.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className={planState.plan === "free" ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Free</CardTitle>
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
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Pro</CardTitle>
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