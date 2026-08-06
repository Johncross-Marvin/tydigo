/**
 * Tydigo Marketplace Edge Function
 *
 * Server-side marketplace operations: create pickup, assign collector,
 * recalculate weight, generate receipt, award EcoPoints.
 */

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case "assign-collector": return await assignCollector(supabaseClient, body);
      case "recalculate-weight": return await recalculateWeight(supabaseClient, body);
      case "generate-receipt": return await generateReceipt(supabaseClient, body);
      case "award-ecopoints": return await awardEcoPoints(supabaseClient, body);
      case "complete-pickup": return await completePickup(supabaseClient, body);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[marketplace] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function assignCollector(
  client: ReturnType<typeof createClient>,
  body: { pickupId: string; collectorId: string; distanceKm: number; etaMinutes: number },
) {
  const now = new Date().toISOString();

  await client.from("collector_assignments").insert({
    pickup_request_id: body.pickupId,
    collector_id: body.collectorId,
    distance_km: body.distanceKm,
    estimated_arrival_minutes: body.etaMinutes,
    accepted_at: now,
  });

  await client.from("pickup_requests").update({
    collector_id: body.collectorId,
    collector_assigned_at: now,
    status: "collector_assigned",
    updated_at: now,
  }).eq("id", body.pickupId);

  await client.from("pickup_status_events").insert({
    pickup_id: body.pickupId,
    to_status: "collector_assigned",
    notes: `Collector assigned (${body.distanceKm}km, ~${body.etaMinutes}min)`,
    created_at: now,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function recalculateWeight(
  client: ReturnType<typeof createClient>,
  body: { pickupId: string; verifiedWeightKg: number },
) {
  const { data: pickup } = await client.from("pickup_requests")
    .select("estimated_weight_kg, base_price_ngn, waste_modifier_ngn, platform_fee_ngn, ecopoints_discount_ngn")
    .eq("id", body.pickupId).maybeSingle();

  if (!pickup) {
    return new Response(JSON.stringify({ error: "Pickup not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const p = pickup as Record<string, unknown>;
  const oldWeight = (p.estimated_weight_kg as number) || 0;
  const ratio = oldWeight > 0 ? body.verifiedWeightKg / oldWeight : 1;

  const newBase = Math.round(((p.base_price_ngn as number) || 0) * ratio);
  const newModifier = Math.round(((p.waste_modifier_ngn as number) || 0) * ratio);
  const newPlatform = Math.round(((p.platform_fee_ngn as number) || 0) * ratio);
  const newTotal = newBase + newModifier + newPlatform - ((p.ecopoints_discount_ngn as number) || 0);

  const now = new Date().toISOString();
  await client.from("pickup_requests").update({
    actual_weight_kg: body.verifiedWeightKg,
    base_price_ngn: newBase,
    waste_modifier_ngn: newModifier,
    platform_fee_ngn: newPlatform,
    final_total_ngn: Math.max(newTotal, 500),
    updated_at: now,
  }).eq("id", body.pickupId);

  await client.from("pickup_status_events").insert({
    pickup_id: body.pickupId,
    to_status: "pickup_verified",
    notes: `Weight verified: ${body.verifiedWeightKg}kg (was ${oldWeight}kg)`,
    created_at: now,
  });

  return new Response(JSON.stringify({
    ok: true,
    newTotal: Math.max(newTotal, 500),
    verifiedWeight: body.verifiedWeightKg,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function generateReceipt(
  client: ReturnType<typeof createClient>,
  body: { pickupId: string },
) {
  const receiptNumber = `TYD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const { data, error } = await client.from("digital_receipts").insert({
    pickup_request_id: body.pickupId,
    receipt_number: receiptNumber,
    issued_at: now,
  }).select().maybeSingle();

  if (error) {
    const { data: existing } = await client.from("digital_receipts")
      .select("*").eq("pickup_request_id", body.pickupId).maybeSingle();
    return new Response(JSON.stringify({ receipt: existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ receipt: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function awardEcoPoints(
  client: ReturnType<typeof createClient>,
  body: { pickupId: string; profileId: string; points: number; reason: string },
) {
  const now = new Date().toISOString();

  await client.from("ecopoint_transactions").insert({
    profile_id: body.profileId,
    pickup_id: body.pickupId,
    points: body.points,
    reason: body.reason,
    status: "confirmed",
    created_at: now,
  });

  const { data: profile } = await client.from("profiles")
    .select("ecopoints").eq("id", body.profileId).maybeSingle();

  if (profile) {
    const p = profile as Record<string, unknown>;
    await client.from("profiles").update({
      ecopoints: ((p.ecopoints as number) || 0) + body.points,
      updated_at: now,
    }).eq("id", body.profileId);
  }

  return new Response(JSON.stringify({ ok: true, pointsAwarded: body.points }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function completePickup(
  client: ReturnType<typeof createClient>,
  body: { pickupId: string },
) {
  const now = new Date().toISOString();

  await client.from("pickup_requests").update({
    status: "completed",
    completed_at: now,
    updated_at: now,
  }).eq("id", body.pickupId);

  await client.from("pickup_status_events").insert({
    pickup_id: body.pickupId,
    to_status: "completed",
    notes: "Pickup completed successfully",
    created_at: now,
  });

  // Generate receipt
  const receiptNumber = `TYD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  await client.from("digital_receipts").insert({
    pickup_request_id: body.pickupId,
    receipt_number: receiptNumber,
    issued_at: now,
  });

  return new Response(JSON.stringify({ ok: true, receiptNumber }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
