/**
 * Tydigo Collector Assignment Service
 *
 * Server-validated collector job lifecycle:
 * getOffers → acceptAssignment → rejectAssignment →
 * markEnRoute → markArrived → verifyPickup → markWastePicked
 *
 * All mutations validate the collector is authorized and the
 * transition is valid before executing.
 */

import { supabase, isSupabaseAvailable, generateId } from "@/lib/supabase";
import { canTransition, type PickupStatus } from "./pickup-status";

// ─── Types ────────────────────────────────────────────────────

export type CollectorOffer = {
  id: string;
  pickupRequestId: string;
  pickupCode: string;
  wasteType: string;
  estimatedWeightKg: number;
  address: string;
  pickupLat: number | null;
  pickupLng: number | null;
  scheduleWindow: string;
  distanceKm: number | null;
  estimatedArrivalMinutes: number | null;
  estimatedEarningsNgn: number;
  status: "offered" | "accepted" | "rejected" | "expired" | "cancelled" | "superseded";
  createdAt: string;
};

export type ActiveJob = {
  assignmentId: string;
  pickupId: string;
  pickupCode: string;
  wasteType: string;
  estimatedWeightKg: number;
  actualWeightKg: number | null;
  address: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupInstructions: string | null;
  scheduleWindow: string;
  status: PickupStatus;
  paymentStatus: string;
  finalTotalNgn: number;
  customerName: string;
  customerPhone: string | null;
  distanceKm: number | null;
  estimatedArrivalMinutes: number | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  verificationCode: string | null;
};

// ─── Get Collector Offers ─────────────────────────────────────

export async function getCollectorOffers(profileId: string): Promise<CollectorOffer[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("collector_assignments")
    .select(`
      id,
      pickup_request_id,
      distance_km,
      estimated_arrival_minutes,
      status,
      created_at,
      pickup_requests!inner(
        pickup_code,
        waste_type,
        estimated_weight_kg,
        pickup_address,
        pickup_lat,
        pickup_lng,
        requested_window,
        final_total_ngn
      )
    `)
    .eq("collector_id", profileId)
    .eq("status", "offered")
    .order("created_at", { ascending: false })
    .limit(20);

  return ((data || []) as unknown as Array<{
    id: string;
    pickup_request_id: string;
    distance_km: number | null;
    estimated_arrival_minutes: number | null;
    status: string;
    created_at: string;
    pickup_requests: {
      pickup_code: string;
      waste_type: string;
      estimated_weight_kg: number;
      pickup_address: string;
      pickup_lat: number | null;
      pickup_lng: number | null;
      requested_window: string;
      final_total_ngn: number;
    };
  }>).map((row) => ({
    id: row.id,
    pickupRequestId: row.pickup_request_id,
    pickupCode: row.pickup_requests.pickup_code,
    wasteType: row.pickup_requests.waste_type,
    estimatedWeightKg: row.pickup_requests.estimated_weight_kg,
    address: row.pickup_requests.pickup_address,
    pickupLat: row.pickup_requests.pickup_lat,
    pickupLng: row.pickup_requests.pickup_lng,
    scheduleWindow: row.pickup_requests.requested_window,
    distanceKm: row.distance_km,
    estimatedArrivalMinutes: row.estimated_arrival_minutes,
    estimatedEarningsNgn: row.pickup_requests.final_total_ngn,
    status: row.status as CollectorOffer["status"],
    createdAt: row.created_at,
  }));
}

// ─── Accept Assignment ────────────────────────────────────────

export async function acceptAssignment(
  assignmentId: string,
  profileId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  // Delegate to the server-authoritative atomic RPC. This uses row-level
  // locking (FOR UPDATE) to guarantee ONE pickup → ONE active accepted
  // assignment, superseding competing offers and emitting domain events
  // inside a single transaction. The client must NOT perform this as a
  // sequence of separate queries (that would be race-prone).
  const { data, error } = await supabase.rpc("accept_collector_assignment", {
    p_assignment_id: assignmentId,
    p_collector_id: profileId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };
  if (!result?.success) {
    return { success: false, error: result?.error || "Unable to accept this offer" };
  }

  return { success: true };
}

// ─── Reject Assignment ────────────────────────────────────────

export async function rejectAssignment(
  assignmentId: string,
  profileId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { error } = await supabase
    .from("collector_assignments")
    .update({ status: "rejected", cancelled_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("collector_id", profileId)
    .eq("status", "offered");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ─── Get Current Active Job ───────────────────────────────────

export async function getCurrentJob(profileId: string): Promise<ActiveJob | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("collector_assignments")
    .select(`
      id,
      pickup_request_id,
      distance_km,
      estimated_arrival_minutes,
      accepted_at,
      arrived_at,
      pickup_requests!inner(
        id,
        pickup_code,
        waste_type,
        estimated_weight_kg,
        actual_weight_kg,
        pickup_address,
        pickup_lat,
        pickup_lng,
        pickup_instructions,
        requested_window,
        status,
        payment_status,
        final_total_ngn,
        verification_code,
        customer_id
      )
    `)
    .eq("collector_id", profileId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as {
    id: string;
    pickup_request_id: string;
    distance_km: number | null;
    estimated_arrival_minutes: number | null;
    accepted_at: string | null;
    arrived_at: string | null;
    pickup_requests: {
      id: string;
      pickup_code: string;
      waste_type: string;
      estimated_weight_kg: number;
      actual_weight_kg: number | null;
      pickup_address: string;
      pickup_lat: number | null;
      pickup_lng: number | null;
      pickup_instructions: string | null;
      requested_window: string;
      status: string;
      payment_status: string;
      final_total_ngn: number;
      verification_code: string | null;
      customer_id: string;
    };
  };

  // Get customer name
  const { data: customer } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", row.pickup_requests.customer_id)
    .maybeSingle();

  return {
    assignmentId: row.id,
    pickupId: row.pickup_requests.id,
    pickupCode: row.pickup_requests.pickup_code,
    wasteType: row.pickup_requests.waste_type,
    estimatedWeightKg: row.pickup_requests.estimated_weight_kg,
    actualWeightKg: row.pickup_requests.actual_weight_kg,
    address: row.pickup_requests.pickup_address,
    pickupLat: row.pickup_requests.pickup_lat,
    pickupLng: row.pickup_requests.pickup_lng,
    pickupInstructions: row.pickup_requests.pickup_instructions,
    scheduleWindow: row.pickup_requests.requested_window,
    status: row.pickup_requests.status as PickupStatus,
    paymentStatus: row.pickup_requests.payment_status,
    finalTotalNgn: row.pickup_requests.final_total_ngn,
    customerName: (customer as Record<string, unknown> | null)?.full_name as string || "Customer",
    customerPhone: (customer as Record<string, unknown> | null)?.phone as string || null,
    distanceKm: row.distance_km,
    estimatedArrivalMinutes: row.estimated_arrival_minutes,
    acceptedAt: row.accepted_at,
    arrivedAt: row.arrived_at,
    verificationCode: row.pickup_requests.verification_code,
  };
}

// ─── Mark En Route ────────────────────────────────────────────

export async function markEnRoute(
  pickupId: string,
  profileId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  // Verify collector is assigned to this pickup
  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("collector_id, status")
    .eq("id", pickupId)
    .maybeSingle();

  if (!pickup || pickup.collector_id !== profileId) {
    return { success: false, error: "Not authorized for this pickup" };
  }

  if (!canTransition(pickup.status as PickupStatus, "collector_en_route")) {
    return { success: false, error: `Cannot transition from ${pickup.status} to en_route` };
  }

  const now = new Date().toISOString();
  await supabase
    .from("pickup_requests")
    .update({ status: "collector_en_route", updated_at: now })
    .eq("id", pickupId);

  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    to_status: "collector_en_route",
    notes: "Collector is en route",
    created_at: now,
  });

  return { success: true };
}

// ─── Mark Arrived ─────────────────────────────────────────────

export async function markArrived(
  pickupId: string,
  profileId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("collector_id, status")
    .eq("id", pickupId)
    .maybeSingle();

  if (!pickup || pickup.collector_id !== profileId) {
    return { success: false, error: "Not authorized for this pickup" };
  }

  if (!canTransition(pickup.status as PickupStatus, "collector_arrived")) {
    return { success: false, error: `Cannot transition from ${pickup.status} to arrived` };
  }

  const now = new Date().toISOString();
  await supabase
    .from("pickup_requests")
    .update({
      status: "collector_arrived",
      collector_arrived_at: now,
      updated_at: now,
    })
    .eq("id", pickupId);

  // Update assignment
  await supabase
    .from("collector_assignments")
    .update({ arrived_at: now })
    .eq("pickup_request_id", pickupId)
    .eq("collector_id", profileId)
    .eq("status", "accepted");

  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    to_status: "collector_arrived",
    notes: "Collector has arrived",
    created_at: now,
  });

  return { success: true };
}

// ─── Verify Pickup ────────────────────────────────────────────

export async function verifyPickup(
  pickupId: string,
  profileId: string,
  data: {
    verificationCode?: string;
    actualWeightKg: number;
    notes?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("collector_id, status, verification_code")
    .eq("id", pickupId)
    .maybeSingle();

  if (!pickup || pickup.collector_id !== profileId) {
    return { success: false, error: "Not authorized for this pickup" };
  }

  if (!canTransition(pickup.status as PickupStatus, "pickup_verified")) {
    return { success: false, error: `Cannot transition from ${pickup.status} to verified` };
  }

  // If verification code is provided, validate it via RPC
  if (data.verificationCode) {
    const { data: validationResult, error: validationError } = await supabase.rpc(
      "validate_pickup_verification_code",
      {
        p_pickup_id: pickupId,
        p_code: data.verificationCode,
        p_validator_profile_id: profileId,
      },
    );

    if (validationError) {
      return { success: false, error: validationError.message };
    }

    const result = validationResult as Record<string, unknown>;
    if (!result.valid) {
      return { success: false, error: result.error as string };
    }

    // Verification code was valid — pickup already transitioned by RPC
    // Now update the actual weight
    const now = new Date().toISOString();
    await supabase
      .from("pickup_requests")
      .update({
        actual_weight_kg: data.actualWeightKg,
        updated_at: now,
      })
      .eq("id", pickupId);

    return { success: true };
  }

  // No verification code — direct verification (for cases where code isn't required)
  const now = new Date().toISOString();
  await supabase
    .from("pickup_requests")
    .update({
      status: "pickup_verified",
      actual_weight_kg: data.actualWeightKg,
      pickup_verified_at: now,
      updated_at: now,
    })
    .eq("id", pickupId);

  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    to_status: "pickup_verified",
    notes: data.notes || `Verified weight: ${data.actualWeightKg}kg`,
    created_at: now,
  });

  return { success: true };
}

// ─── Mark Waste Picked ────────────────────────────────────────

export async function markWastePicked(
  pickupId: string,
  profileId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("collector_id, status")
    .eq("id", pickupId)
    .maybeSingle();

  if (!pickup || pickup.collector_id !== profileId) {
    return { success: false, error: "Not authorized for this pickup" };
  }

  if (!canTransition(pickup.status as PickupStatus, "waste_picked")) {
    return { success: false, error: `Cannot transition from ${pickup.status} to waste_picked` };
  }

  const now = new Date().toISOString();
  await supabase
    .from("pickup_requests")
    .update({
      status: "waste_picked",
      waste_picked_at: now,
      updated_at: now,
    })
    .eq("id", pickupId);

  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    to_status: "waste_picked",
    notes: notes || "Waste collected",
    created_at: now,
  });

  return { success: true };
}

// ─── Complete Pickup ──────────────────────────────────────────

export async function completePickup(
  pickupId: string,
  profileId: string,
): Promise<{ success: boolean; error?: string; receipt?: unknown }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("collector_id, status, customer_id, waste_type, estimated_weight_kg, actual_weight_kg, final_total_ngn")
    .eq("id", pickupId)
    .maybeSingle();

  if (!pickup || pickup.collector_id !== profileId) {
    return { success: false, error: "Not authorized for this pickup" };
  }

  if (!canTransition(pickup.status as PickupStatus, "completed")) {
    return { success: false, error: `Cannot transition from ${pickup.status} to completed` };
  }

  const now = new Date().toISOString();

  // Update pickup
  await supabase
    .from("pickup_requests")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", pickupId);

  // Update assignment
  await supabase
    .from("collector_assignments")
    .update({ completed_at: now })
    .eq("pickup_request_id", pickupId)
    .eq("collector_id", profileId)
    .eq("status", "accepted");

  // Create status event
  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    to_status: "completed",
    notes: "Pickup completed",
    created_at: now,
  });

  // Create waste batch (idempotent — use pickup_id as unique key)
  const weight = (pickup.actual_weight_kg || pickup.estimated_weight_kg || 0) as number;
  const { data: existingBatch } = await supabase
    .from("waste_batches")
    .select("id")
    .contains("source_pickup_ids", [pickupId])
    .maybeSingle();

  if (!existingBatch) {
    await supabase.from("waste_batches").insert({
      id: generateId("wbt"),
      material_type: pickup.waste_type,
      quantity_kg: weight,
      source_pickup_ids: [pickupId],
      verified: true,
      created_at: now,
    });
  }

  // Generate receipt (idempotent)
  const receiptNumber = `TYD-RCP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data: existingReceipt } = await supabase
    .from("digital_receipts")
    .select("id")
    .eq("pickup_request_id", pickupId)
    .maybeSingle();

  let receipt = existingReceipt;
  if (!existingReceipt) {
    const { data: newReceipt } = await supabase
      .from("digital_receipts")
      .insert({
        pickup_request_id: pickupId,
        receipt_number: receiptNumber,
        issued_at: now,
      })
      .select("*")
      .maybeSingle();
    receipt = newReceipt;
  }

  return { success: true, receipt };
}
