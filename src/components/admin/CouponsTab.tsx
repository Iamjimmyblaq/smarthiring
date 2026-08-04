import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  headline: string | null;
  discount_type: string;
  discount_value: number;
  applies_to_tiers: string[];
  max_redemptions: number | null;
  redemption_count: number;
  valid_until: string | null;
  is_active: boolean;
  show_on_home: boolean;
}

interface Tier { key: string; name: string; price_amount: number; currency: string }

const randomCode = () =>
  `SH${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function discountedAmount(coupon: Coupon, amount: number) {
  const value = Number(coupon.discount_value) || 0;
  const off = coupon.discount_type === "percent" ? (amount * value) / 100 : value;
  return Math.max(0, Math.round((amount - off) * 100) / 100);
}

export default function CouponsTab({ tiers }: { tiers: Tier[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCoupons(((data ?? []) as Coupon[]).map((c) => ({ ...c, applies_to_tiers: c.applies_to_tiers ?? [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, p: Partial<Coupon>) =>
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const create = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("coupons").insert({
      code: randomCode(),
      description: "Launch promotion",
      headline: "Save on your first month",
      discount_type: "percent",
      discount_value: 20,
      applies_to_tiers: tiers.filter((t) => Number(t.price_amount) > 0).map((t) => t.key),
      created_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Coupon created");
    load();
  };

  const save = async (c: Coupon) => {
    setSaving(c.id);
    const { error } = await supabase.from("coupons").update({
      code: c.code.trim().toUpperCase(),
      description: c.description,
      headline: c.headline,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value) || 0,
      applies_to_tiers: c.applies_to_tiers,
      max_redemptions: c.max_redemptions,
      valid_until: c.valid_until,
      is_active: c.is_active,
      show_on_home: c.show_on_home,
    }).eq("id", c.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${c.code} saved`);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleTier = (c: Coupon, key: string) => {
    const next = c.applies_to_tiers.includes(key)
      ? c.applies_to_tiers.filter((t) => t !== key)
      : [...c.applies_to_tiers, key];
    patch(c.id, { applies_to_tiers: next });
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Generate promo codes, pick which subscription tiers they apply to, and optionally feature them on the home page.
        </p>
        <Button size="sm" className="gap-2" onClick={create}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      {coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet.</p>}

      {coupons.map((c) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4" /> {c.code}
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Paused"}</Badge>
                {c.show_on_home && <Badge variant="outline">On home page</Badge>}
              </CardTitle>
              <CardDescription>
                {c.redemption_count} redeemed{c.max_redemptions ? ` of ${c.max_redemptions}` : ""} ·{" "}
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `${c.discount_value} off`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Delete ${c.code}`} onClick={() => remove(c.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={c.code} onChange={(e) => patch(c.id, { code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount type</Label>
                <Select value={c.discount_type} onValueChange={(v) => patch(c.id, { discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount value</Label>
                <Input type="number" min={0} value={c.discount_value}
                  onChange={(e) => patch(c.id, { discount_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max redemptions</Label>
                <Input type="number" min={0} placeholder="Unlimited"
                  value={c.max_redemptions ?? ""}
                  onChange={(e) => patch(c.id, { max_redemptions: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expires</Label>
                <Input type="date"
                  value={c.valid_until ? c.valid_until.slice(0, 10) : ""}
                  onChange={(e) => patch(c.id, { valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Home page headline</Label>
                <Input value={c.headline ?? ""} placeholder="Save 20% on Pro"
                  onChange={(e) => patch(c.id, { headline: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={c.description ?? ""} onChange={(e) => patch(c.id, { description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Applies to tiers</Label>
              <div className="flex flex-wrap gap-2">
                {tiers.length === 0 && <p className="text-xs text-muted-foreground">No tiers configured.</p>}
                {tiers.map((t) => {
                  const on = c.applies_to_tiers.includes(t.key);
                  const price = Number(t.price_amount) || 0;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggleTier(c, t.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t.name} · {t.currency} {price.toLocaleString()}
                      {on && price > 0 && (
                        <span className="ml-1 font-semibold">→ {t.currency} {discountedAmount(c, price).toLocaleString()}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Tap a tier to include it. Preview shows the discounted price.</p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id={`active-${c.id}`} checked={c.is_active} onCheckedChange={(v) => patch(c.id, { is_active: v })} />
                <Label htmlFor={`active-${c.id}`} className="text-xs text-muted-foreground">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`home-${c.id}`} checked={c.show_on_home} onCheckedChange={(v) => patch(c.id, { show_on_home: v })} />
                <Label htmlFor={`home-${c.id}`} className="text-xs text-muted-foreground">Show on home page</Label>
              </div>
              <Button className="gap-2" onClick={() => save(c)} disabled={saving === c.id}>
                {saving === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save coupon
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}