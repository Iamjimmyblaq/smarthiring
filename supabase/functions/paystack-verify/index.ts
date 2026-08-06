import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getPaystackConfig } from "../_shared/paystack.ts";
import { provisionPaidPlan } from "../_shared/provision.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const config = await getPaystackConfig();
    if (!config.secretKey) return json({ error: "Payments are not configured yet." }, 500);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${config.secretKey}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== "success") {
      console.error("Paystack verify failed", { reference, response: data });
      return json({ error: "Payment could not be verified. Please contact support." }, 400);
    }

    const meta = data.data?.metadata ?? {};
    const metaUserId = meta.user_id;
    if (!metaUserId || metaUserId !== user.id) {
      console.error("Paystack metadata user mismatch", { reference, metaUserId, userId: user.id });
      return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the tier the customer actually paid for. The Paystack webhook is
    // the primary source of truth; this path is the fallback for the redirect.
    const tierKey: string = meta.tier_key || meta.plan || "pro";
    const result = await provisionPaidPlan(admin, {
      userId: user.id,
      tierKey,
      reference,
      customerCode: data.data?.customer?.customer_code ?? null,
      currency: data.data?.currency ?? null,
      amountPaidMajor: Number(data.data?.amount ?? 0) / 100,
      metadata: meta,
      confirmedVia: "verify",
    });

    return json({ success: true, plan: result.plan, plan_name: result.plan_name });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
