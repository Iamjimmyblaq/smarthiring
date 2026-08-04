import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  headline: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  valid_until: string | null;
}

/** Shows coupons the admin flagged as "display on home page". */
export default function HomeCouponBanner() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    supabase
      .from("coupons")
      .select("id, code, headline, description, discount_type, discount_value, valid_until")
      .eq("is_active", true)
      .eq("show_on_home", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setCoupons((data ?? []) as Coupon[]));
  }, []);

  if (coupons.length === 0) return null;

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success(`Coupon ${code} copied`); }
    catch { toast.info(`Use coupon code ${code} at checkout`); }
  };

  return (
    <section aria-label="Current promotions" className="container mx-auto px-4 pt-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => {
          const off = c.discount_type === "percent" ? `${c.discount_value}% off` : `${c.discount_value} off`;
          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-accent/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Ticket className="h-4 w-4 text-primary" /> {c.headline || off}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.description || "Limited-time offer"}
                  {c.valid_until ? ` · ends ${new Date(c.valid_until).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copy(c.code)}
                  className="rounded-md border border-dashed border-primary/50 bg-card px-2.5 py-1 font-mono text-xs font-semibold"
                >
                  {c.code}
                </button>
                <Button asChild size="sm"><Link to="/pricing">Redeem</Link></Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}