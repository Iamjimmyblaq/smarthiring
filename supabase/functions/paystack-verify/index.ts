import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return json({ error: "Paystack not configured" }, 500);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== "success") {
      return json({ error: "Payment not successful", details: data }, 400);
    }

    const metaUserId = data.data?.metadata?.user_id;
    if (metaUserId && metaUserId !== user.id) {
      return json({ error: "User mismatch" }, 403);
    }

    // Upgrade plan via service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: upErr } = await admin
      .from("user_plans")
      .upsert(
        {
          user_id: user.id,
          plan: "pro",
          current_period_end: periodEnd.toISOString(),
          stripe_customer_id: data.data?.customer?.customer_code ?? null,
          stripe_subscription_id: reference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ success: true, plan: "pro" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}