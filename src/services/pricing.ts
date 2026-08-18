/**
 * Tydigo Pricing Engine
 *
 * Calculates pickup pricing based on weight, waste type,
 * platform fees, and EcoPoints discounts.
 *
 * Used by both frontend (for estimates) and backend (for final pricing).
 */

export type WasteType =
  | "plastic"
  | "organic"
  | "general_waste"
  | "paper_cardboard"
  | "metal_cans"
  | "glass"
  | "e_waste"
  | "mixed_waste";

export type PricingTier = {
  name: string;
  minKg: number;
  maxKg: number | null;
  basePriceNgn: number;
  perKgPriceNgn: number;
};

export type WasteModifier = {
  wasteType: WasteType;
  modifierPercent: number;
  label: string;
};

export type PriceBreakdown = {
  basePriceNgn: number;
  wasteModifierNgn: number;
  wasteModifierPercent: number;
  platformFeeNgn: number;
  platformFeePercent: number;
  ecopointsDiscountNgn: number;
  ecopointsApplied: number;
  subtotalNgn: number;
  finalTotalNgn: number;
};

// ─── Default Pricing Tiers (Residential) ─────────────────────

export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  { name: "1–5 kg", minKg: 1, maxKg: 5, basePriceNgn: 1000, perKgPriceNgn: 200 },
  { name: "6–10 kg", minKg: 6, maxKg: 10, basePriceNgn: 1500, perKgPriceNgn: 150 },
  { name: "11–20 kg", minKg: 11, maxKg: 20, basePriceNgn: 2500, perKgPriceNgn: 125 },
  { name: "21–40 kg", minKg: 21, maxKg: 40, basePriceNgn: 4000, perKgPriceNgn: 100 },
  { name: "40kg+", minKg: 40, maxKg: null, basePriceNgn: 5000, perKgPriceNgn: 80 },
];

// ─── Waste Type Modifiers ────────────────────────────────────

export const WASTE_MODIFIERS: WasteModifier[] = [
  { wasteType: "plastic", modifierPercent: -10, label: "Plastic recycling discount" },
  { wasteType: "organic", modifierPercent: -10, label: "Organic waste discount" },
  { wasteType: "general_waste", modifierPercent: 0, label: "Standard rate" },
  { wasteType: "paper_cardboard", modifierPercent: -5, label: "Paper/cardboard discount" },
  { wasteType: "metal_cans", modifierPercent: -5, label: "Metal/cans discount" },
  { wasteType: "glass", modifierPercent: 0, label: "Standard rate" },
  { wasteType: "e_waste", modifierPercent: 0, label: "Custom quote" },
  { wasteType: "mixed_waste", modifierPercent: 15, label: "Mixed waste surcharge" },
];

// ─── Constants ───────────────────────────────────────────────

export const PLATFORM_FEE_PERCENT = 10;
export const MIN_PICKUP_PRICE_NGN = 500;
export const MAX_ECOPOINTS_DISCOUNT_PERCENT = 50; // Max 50% off with EcoPoints

// Import from ecopoints service to avoid duplication
import { ECOPOINT_VALUE_NGN } from "./ecopoints";

// ─── Price Calculation ───────────────────────────────────────

export function findPricingTier(weightKg: number): PricingTier {
  const tier = DEFAULT_PRICING_TIERS.find(
    (t) => weightKg >= t.minKg && (t.maxKg === null || weightKg <= t.maxKg)
  );
  if (!tier) {
    // Fallback to last tier for very large weights
    return DEFAULT_PRICING_TIERS[DEFAULT_PRICING_TIERS.length - 1];
  }
  return tier;
}

export function findWasteModifier(wasteType: WasteType): WasteModifier {
  return (
    WASTE_MODIFIERS.find((m) => m.wasteType === wasteType) ??
    WASTE_MODIFIERS.find((m) => m.wasteType === "general_waste")!
  );
}

/**
 * Calculate full price breakdown for a pickup request.
 */
export function calculatePrice(params: {
  weightKg: number;
  wasteType: WasteType;
  ecopointsToApply?: number;
}): PriceBreakdown {
  const { weightKg, wasteType, ecopointsToApply = 0 } = params;

  // Find pricing tier
  const tier = findPricingTier(weightKg);

  // Calculate base price (tier base + per-kg above min)
  const kgAboveMin = Math.max(0, weightKg - tier.minKg);
  const basePriceNgn = tier.basePriceNgn + Math.round(kgAboveMin * tier.perKgPriceNgn);

  // Apply waste type modifier
  const modifier = findWasteModifier(wasteType);
  const wasteModifierNgn = Math.round(basePriceNgn * (modifier.modifierPercent / 100));

  // Subtotal before platform fee
  const subtotalBeforeFee = basePriceNgn + wasteModifierNgn;

  // Platform fee
  const platformFeeNgn = Math.round(subtotalBeforeFee * (PLATFORM_FEE_PERCENT / 100));

  // Subtotal
  const subtotalNgn = subtotalBeforeFee + platformFeeNgn;

  // EcoPoints discount
  const maxEcopointsDiscount = Math.round(subtotalNgn * (MAX_ECOPOINTS_DISCOUNT_PERCENT / 100));
  const ecopointsDiscountNgn = Math.min(
    Math.round(ecopointsToApply * ECOPOINT_VALUE_NGN),
    maxEcopointsDiscount
  );
  const ecopointsApplied = Math.ceil(ecopointsDiscountNgn / ECOPOINT_VALUE_NGN);

  // Final total
  const finalTotalNgn = Math.max(
    subtotalNgn - ecopointsDiscountNgn,
    MIN_PICKUP_PRICE_NGN
  );

  return {
    basePriceNgn,
    wasteModifierNgn,
    wasteModifierPercent: modifier.modifierPercent,
    platformFeeNgn,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    ecopointsDiscountNgn,
    ecopointsApplied,
    subtotalNgn,
    finalTotalNgn,
  };
}

/**
 * Quick price estimate for display (no EcoPoints).
 */
export function estimatePrice(weightKg: number, wasteType: WasteType): number {
  return calculatePrice({ weightKg, wasteType }).finalTotalNgn;
}

/**
 * Server-authoritative price calculation.
 *
 * Calls the `calculate-price` Edge Function so the database pricing rules
 * (pricing_rules table) are the source of truth — NOT the browser.
 *
 * The client-side `calculatePrice` above remains only as a fallback/estimate
 * for offline or mock mode. Production flows MUST use this function.
 */
export async function calculateServerPrice(params: {
  weightKg: number;
  wasteType: WasteType;
  city?: string;
  zone?: string;
  ecopointsToApply?: number;
}): Promise<PriceBreakdown> {
  const { supabase, isSupabaseAvailable } = await import("@/lib/supabase");

  if (isSupabaseAvailable() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke("calculate-price", {
        body: {
          weightKg: params.weightKg,
          wasteType: params.wasteType,
          city: params.city || null,
          zone: params.zone || null,
          ecopointsToApply: params.ecopointsToApply || 0,
        },
      });

      if (!error && data) {
        const result = data as Record<string, unknown>;
        return {
          basePriceNgn: result.basePriceNgn as number,
          wasteModifierNgn: result.wasteModifierNgn as number,
          wasteModifierPercent: result.wasteModifierPercent as number,
          platformFeeNgn: result.platformFeeNgn as number,
          platformFeePercent: result.platformFeePercent as number,
          ecopointsDiscountNgn: result.ecopointsDiscountNgn as number,
          ecopointsApplied: result.ecopointsApplied as number,
          subtotalNgn: result.subtotalNgn as number,
          finalTotalNgn: result.finalTotalNgn as number,
        };
      }
    } catch (err) {
      console.warn("[Tydigo Pricing] Server pricing failed, falling back to client estimate:", err);
    }
  }

  // Fallback to client-side estimate (mock/offline mode)
  return calculatePrice({
    weightKg: params.weightKg,
    wasteType: params.wasteType,
    ecopointsToApply: params.ecopointsToApply,
  });
}

/**
 * Format Naira for display.
 */
export function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
