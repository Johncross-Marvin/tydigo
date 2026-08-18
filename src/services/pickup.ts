/**
 * Tydigo Pickup Service
 *
 * Full pickup lifecycle: create, read, update, status events,
 * multi-item support, image uploads, and tracking.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { api as mockApi, type Pickup } from "@/lib/api";
import { calculatePrice, type WasteType, type PriceBreakdown } from "./pricing";
import type { AuthUser } from "./auth";

// ─── Types ────────────────────────────────────────────────────

export type PickupDraftInput = {
  wasteType: WasteType;
  estimatedWeightKg: number;
  sortingStatus: "properly_sorted" | "partially_sorted" | "not_sorted";
  photoPath?: string;
  address: string;
  addressLabel?: string;
  pickupInstructions?: string;
  scheduleWindow: string;
  ecopointsToApply: number;
  paymentMethod: "card" | "ecopoints" | "transfer";
};

export type PickupItemInput = {
  wasteCategoryId: string;
  estimatedWeightKg: number;
  notes?: string;
};

export type CreatedPickup = {
  id: string;
  pickupCode: string;
  wasteType: string;
  estimatedWeightKg: number;
  address: string;
  status: string;
  paymentStatus: string;
  priceBreakdown: PriceBreakdown;
  finalTotalNgn: number;
  createdAt: string;
};

// ─── Profile Resolution ───────────────────────────────────────

async function resolveProfileId(authUserId: string): Promise<string> {
  if (!isSupabaseAvailable() || !supabase) return authUserId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return profile?.id || authUserId;
}

// ─── Create Pickup ────────────────────────────────────────────

export async function createPickup(
  user: AuthUser,
  draft: PickupDraftInput,
  idempotencyKey?: string,
  serverPricing?: PriceBreakdown,
): Promise<CreatedPickup> {
  // Prefer server-authoritative pricing when provided; otherwise fall back to
  // a client-side estimate (mock/offline mode only).
  const pricing = serverPricing ?? calculatePrice({
    weightKg: draft.estimatedWeightKg,
    wasteType: draft.wasteType,
    ecopointsToApply: draft.ecopointsToApply,
  });

  if (isSupabaseAvailable() && supabase) {
    const profileId = await resolveProfileId(user.id);
    const dbWasteType = mapWasteTypeToDb(draft.wasteType);
    const key = idempotencyKey || `pickup_${profileId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Use idempotent RPC for atomic creation
    const { data, error } = await supabase.rpc("create_pickup_idempotent", {
      p_idempotency_key: key,
      p_customer_id: profileId,
      p_waste_type: dbWasteType,
      p_estimated_weight_kg: draft.estimatedWeightKg,
      p_pickup_address: draft.address,
      p_pickup_instructions: draft.pickupInstructions || null,
      p_requested_window: draft.scheduleWindow,
      p_sorting_verified: draft.sortingStatus === "properly_sorted",
      p_base_price_ngn: pricing.basePriceNgn,
      p_waste_modifier_ngn: pricing.wasteModifierNgn,
      p_platform_fee_ngn: pricing.platformFeeNgn,
      p_ecopoints_discount_ngn: pricing.ecopointsDiscountNgn,
      p_final_total_ngn: pricing.finalTotalNgn,
      p_payment_method: draft.paymentMethod,
      p_ecopoints_to_apply: pricing.ecopointsApplied,
    });

    if (error) throw new Error(error.message);

    const result = data as Record<string, unknown>;
    const now = new Date().toISOString();

    return {
      id: result.id as string,
      pickupCode: result.pickup_code as string,
      wasteType: draft.wasteType,
      estimatedWeightKg: draft.estimatedWeightKg,
      address: draft.address,
      status: result.status as string,
      paymentStatus: result.payment_status as string,
      priceBreakdown: pricing,
      finalTotalNgn: pricing.finalTotalNgn,
      createdAt: (result.created_at as string) || now,
    };
  }

  // Mock fallback
  const { pickup } = await mockApi.createPickup({
    wasteType: draft.wasteType,
    weightKg: draft.estimatedWeightKg,
    address: draft.address,
    scheduleWindow: draft.scheduleWindow,
    paymentMethod: draft.paymentMethod,
  });

  return {
    id: pickup.id,
    pickupCode: pickup.pickup_code,
    wasteType: pickup.waste_type,
    estimatedWeightKg: pickup.weight_kg,
    address: pickup.address,
    status: pickup.status,
    paymentStatus: pickup.payment_status,
    priceBreakdown: pricing,
    finalTotalNgn: pickup.price_ngn,
    createdAt: pickup.created_at,
  };
}

// ─── Multi-Item Pickup ────────────────────────────────────────

export async function createPickupWithItems(
  user: AuthUser,
  draft: PickupDraftInput,
  items: PickupItemInput[],
): Promise<CreatedPickup> {
  const result = await createPickup(user, draft);

  if (isSupabaseAvailable() && supabase && items.length > 0) {
    const inserts = items.map((item) => ({
      pickup_request_id: result.id,
      waste_category_id: item.wasteCategoryId,
      estimated_weight_kg: item.estimatedWeightKg,
      notes: item.notes || null,
    }));
    await supabase.from("pickup_items").insert(inserts);
  }

  return result;
}

// ─── Get Pickups ──────────────────────────────────────────────

export async function getCustomerPickups(userId: string): Promise<Pickup[]> {
  if (isSupabaseAvailable() && supabase) {
    const profileId = await resolveProfileId(userId);
    const { data, error } = await supabase
      .from("pickup_requests")
      .select("*")
      .or(`customer_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data || []).map(mapDbPickupToPickup);
  }

  const { pickups } = await mockApi.listPickups();
  return pickups;
}

export async function getActivePickup(userId: string): Promise<Pickup | null> {
  if (isSupabaseAvailable() && supabase) {
    const profileId = await resolveProfileId(userId);
    const { data, error } = await supabase
      .from("pickup_requests")
      .select("*")
      .or(`customer_id.eq.${profileId}`)
      .in("status", [
        "requested", "matching_collector", "collector_assigned",
        "collector_en_route", "collector_arrived", "pickup_verified",
        "waste_picked", "in_transit_to_destination", "delivered_to_partner",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data ? mapDbPickupToPickup(data) : null;
  }

  return null;
}

export async function getPickupById(pickupId: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("pickup_requests")
    .select(`
      *,
      items:pickup_items(*, waste_category:waste_category_id(name, icon)),
      images:pickup_images(*),
      assignment:collector_assignments(*),
      receipt:digital_receipts(*)
    `)
    .eq("id", pickupId)
    .maybeSingle();

  return data;
}

// ─── Status Updates ───────────────────────────────────────────

export async function updatePickupStatus(
  pickupId: string,
  newStatus: string,
  notes?: string,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from("pickup_requests")
    .select("status")
    .eq("id", pickupId)
    .maybeSingle();

  const fromStatus = (current as Record<string, unknown> | null)?.status || null;

  const updates: Record<string, unknown> = { status: newStatus, updated_at: now };

  if (newStatus === "collector_arrived") updates.collector_arrived_at = now;
  if (newStatus === "completed") updates.completed_at = now;
  if (newStatus === "cancelled") updates.cancelled_at = now;

  await supabase.from("pickup_requests").update(updates).eq("id", pickupId);

  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupId,
    from_status: fromStatus,
    to_status: newStatus,
    notes: notes || null,
    created_at: now,
  });
}

// ─── Upload Pickup Photo ──────────────────────────────────────

export async function uploadPickupPhoto(
  userId: string,
  pickupId: string,
  file: File,
): Promise<string> {
  if (isSupabaseAvailable() && supabase) {
    const fileName = `${userId}/${pickupId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("waste-photos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(error.message);

    // waste-photos is a PRIVATE bucket. Use a signed URL for authorized reads,
    // never a permanent public URL.
    const { data: signedData } = await supabase.storage
      .from("waste-photos")
      .createSignedUrl(data.path, 3600); // 1 hour

    const signedUrl = signedData?.signedUrl || "";

    // Record in pickup_images (store the path, not a permanent URL)
    await supabase.from("pickup_images").insert({
      pickup_request_id: pickupId,
      image_url: signedUrl,
      storage_path: data.path,
    });

    return signedUrl;
  }

  return URL.createObjectURL(file);
}

// ─── Helpers ──────────────────────────────────────────────────

function mapWasteTypeToDb(wasteType: WasteType): string {
  const mapping: Record<string, string> = {
    plastic: "plastic", organic: "organic", general_waste: "general_waste",
    paper_cardboard: "paper_cardboard", metal_cans: "metal_cans",
    glass: "glass", e_waste: "e_waste", mixed_waste: "mixed_waste",
  };
  return mapping[wasteType] || "general_waste";
}

function mapDbPickupToPickup(db: Record<string, unknown>): Pickup {
  return {
    id: db.id as string,
    waste_type: db.waste_type as string,
    weight_kg: (db.estimated_weight_kg || db.weight_kg || 0) as number,
    address: (db.pickup_address || db.address || "") as string,
    schedule_window: (db.requested_window || db.schedule_window || "today") as string,
    payment_method: (db.payment_method || "card") as string,
    payment_status: (db.payment_status || "pending") as string,
    price_ngn: (db.final_total_ngn || db.price_ngn || 0) as number,
    status: db.status as string,
    pickup_code: db.pickup_code as string,
    collector_name: (db.collector_name || "Unassigned") as string,
    eta_minutes: db.eta_minutes as number | null | undefined,
    created_at: db.created_at as string,
    updated_at: db.updated_at as string,
  };
}

// ─── Waste Batch Creation ─────────────────────────────────────

export async function createWasteBatch(pickupId: string) {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("customer_id, collector_id, waste_type, estimated_weight_kg, actual_weight_kg, pickup_code, pickup_address")
    .eq("id", pickupId)
    .maybeSingle();
  if (!pickup) return null;
  const weight = (pickup.actual_weight_kg || pickup.estimated_weight_kg || 0) as number;

  // The waste_batches table uses `source_pickup_ids` (UUID array) to reference
  // source pickups, NOT a `pickup_id` column. It also has no `customer_id`
  // column — the chain-of-custody owner is `partner_id` (the receiving partner).
  // We create a batch with the source pickup referenced in the array, leaving
  // `partner_id` null until a destination/partner is assigned downstream.
  const { data } = await supabase
    .from("waste_batches")
    .insert({
      material_type: pickup.waste_type,
      quantity_kg: weight,
      quality_grade: "standard",
      source_pickup_ids: [pickupId],
      source_zone: pickup.pickup_address || null,
      verified: false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  return data;
}

// ─── Receipt Generation ───────────────────────────────────────

export async function generatePickupReceipt(pickupId: string) {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select("*")
    .eq("id", pickupId)
    .maybeSingle();
  if (!pickup) return null;
  const receiptNumber = `TYD-RCP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data } = await supabase
    .from("digital_receipts")
    .insert({
      pickup_request_id: pickupId,
      receipt_number: receiptNumber,
      issued_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();
  return data;
}

// ─── Complete Pickup (atomic) ─────────────────────────────────

export async function completePickup(pickupId: string) {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Not available");
  const now = new Date().toISOString();
  await updatePickupStatus(pickupId, "completed", "Pickup completed");
  await createWasteBatch(pickupId);
  const receipt = await generatePickupReceipt(pickupId);
  return { receipt, completedAt: now };
}
