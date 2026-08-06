import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";

interface Redemption {
  id: string;
  code: string | null;
  tier_key: string | null;
  amount_discounted: number | null;
  original_amount: number | null;
  final_amount: number | null;
  currency: string | null;
  payment_reference: string | null;
  confirmed_via: string | null;
  created_at: string;
  user_id: string;
}

export default function CouponAuditLog() {
  const [rows, setRows] = useState<Redemption[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("coupon_redemptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      const list = (data ?? []) as unknown as Redemption[];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, email").in("id", ids);
        setEmails(Object.fromEntries((profs ?? []).map((p) => [p.id, p.email ?? ""])));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [r.code, r.tier_key, r.payment_reference, emails[r.user_id]].some((v) => (v ?? "").toLowerCase().includes(s));
  });

  const money = (v: number | null | undefined, cur: string | null) =>
    v == null ? "—" : `${cur || "USD"} ${Number(v).toFixed(2)}`;

  const exportCsv = () => {
    const header = ["Date", "User", "Coupon code", "Tier", "Original", "Discount", "Charged", "Currency", "Reference", "Confirmed via"];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      emails[r.user_id] || r.user_id,
      r.code ?? "",
      r.tier_key ?? "",
      r.original_amount ?? "",
      r.amount_discounted ?? "",
      r.final_amount ?? "",
      r.currency ?? "",
      r.payment_reference ?? "",
      r.confirmed_via ?? "",
    ]);
    const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "coupon-redemptions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Coupon audit log</CardTitle>
          <CardDescription>Every redemption with the user, code, discount and final charged amount.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search by code, tier, user email or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No coupon redemptions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  {["Date", "User", "Code", "Tier", "Original", "Discount", "Charged", "Reference", "Source"].map((h) => (
                    <th key={h} className="text-left font-medium py-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{emails[r.user_id] || r.user_id.slice(0, 8)}</td>
                    <td className="py-2 pr-3 font-medium">{r.code ?? "—"}</td>
                    <td className="py-2 pr-3">{r.tier_key ?? "—"}</td>
                    <td className="py-2 pr-3">{money(r.original_amount, r.currency)}</td>
                    <td className="py-2 pr-3 text-destructive">-{Number(r.amount_discounted ?? 0).toFixed(2)}</td>
                    <td className="py-2 pr-3 font-semibold">{money(r.final_amount, r.currency)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.payment_reference ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={r.confirmed_via === "webhook" ? "default" : "outline"}>{r.confirmed_via ?? "verify"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
