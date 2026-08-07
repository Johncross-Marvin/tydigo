/**
 * Tydigo Recycler Marketplace Service
 *
 * Production marketplace service: listings, purchase requests, offers,
 * trades, warehouses, inventory, settlements, inspections.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────

export type MarketplaceListing = {
  id: string;
  listing_reference: string;
  seller_profile_id: string;
  waste_batch_id: string | null;
  waste_category_id: string;
  quantity_available_kg: number;
  minimum_order_kg: number;
  quality_grade: string | null;
  contamination_percentage: number | null;
  asking_price_per_kg_minor: number;
  currency: string;
  listing_type: string;
  city_id: string | null;
  delivery_options: string;
  status: string;
  listed_at: string;
  expires_at: string | null;
  created_at: string;
};

export type PurchaseRequest = {
  id: string;
  request_reference: string;
  recycler_profile_id: string;
  warehouse_id: string | null;
  waste_category_id: string;
  title: string | null;
  description: string | null;
  required_quantity_kg: number;
  remaining_quantity_kg: number;
  target_price_per_kg_minor: number | null;
  maximum_price_per_kg_minor: number | null;
  minimum_quality_grade: string | null;
  preferred_city_id: string | null;
  pickup_or_delivery: string;
  deadline: string | null;
  status: string;
  created_at: string;
};

export type MarketplaceOffer = {
  id: string;
  offer_reference: string;
  listing_id: string | null;
  purchase_request_id: string | null;
  buyer_profile_id: string;
  seller_profile_id: string;
  quantity_kg: number;
  price_per_kg_minor: number;
  total_amount_minor: number;
  message: string | null;
  status: string;
  created_at: string;
};

export type MarketplaceTrade = {
  id: string;
  trade_reference: string;
  listing_id: string | null;
  purchase_request_id: string | null;
  accepted_offer_id: string | null;
  buyer_profile_id: string;
  seller_profile_id: string;
  waste_batch_id: string | null;
  warehouse_id: string | null;
  waste_category_id: string;
  agreed_quantity_kg: number;
  final_quantity_kg: number | null;
  agreed_price_per_kg_minor: number;
  final_price_per_kg_minor: number | null;
  subtotal_minor: number;
  platform_fee_minor: number;
  total_minor: number;
  status: string;
  payment_status: string;
  logistics_status: string;
  created_at: string;
};

export type Warehouse = {
  id: string;
  recycler_profile_id: string;
  name: string;
  warehouse_reference: string | null;
  city_id: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity_kg: number | null;
  status: string;
};

export type InventoryBatch = {
  id: string;
  warehouse_id: string;
  source_trade_id: string | null;
  waste_category_id: string;
  quantity_received_kg: number;
  quantity_available_kg: number;
  quantity_reserved_kg: number;
  quantity_processed_kg: number;
  quality_grade: string | null;
  unit_cost_minor: number | null;
  status: string;
  received_at: string;
};

export type Settlement = {
  id: string;
  settlement_reference: string;
  trade_id: string;
  seller_profile_id: string;
  gross_amount_minor: number;
  platform_fee_minor: number;
  net_amount_minor: number;
  status: string;
  created_at: string;
};

export type MaterialInspection = {
  id: string;
  trade_id: string;
  warehouse_id: string | null;
  gross_weight_kg: number | null;
  accepted_weight_kg: number | null;
  rejected_weight_kg: number;
  quality_grade: string | null;
  contamination_percentage: number | null;
  status: string;
};

export type RecyclerAcceptedMaterial = {
  id: string;
  recycler_profile_id: string;
  waste_category_id: string;
  minimum_quantity_kg: number;
  base_price_per_kg_minor: number;
  active: boolean;
};

// ─── Listings ────────────────────────────────────────────────

export async function getMarketplaceListings(params?: {
  categoryId?: string;
  cityId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceListing[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  let query = supabase!
    .from("marketplace_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 20) - 1);
  if (params?.categoryId) query = query.eq("waste_category_id", params.categoryId);
  if (params?.cityId) query = query.eq("city_id", params.cityId);
  if (params?.status) query = query.eq("status", params.status);
  else query = query.in("status", ["active", "reserved"]);
  const { data } = await query;
  return (data as MarketplaceListing[]) || [];
}

export async function getListingById(id: string): Promise<MarketplaceListing | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.from("marketplace_listings").select("*").eq("id", id).single();
  return data as MarketplaceListing | null;
}

export async function createListing(params: {
  sellerProfileId: string;
  wasteBatchId?: string;
  wasteCategoryId: string;
  quantityAvailableKg: number;
  askingPricePerKgMinor: number;
  qualityGrade?: string;
  cityId?: string;
}): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.rpc("create_marketplace_listing", {
    p_seller_profile_id: params.sellerProfileId,
    p_waste_batch_id: params.wasteBatchId || null,
    p_waste_category_id: params.wasteCategoryId,
    p_quantity_available_kg: params.quantityAvailableKg,
    p_asking_price_per_kg_minor: params.askingPricePerKgMinor,
    p_quality_grade: params.qualityGrade || null,
    p_city_id: params.cityId || null,
  });
  return data as string | null;
}

// ─── Purchase Requests ───────────────────────────────────────

export async function getPurchaseRequests(params?: {
  recyclerProfileId?: string;
  categoryId?: string;
  status?: string;
  limit?: number;
}): Promise<PurchaseRequest[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  let query = supabase!
    .from("purchase_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit || 20);
  if (params?.recyclerProfileId) query = query.eq("recycler_profile_id", params.recyclerProfileId);
  if (params?.categoryId) query = query.eq("waste_category_id", params.categoryId);
  if (params?.status) query = query.eq("status", params.status);
  else query = query.in("status", ["active", "partially_fulfilled"]);
  const { data } = await query;
  return (data as PurchaseRequest[]) || [];
}

// ─── Offers ──────────────────────────────────────────────────

export async function placeOffer(params: {
  buyerProfileId: string;
  sellerProfileId: string;
  listingId?: string;
  purchaseRequestId?: string;
  quantityKg: number;
  pricePerKgMinor: number;
  message?: string;
}): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.rpc("place_marketplace_offer", {
    p_buyer_profile_id: params.buyerProfileId,
    p_seller_profile_id: params.sellerProfileId,
    p_listing_id: params.listingId || null,
    p_purchase_request_id: params.purchaseRequestId || null,
    p_quantity_kg: params.quantityKg,
    p_price_per_kg_minor: params.pricePerKgMinor,
    p_message: params.message || null,
  });
  return data as string | null;
}

export async function acceptOffer(offerId: string, acceptorProfileId: string): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.rpc("accept_marketplace_offer", {
    p_offer_id: offerId,
    p_acceptor_profile_id: acceptorProfileId,
  });
  return data as string | null;
}

export async function getOffersForListing(listingId: string): Promise<MarketplaceOffer[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("marketplace_offers")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  return (data as MarketplaceOffer[]) || [];
}

// ─── Trades ──────────────────────────────────────────────────

export async function getTrades(profileId: string): Promise<MarketplaceTrade[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("marketplace_trades")
    .select("*")
    .or(`buyer_profile_id.eq.${profileId},seller_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false });
  return (data as MarketplaceTrade[]) || [];
}

export async function getTradeById(id: string): Promise<MarketplaceTrade | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.from("marketplace_trades").select("*").eq("id", id).single();
  return data as MarketplaceTrade | null;
}

// ─── Warehouses ──────────────────────────────────────────────

export async function getWarehouses(recyclerProfileId: string): Promise<Warehouse[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("warehouses")
    .select("*")
    .eq("recycler_profile_id", recyclerProfileId)
    .eq("status", "active");
  return (data as Warehouse[]) || [];
}

// ─── Inventory ───────────────────────────────────────────────

export async function getWarehouseInventory(warehouseId: string): Promise<InventoryBatch[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("warehouse_inventory_batches")
    .select("*")
    .eq("warehouse_id", warehouseId)
    .eq("status", "available")
    .order("received_at", { ascending: false });
  return (data as InventoryBatch[]) || [];
}

export async function receiveInventory(params: {
  warehouseId: string;
  tradeId: string;
  wasteCategoryId: string;
  quantityReceivedKg: number;
  qualityGrade?: string;
  unitCostMinor?: number;
}): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.rpc("receive_warehouse_inventory", {
    p_warehouse_id: params.warehouseId,
    p_trade_id: params.tradeId,
    p_waste_category_id: params.wasteCategoryId,
    p_quantity_received_kg: params.quantityReceivedKg,
    p_quality_grade: params.qualityGrade || null,
    p_unit_cost_minor: params.unitCostMinor || null,
  });
  return data as string | null;
}

// ─── Settlements ─────────────────────────────────────────────

export async function getSettlements(sellerProfileId: string): Promise<Settlement[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("settlements")
    .select("*")
    .eq("seller_profile_id", sellerProfileId)
    .order("created_at", { ascending: false });
  return (data as Settlement[]) || [];
}

export async function createSettlement(tradeId: string, sellerProfileId: string): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!.rpc("create_trade_settlement", {
    p_trade_id: tradeId,
    p_seller_profile_id: sellerProfileId,
  });
  return data as string | null;
}

// ─── Accepted Materials ──────────────────────────────────────

export async function getAcceptedMaterials(recyclerProfileId: string): Promise<RecyclerAcceptedMaterial[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("recycler_accepted_materials")
    .select("*, waste_category:waste_categories(*)")
    .eq("recycler_profile_id", recyclerProfileId)
    .eq("active", true);
  return (data as RecyclerAcceptedMaterial[]) || [];
}

// ─── Helper ──────────────────────────────────────────────────

export function formatMinorToNaira(minor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatKg(kg: number): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(kg) + " kg";
}
