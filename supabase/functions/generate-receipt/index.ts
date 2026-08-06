/**
 * Edge Function: generate-receipt
 * 
 * Generates a digital receipt after pickup completion.
 * Creates receipt record and optionally generates PDF.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TYD-${date}-${random}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pickupRequestId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch pickup details
    const { data: pickup } = await supabase
      .from("pickup_requests")
      .select("*, profiles!pickup_requests_customer_id_fkey(full_name, phone)")
      .eq("id", pickupRequestId)
      .single();

    if (!pickup) throw new Error("Pickup not found");

    const receiptNumber = generateReceiptNumber();

    // Create receipt record
    const { data: receipt, error } = await supabase
      .from("digital_receipts")
      .insert({
        pickup_request_id: pickupRequestId,
        receipt_number: receiptNumber,
        pdf_url: null,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Award EcoPoints for completed pickup
    const pointsToAward = Math.max(100, Math.round((pickup.final_total_ngn || pickup.total_amount || 0) * 0.10));
    await supabase.from("ecopoint_transactions").insert({
      profile_id: pickup.customer_id,
      pickup_id: pickupRequestId,
      points: pointsToAward,
      reason: "Pickup completed reward",
      status: "confirmed",
      created_at: new Date().toISOString(),
    });

    // Update profile EcoPoints balance
    await supabase.rpc("award_ecopoints_on_payment", {
      profile_id_param: pickup.customer_id,
      points_to_add: pointsToAward,
    });

    // Send receipt notification
    await supabase.from("notifications").insert({
      recipient_id: pickup.customer_id,
      type: "receipt_ready",
      title: "Receipt Ready",
      body: `Your receipt #${receiptNumber} for pickup is ready.`,
      data: { receipt_id: receipt.id, pickup_id: pickupRequestId },
    });

    return new Response(JSON.stringify({
      receipt,
      ecoPointsAwarded: pointsToAward,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
