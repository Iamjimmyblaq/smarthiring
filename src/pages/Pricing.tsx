import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, TicketPercent, Loader2 } from "lucide-react";
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

interface CouponResult {
  valid: boolean;
  code?: string;
  discount?: number;
  total?: number;
  reason?: string;
}

const money = (currency: string, amount: number) =>
  `${currency === "USD" ? "$" : `${currency} `}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const Pricing = () => {
  const navigate = useNavigate();
  const planState = usePlan();
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [checking, setChecking] = useState(false);
  /** Validated discount per tier key, so every tier shows its own correct total. */
  const [couponByTier, setCouponByTier] = useState<Record<string, CouponResult>>({});
  const [appliedCode, setAppliedCode] = useState("");

  useEffect(() => {
    document.title = "Pricing — SmartHire";
    supabase
      .from("plan_tiers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setTiers(((data ?? []) as any[]).map((t) => ({ ...t, features: t.features ?? [] })) as Tier[]));
  }, []);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const paid = tiers.filter((t) => Number(t.price_amount) > 0);
    if (paid.length === 0) return;
    setChecking(true);
    try {
      const results = await Promise.all(
        paid.map(async (t) => {
          const { data, error } = await supabase.functions.invoke("coupon-validate", {
            body: { code, tier_key: t.key },
          });
          if (error) throw error;
          return [t.key, data as CouponResult] as const;
        }),
      );
      const map = Object.fromEntries(results) as Record<string, CouponResult>;
      setCouponByTier(map);
      const anyValid = results.some(([, r]) => r?.valid);
      if (anyValid) {
        setAppliedCode(code);
        const applicable = results.filter(([, r]) => r?.valid).map(([k]) => paid.find((t) => t.key === k)?.name).filter(Boolean);
        toast.success(`Coupon ${code} applied to ${applicable.join(", ")}`);
      } else {
        setAppliedCode("");
        toast.error(results[0]?.[1]?.reason || "This coupon isn't valid for any plan.");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not check that coupon");
    } finally {
      setChecking(false);
    }
  };

  const clearCoupon = () => {
    setCouponInput("");
    setAppliedCode("");
    setCouponByTier({});
  };

  const handleUpgrade = async (tierKey = "pro") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          callback_url: `${window.location.origin}/payment/verify`,
          tier_key: tierKey,
          coupon_code: couponByTier[tierKey]?.valid ? appliedCode : undefined,
        },
      });
      if (error) throw error;
      if (data?.free) {
        toast.success("Coupon covered the full price — your plan is active.");
        navigate("/jobs");
        return;
      }
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
        {tiers.some((t) => Number(t.price_amount) > 0) && (
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <TicketPercent className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Have a coupon code?"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  aria-label="Coupon code"
                />
              </div>
              <Button onClick={applyCoupon} disabled={checking || !couponInput.trim()}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
              {appliedCode && <Button variant="ghost" onClick={clearCoupon}>Clear</Button>}
            </div>
            {appliedCode && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                <strong>{appliedCode}</strong> applied — discounted totals are shown on eligible plans below.
              </p>
            )}
          </div>
        )}
        {tiers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => {
              const isCurrent = planState.plan === tier.key;
              const isFree = Number(tier.price_amount) === 0;
              const applied = couponByTier[tier.key];
              const hasDiscount = Boolean(applied?.valid && (applied.discount ?? 0) > 0);
              const total = hasDiscount ? Number(applied!.total) : Number(tier.price_amount);
              return (
                <Card key={tier.id} className={isCurrent ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-semibold leading-none tracking-tight">{tier.name}</h3>
                      {isCurrent && <span className="text-xs rounded-full bg-secondary px-2 py-0.5">Current</span>}
                    </div>
                    <p className="text-3xl font-semibold mt-2">
                      {hasDiscount && (
                        <span className="text-base font-normal text-muted-foreground line-through mr-2">
                          {money(tier.currency, Number(tier.price_amount))}
                        </span>
                      )}
                      {money(tier.currency, total)}
                      <span className="text-base font-normal text-muted-foreground">/{tier.billing_period}</span>
                    </p>
                    {hasDiscount && (
                      <p className="text-xs font-medium text-accent">
                        {appliedCode}: you save {money(tier.currency, Number(applied!.discount))}
                      </p>
                    )}
                    {appliedCode && !isFree && !applied?.valid && (
                      <p className="text-xs text-muted-foreground">Coupon not valid for this plan</p>
                    )}
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
                      onClick={() => (isFree ? navigate("/jobs") : handleUpgrade(tier.key))}
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
              <Button className="w-full mt-4 gap-2" onClick={() => handleUpgrade("pro")} disabled={planState.plan === "pro" || loading}>
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