/**
 * Tydigo Pickup Service
 *
 * Handles creating, reading, and updating pickup requests.
 * Uses Supabase when available, falls back to mock API.
 */

import { supabase, isSupabaseAvailable, generateId, generatePickupCode } from "@/lib/supabase";
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

// ─── Create Pickup ────────────────────────────────────────────

export async function createPickup(
  user: AuthUser,
  draft: PickupDraftInput,
): Promise<CreatedPickup> {
  // Calculate pricing
  const pricing = calculatePrice({
    weightKg: draft.estimatedWeightKg,
    wasteType: draft.wasteType,
    ecopointsToApply: draft.ecopointsToApply,
  });

  const pickupCode = generatePickupCode();

  if (isSupabaseAvailable() && supabase) {
    // Get profile ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    const profileId = profile?.id || user.id;
    const pickupId = generateId("pku");
    const now = new Date().toISOString();

    // Map waste type for DB
    const dbWasteType = mapWasteTypeToDb(draft.wasteType);
    const dbStatus = draft.paymentMethod === "transfer"
      ? "requested"
      : "requested";
    const paymentStatus = draft.paymentMethod === "transfer" ? "pay_on_pickup" : "pending";

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
      id: generateId("evt"),
      pickup_id: pickupId,
      to_status: "requested",
      notes: "Pickup request created",
      created_at: now,
    });

    // If EcoPoints were applied, create redemption transaction
    if (draft.ecopointsToApply > 0 && pricing.ecopointsDiscountNgn > 0 && supabase) {
      await supabase.from("ecopoint_transactions").insert({
        id: generateId("eco"),
        profile_id: profileId,
        pickup_id: pickupId,
        points: -pricing.ecopointsApplied,
        reason: "Pickup discount redemption",
        status: "pending",
      });

      // Update profile ecopoints balance by reading current + subtracting
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("ecopoints")
        .eq("id", profileId)
        .single();

      if (currentProfile) {
        const newBalance = Math.max(0, Number(currentProfile.ecopoints || 0) - pricing.ecopointsApplied);
        await supabase
          .from("profiles")
          .update({ ecopoints: newBalance, updated_at: now })
          .eq("id", profileId);
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

  // Fallback to mock API
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

// ─── Get Pickups ──────────────────────────────────────────────

export async function getCustomerPickups(userId: string): Promise<Pickup[]> {
  if (isSupabaseAvailable() && supabase) {
    const { data, error } = await supabase
      .from("pickup_requests")
      .select("*")
      .or(`customer_id.eq.${userId}`)
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
    const { data, error } = await supabase
      .from("pickup_requests")
      .select("*")
      .or(`customer_id.eq.${userId}`)
      .in("status", ["requested", "matching_collector", "collector_assigned", "collector_en_route", "collector_arrived", "pickup_verified", "waste_picked", "in_transit_to_destination", "delivered_to_partner"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data ? mapDbPickupToPickup(data) : null;
  }

  return null;
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
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabase.storage
      .from("waste-photos")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  // Mock fallback — create a local object URL
  return URL.createObjectURL(file);
}

// ─── Helpers ──────────────────────────────────────────────────

function mapWasteTypeToDb(wasteType: WasteType): string {
  const mapping: Record<string, string> = {
    plastic: "plastic",
    organic: "organic",
    general_waste: "general_waste",
    paper_cardboard: "paper_cardboard",
    metal_cans: "metal_cans",
    glass: "glass",
    e_waste: "e_waste",
    mixed_waste: "mixed_waste",
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
