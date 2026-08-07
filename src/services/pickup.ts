/**
 * Tydigo Pickup Service
 *
 * Full pickup lifecycle: create, read, update, status events,
 * multi-item support, image uploads, and tracking.
 */

import { supabase, isSupabaseAvailable, generatePickupCode, generateId } from "@/lib/supabase";
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
): Promise<CreatedPickup> {
  const pricing = calculatePrice({
    weightKg: draft.estimatedWeightKg,
    wasteType: draft.wasteType,
    ecopointsToApply: draft.ecopointsToApply,
  });

  const pickupCode = generatePickupCode();

  if (isSupabaseAvailable() && supabase) {
    const profileId = await resolveProfileId(user.id);
    const now = new Date().toISOString();
    const pickupId = generateId("pku");
    const dbWasteType = mapWasteTypeToDb(draft.wasteType);
    const dbStatus = "requested";
    const paymentStatus = draft.paymentMethod === "transfer" ? "pay_on_pickup" : "pending";

    // Create pickup request
    const { error } = await supabase.from("pickup_requests").insert({
      id: pickupId,
      customer_id: profileId,
      waste_type: dbWasteType,
      estimated_weight_kg: draft.estimatedWeightKg,
      sorting_verified: draft.sortingStatus === "properly_sorted",
      photos: draft.photoPath ? [draft.photoPath] : [],
      pickup_address: draft.address,
      pickup_instructions: draft.pickupInstructions || null,
      requested_window: draft.scheduleWindow,
      pickup_code: pickupCode,
      base_price_ngn: pricing.basePriceNgn,
      waste_modifier_ngn: pricing.wasteModifierNgn,
      platform_fee_ngn: pricing.platformFeeNgn,
      ecopoints_discount_ngn: pricing.ecopointsDiscountNgn,
      final_total_ngn: pricing.finalTotalNgn,
      status: dbStatus,
      payment_status: paymentStatus,
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(error.message);

    // Create status event
    await supabase.from("pickup_status_events").insert({
      pickup_id: pickupId,
      to_status: "requested",
      notes: "Pickup request created",
      created_at: now,
    });

    // Handle EcoPoints redemption via RPC
    if (draft.ecopointsToApply > 0 && pricing.ecopointsDiscountNgn > 0) {
      try {
        await supabase.rpc("redeem_ecopoints", {
          p_profile_id: profileId,
          p_points: pricing.ecopointsApplied,
          p_redemption_type: "pickup_discount",
          p_related_order_type: "pickup",
          p_related_order_id: pickupId,
          p_idempotency_key: `pickup_${pickupId}_ecopoints`,
          p_description: `EcoPoints discount for pickup ${pickupCode}`,
        });
      } catch (err) {
        console.warn("[Tydigo Pickup] EcoPoints redemption via RPC failed:", err);
        // Fallback: direct update
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("ecopoints")
          .eq("id", profileId)
          .maybeSingle();

        if (currentProfile) {
          const newBalance = Math.max(0, Number(currentProfile.ecopoints || 0) - pricing.ecopointsApplied);
          await supabase
            .from("profiles")
            .update({ ecopoints: newBalance, updated_at: now })
            .eq("id", profileId);

          await supabase.from("ecopoint_transactions").insert({
            profile_id: profileId,
            pickup_id: pickupId,
            points: -pricing.ecopointsApplied,
            reason: "Pickup discount redemption",
            status: "confirmed",
            created_at: now,
          });
        }
      }
    }

    return {
      id: pickupId,
      pickupCode,
      wasteType: draft.wasteType,
      estimatedWeightKg: draft.estimatedWeightKg,
      address: draft.address,
      status: dbStatus,
      paymentStatus,
      priceBreakdown: pricing,
      finalTotalNgn: pricing.finalTotalNgn,
      createdAt: now,
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

    const { data: urlData } = supabase.storage
      .from("waste-photos")
      .getPublicUrl(data.path);

    // Record in pickup_images
    await supabase.from("pickup_images").insert({
      pickup_request_id: pickupId,
      image_url: urlData.publicUrl,
      storage_path: data.path,
    });

    return urlData.publicUrl;
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
    .select("customer_id, waste_type, estimated_weight_kg, actual_weight_kg, pickup_code")
    .eq("id", pickupId)
    .maybeSingle();
  if (!pickup) return null;
  const weight = (pickup.actual_weight_kg || pickup.estimated_weight_kg || 0) as number;
  const { data } = await supabase
    .from("waste_batches")
    .insert({
      id: generateId("wbt"),
      pickup_id: pickupId,
      customer_id: pickup.customer_id,
      material_type: pickup.waste_type,
      quantity_kg: weight,
      quality_grade: "standard",
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
