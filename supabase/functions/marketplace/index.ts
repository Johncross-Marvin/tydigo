/**
 * Tydigo Marketplace Edge Function
 *
 * Server-side marketplace operations: create pickup, assign collector,
 * recalculate weight, generate receipt, award EcoPoints.
 *
 * Security: uses the service role key for all sensitive financial and
 * operational mutations, and verifies the caller is authorized for each
 * action before performing it.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupabaseClient = ReturnType<typeof createClient>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the service role key for all sensitive operations. The caller's
    // identity is still verified below via the user-scoped client.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify the caller is authenticated using their own JWT.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case "assign-collector": return await assignCollector(serviceClient, user.id, body);
      case "recalculate-weight": return await recalculateWeight(serviceClient, user.id, body);
      case "generate-receipt": return await generateReceipt(serviceClient, user.id, body);
      case "award-ecopoints": return await awardEcoPoints(serviceClient, user.id, body);
      case "complete-pickup": return await completePickup(serviceClient, user.id, body);
      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (err) {
    console.error("[marketplace] Error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

/**
 * Resolve the caller's profile id and role from their auth user id.
 */
async function getCallerProfile(
  client: SupabaseClient,
  authUserId: string,
): Promise<{ id: string; role: string } | null> {
  const { data } = await client
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data as { id: string; role: string } | null;
}

async function assignCollector(
  client: SupabaseClient,
  authUserId: string,
  body: { pickupId: string; collectorId: string; distanceKm: number; etaMinutes: number },
) {
  const caller = await getCallerProfile(client, authUserId);
  if (!caller) return json({ error: "Profile not found" }, 404);

  // Only admins may assign a collector to a pickup.
  if (caller.role !== "admin") {
    return json({ error: "Forbidden: only admins can assign collectors" }, 403);
  }

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

  return json({ ok: true });
}

async function recalculateWeight(
  client: SupabaseClient,
  authUserId: string,
  body: { pickupId: string; verifiedWeightKg: number },
) {
  const caller = await getCallerProfile(client, authUserId);
  if (!caller) return json({ error: "Profile not found" }, 404);

  // Only the assigned collector (or an admin) may verify the weight.
  const { data: pickup } = await client.from("pickup_requests")
    .select("collector_id, estimated_weight_kg, base_price_ngn, waste_modifier_ngn, platform_fee_ngn, ecopoints_discount_ngn")
    .eq("id", body.pickupId).maybeSingle();

  if (!pickup) {
    return json({ error: "Pickup not found" }, 404);
  }

  const p = pickup as Record<string, unknown>;
  const isAssignedCollector = p.collector_id === caller.id;
  if (!isAssignedCollector && caller.role !== "admin") {
    return json({ error: "Forbidden: only the assigned collector can verify weight" }, 403);
  }

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

  return json({
    ok: true,
    newTotal: Math.max(newTotal, 500),
    verifiedWeight: body.verifiedWeightKg,
  });
}

async function generateReceipt(
  client: SupabaseClient,
  authUserId: string,
  body: { pickupId: string },
) {
  const caller = await getCallerProfile(client, authUserId);
  if (!caller) return json({ error: "Profile not found" }, 404);

  // Only the customer who owns the pickup (or an admin) may generate a receipt.
  const { data: pickup } = await client.from("pickup_requests")
    .select("customer_id")
    .eq("id", body.pickupId).maybeSingle();

  if (!pickup) return json({ error: "Pickup not found" }, 404);

  const isOwner = (pickup as { customer_id: string }).customer_id === caller.id;
  if (!isOwner && caller.role !== "admin") {
    return json({ error: "Forbidden: only the pickup owner can generate a receipt" }, 403);
  }

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
    return json({ receipt: existing });
  }

  return json({ receipt: data });
}

async function awardEcoPoints(
  client: SupabaseClient,
  authUserId: string,
  body: { pickupId: string; profileId: string; points: number; reason: string },
) {
  const caller = await getCallerProfile(client, authUserId);
  if (!caller) return json({ error: "Profile not found" }, 404);

  // Only admins may award EcoPoints on behalf of another profile.
  if (caller.role !== "admin") {
    return json({ error: "Forbidden: only admins can award EcoPoints" }, 403);
  }

  // Use the atomic award_ecopoints RPC for wallet tracking, idempotency,
  // and balance reconciliation. Never insert directly into ecopoint_transactions.
  const idempotencyKey = `marketplace_${body.pickupId}_${body.profileId}`;
  const { data: txnId, error } = await client.rpc("award_ecopoints", {
    p_profile_id: body.profileId,
    p_points: body.points,
    p_transaction_type: "earn",
    p_source_type: "pickup",
    p_source_id: body.pickupId,
    p_idempotency_key: idempotencyKey,
    p_description: body.reason,
    p_status: "confirmed",
  });

  if (error) {
    console.error("[marketplace] award_ecopoints RPC error:", error);
    return json({ error: "Failed to award EcoPoints" }, 500);
  }

  return json({ ok: true, pointsAwarded: body.points, transactionId: txnId });
}

async function completePickup(
  client: SupabaseClient,
  authUserId: string,
  body: { pickupId: string },
) {
  const caller = await getCallerProfile(client, authUserId);
  if (!caller) return json({ error: "Profile not found" }, 404);

  // Only the assigned collector (or an admin) may complete a pickup.
  const { data: pickup } = await client.from("pickup_requests")
    .select("collector_id")
    .eq("id", body.pickupId).maybeSingle();

  if (!pickup) return json({ error: "Pickup not found" }, 404);

  const isAssignedCollector = (pickup as { collector_id: string }).collector_id === caller.id;
  if (!isAssignedCollector && caller.role !== "admin") {
    return json({ error: "Forbidden: only the assigned collector can complete the pickup" }, 403);
  }

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

  return json({ ok: true, receiptNumber });
}
