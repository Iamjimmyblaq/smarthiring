import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useIsAdmin";

const ROLES: AppRole[] = ["member", "recruiter", "admin", "super_admin"];

const GROUPS: { label: string; permissions: string[] }[] = [
  { label: "Jobs", permissions: ["view_jobs", "create_jobs", "delete_jobs"] },
  { label: "Candidates", permissions: ["upload_resumes", "view_candidates", "edit_candidate_name", "move_candidate_stage", "delete_candidates"] },
  { label: "Interviews & offers", permissions: ["schedule_interviews", "run_ai_interviews", "view_offers", "create_offers", "manage_onboarding"] },
  { label: "Platform", permissions: ["export_data", "use_api", "manage_billing", "manage_team", "manage_coupons", "manage_users", "manage_platform_settings"] },
];

const label = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

interface Row { id: string; role: AppRole; permission: string; allowed: boolean }

export default function RolePermissionsMatrix() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("role_permissions").select("id, role, permission, allowed");
      if (error) toast.error(error.message);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const byKey = useMemo(() => {
    const map: Record<string, Row> = {};
    rows.forEach((r) => { map[`${r.role}:${r.permission}`] = r; });
    return map;
  }, [rows]);

  const toggle = (role: AppRole, permission: string, allowed: boolean) => {
    const row = byKey[`${role}:${permission}`];
    if (!row) return;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, allowed } : r)));
    setDirty((d) => ({ ...d, [row.id]: true }));
  };

  const save = async () => {
    const changed = rows.filter((r) => dirty[r.id]);
    if (changed.length === 0) return toast.info("No changes to save");
    setSaving(true);
    for (const r of changed) {
      const { error } = await supabase.from("role_permissions").update({ allowed: r.allowed }).eq("id", r.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    setDirty({});
    toast.success("Role permissions updated");
  };

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Role permissions matrix
          </CardTitle>
          <CardDescription>Define exactly what each role can do across SmartHire.</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save matrix
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="p-3 font-medium">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="p-3 font-medium text-center capitalize">{r.replace("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.label}>
                <tr className="border-t bg-muted/30">
                  <td colSpan={ROLES.length + 1} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((permission) => (
                  <tr key={permission} className="border-t">
                    <td className="p-3">{label(permission)}</td>
                    {ROLES.map((role) => {
                      const row = byKey[`${role}:${permission}`];
                      return (
                        <td key={role} className="p-3 text-center">
                          <Switch
                            checked={Boolean(row?.allowed)}
                            disabled={!row || role === "super_admin"}
                            onCheckedChange={(v) => toggle(role, permission, v)}
                            aria-label={`${label(permission)} for ${role}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}