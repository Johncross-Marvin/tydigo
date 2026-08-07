import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find pending transactions that have expired
    const { data: expiredTxns, error: findError } = await supabaseAdmin
      .from("ecopoint_transactions")
      .select("id, profile_id, points")
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (findError) {
      console.error("[ecopoints-expire] Error finding expired transactions:", findError);
      return new Response(JSON.stringify({ error: findError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expiredCount = 0;

    for (const txn of expiredTxns || []) {
      // Mark transaction as expired
      const { error: updateError } = await supabaseAdmin
        .from("ecopoint_transactions")
        .update({ status: "expired" })
        .eq("id", txn.id);

      if (updateError) {
        console.error("[ecopoints-expire] Error expiring transaction:", updateError);
        continue;
      }

      // Update wallet pending_points
      const { error: walletError } = await supabaseAdmin.rpc("reverse_ecopoints", {
        p_transaction_id: txn.id,
        p_reason: "Points expired",
      });

      if (walletError) {
        console.error("[ecopoints-expire] Error reversing expired points:", walletError);
      } else {
        expiredCount++;
      }
    }

    console.log(`[ecopoints-expire] Expired ${expiredCount} transactions`);

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ecopoints-expire] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
