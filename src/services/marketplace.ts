/**
 * Recycler Marketplace Service
 * 
 * Connects recyclers to listings, purchase requests, offers, trades,
 * warehouses, inventory, inspections, and settlements.
 */
import { supabase, isSupabaseAvailable, generateId } from "@/lib/supabase";

// ─── Marketplace Listings ────────────────────────────────────

export async function getMarketplaceListings(filters?: {
  categoryId?: string; city?: string; minQuantity?: number; maxPrice?: number;
  status?: string; limit?: number;
}) {
  if (!isSupabaseAvailable() || !supabase) return [];
  let q = supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }).limit(filters?.limit || 20);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.categoryId) q = q.eq("waste_category_id", filters.categoryId);
  const { data } = await q;
  return data || [];
}

export async function getListingById(id: string) {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("marketplace_listings").select("*").eq("id", id).maybeSingle();
  return data;
}

// ─── Purchase Requests ───────────────────────────────────────

export async function getPurchaseRequests(recyclerId?: string, filters?: { status?: string; limit?: number }) {
  if (!isSupabaseAvailable() || !supabase) return [];
  let q = supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }).limit(filters?.limit || 10);
  if (recyclerId) q = q.eq("recycler_profile_id", recyclerId);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return data || [];
}

export async function createPurchaseRequest(params: {
  recyclerProfileId: string; warehouseId?: string; wasteCategoryId: string;
  title: string; description?: string; requiredQuantityKg: number;
  targetPriceMinor?: number; minimumQualityGrade?: string;
  preferredCityId?: string; deadline?: string;
}) {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Not available");
  const { data, error } = await supabase.from("purchase_requests").insert({
    id: generateId("pr"), recycler_profile_id: params.recyclerProfileId,
    warehouse_id: params.warehouseId, waste_category_id: params.wasteCategoryId,
    title: params.title, description: params.description,
    required_quantity_kg: params.requiredQuantityKg, remaining_quantity_kg: params.requiredQuantityKg,
    target_price_per_kg_minor: params.targetPriceMinor,
    minimum_quality_grade: params.minimumQualityGrade,
    preferred_city_id: params.preferredCityId, deadline: params.deadline,
    status: "active", request_reference: `PR-${Date.now()}`,
  }).select().maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Offers ──────────────────────────────────────────────────

export async function getOffersForListing(listingId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("marketplace_offers").select("*").eq("listing_id", listingId).order("created_at", { ascending: false });
  return data || [];
}

export async function getMyOffers(profileId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("marketplace_offers").select("*").or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`).order("created_at", { ascending: false }).limit(20);
  return data || [];
}

// ─── Trades ──────────────────────────────────────────────────

export async function getMyTrades(profileId: string, limit = 20) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("marketplace_trades").select("*").or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function getTradeById(id: string) {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("marketplace_trades").select("*").eq("id", id).maybeSingle();
  return data;
}

// ─── Warehouses ──────────────────────────────────────────────

export async function getMyWarehouses(recyclerProfileId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("warehouses").select("*").eq("recycler_profile_id", recyclerProfileId);
  return data || [];
}

// ─── Inventory ───────────────────────────────────────────────

export async function getWarehouseInventory(warehouseId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("warehouse_inventory_batches").select("*").eq("warehouse_id", warehouseId).order("received_at", { ascending: false }).limit(50);
  return data || [];
}

// ─── Inspections ─────────────────────────────────────────────

export async function getTradeInspections(tradeId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("material_inspections").select("*").eq("trade_id", tradeId).order("created_at", { ascending: false });
  return data || [];
}

// ─── Settlements ─────────────────────────────────────────────

export async function getMySettlements(profileId: string, limit = 20) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("settlements").select("*").eq("seller_profile_id", profileId).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

// ─── Accepted Materials ──────────────────────────────────────

export async function getAcceptedMaterials(recyclerProfileId: string) {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("recycler_accepted_materials").select("*, waste_categories(name, type, color)").eq("recycler_profile_id", recyclerProfileId).eq("active", true);
  return data || [];
}

// ─── Analytics ───────────────────────────────────────────────

export async function getRecyclerAnalytics(recyclerProfileId: string) {
  if (!isSupabaseAvailable() || !supabase) return null;
  const [tradesRes, inventoryRes, settlementsRes] = await Promise.all([
    supabase.from("marketplace_trades").select("status, agreed_quantity_kg, total_minor").or(`buyer_profile_id.eq.${recyclerProfileId},seller_profile_id.eq.${recyclerProfileId}`),
    supabase.from("warehouse_inventory_batches").select("quantity_received_kg, quantity_available_kg").eq("warehouse_id", recyclerProfileId),
    supabase.from("settlements").select("net_amount_minor, status").eq("seller_profile_id", recyclerProfileId),
  ]);
  const completedTrades = (tradesRes.data || []).filter((t: Record<string,unknown>) => t.status === "completed");
  const totalKg = completedTrades.reduce((s: number, t: Record<string,unknown>) => s + Number(t.agreed_quantity_kg || 0), 0);
  const totalSpend = completedTrades.reduce((s: number, t: Record<string,unknown>) => s + Number(t.total_minor || 0), 0);
  return {
    totalTrades: tradesRes.data?.length || 0,
    completedTrades: completedTrades.length,
    totalKgPurchased: totalKg,
    totalSpendMinor: totalSpend,
    totalSpendNgn: Math.round(totalSpend / 100),
    inventoryBatches: inventoryRes.data?.length || 0,
    totalSettled: (settlementsRes.data || []).filter((s: Record<string,unknown>) => s.status === "paid").length,
  };
}
