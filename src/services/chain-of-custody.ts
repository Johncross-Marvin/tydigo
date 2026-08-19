/**
 * Chain-of-Custody Service
 *
 * Authoritative physical waste tracking from collection → destination →
 * inspection → inventory. All mutations go through server RPCs; the browser
 * only captures intent and observes results. Reads are scoped by RLS.
 */
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types (match live waste_batches schema) ─────────────────

export type WasteBatchStatus =
  | "collected"
  | "in_transit"
  | "transferred"
  | "destination_assigned"
  | "received"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "inventoried";

export type WasteBatch = {
  id: string;
  batch_reference: string | null;
  partner_id: string | null;
  material_type: string;
  quantity_kg: number;
  quality_grade: string | null;
  contamination_pct: number | null;
  source_pickup_ids: string[] | null;
  source_zone: string | null;
  delivered_at: string | null;
  received_by: string | null;
  verified: boolean;
  proof_photos: string[] | null;
  status: WasteBatchStatus;
  custodian_profile_id: string | null;
  custodian_type: string | null;
  destination_type: string | null;
  destination_id: string | null;
  destination_assigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CustodyEvent = {
  id: string;
  waste_batch_id: string;
  event_type: string;
  from_actor_type: string | null;
  from_actor_id: string | null;
  to_actor_type: string | null;
  to_actor_id: string | null;
  location_type: string | null;
  location_id: string | null;
  quantity_kg: number | null;
  proof_paths: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DestinationReceipt = {
  id: string;
  waste_batch_id: string;
  destination_type: string;
  destination_id: string;
  received_by_profile_id: string | null;
  received_quantity_kg: number | null;
  condition_notes: string | null;
  proof_paths: string[] | null;
  inspection_status: string;
  received_at: string;
  created_at: string;
};

// ─── Reads ───────────────────────────────────────────────────

export async function getBatchById(batchId: string): Promise<WasteBatch | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("waste_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  return (data as WasteBatch) || null;
}

export async function getBatchesByCustodian(
  custodianProfileId: string,
): Promise<WasteBatch[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("waste_batches")
    .select("*")
    .eq("custodian_profile_id", custodianProfileId)
    .order("created_at", { ascending: false });
  return (data as WasteBatch[]) || [];
}

export async function getBatchesByDestination(
  destinationId: string,
): Promise<WasteBatch[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("waste_batches")
    .select("*")
    .eq("destination_id", destinationId)
    .order("created_at", { ascending: false });
  return (data as WasteBatch[]) || [];
}

export async function getCustodyHistory(batchId: string): Promise<CustodyEvent[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("custody_events")
    .select("*")
    .eq("waste_batch_id", batchId)
    .order("created_at", { ascending: true });
  return (data as CustodyEvent[]) || [];
}

export async function getDestinationReceipt(
  batchId: string,
): Promise<DestinationReceipt | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("destination_receipts")
    .select("*")
    .eq("waste_batch_id", batchId)
    .maybeSingle();
  return (data as DestinationReceipt) || null;
}

// ─── Authoritative mutations (server RPCs) ───────────────────

export async function createBatchFromPickup(
  pickupId: string,
  actorProfileId: string,
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("create_waste_batch_from_pickup", {
    p_pickup_id: pickupId,
    p_actor_profile_id: actorProfileId,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; batch_id?: string; error?: string };
  if (!r?.success) return { success: false, error: r?.error || "Unable to create batch" };
  return { success: true, batchId: r.batch_id };
}

export async function transferBatch(
  batchId: string,
  actorProfileId: string,
  eventType: "in_transit" | "transferred" | "received_at_destination",
  toActorType?: string,
  toActorId?: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("transfer_waste_batch", {
    p_batch_id: batchId,
    p_actor_profile_id: actorProfileId,
    p_event_type: eventType,
    p_to_actor_type: toActorType ?? null,
    p_to_actor_id: toActorId ?? null,
    p_notes: notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string };
  return { success: !!r?.success, error: r?.error };
}

export async function assignDestination(
  batchId: string,
  actorProfileId: string,
  destinationType: string,
  destinationId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("assign_waste_batch_destination", {
    p_batch_id: batchId,
    p_actor_profile_id: actorProfileId,
    p_destination_type: destinationType,
    p_destination_id: destinationId,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string };
  return { success: !!r?.success, error: r?.error };
}

export async function confirmReceipt(
  batchId: string,
  actorProfileId: string,
  receivedQuantityKg: number,
  conditionNotes?: string,
  proofPaths?: string[],
): Promise<{ success: boolean; receiptId?: string; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("confirm_destination_receipt", {
    p_batch_id: batchId,
    p_actor_profile_id: actorProfileId,
    p_received_quantity_kg: receivedQuantityKg,
    p_condition_notes: conditionNotes ?? null,
    p_proof_paths: proofPaths ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; receipt_id?: string; error?: string };
  if (!r?.success) return { success: false, error: r?.error || "Unable to confirm receipt" };
  return { success: true, receiptId: r.receipt_id };
}

export async function submitInspection(
  batchId: string,
  actorProfileId: string,
  acceptedQuantityKg: number,
  rejectedQuantityKg = 0,
  qualityGrade?: string,
  contaminationPct?: number,
  notes?: string,
  evidencePaths?: string[],
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("submit_batch_inspection", {
    p_batch_id: batchId,
    p_actor_profile_id: actorProfileId,
    p_accepted_quantity_kg: acceptedQuantityKg,
    p_rejected_quantity_kg: rejectedQuantityKg,
    p_quality_grade: qualityGrade ?? null,
    p_contamination_pct: contaminationPct ?? null,
    p_notes: notes ?? null,
    p_evidence_paths: evidencePaths ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; status?: string; error?: string };
  if (!r?.success) return { success: false, error: r?.error || "Unable to submit inspection" };
  return { success: true, status: r.status };
}

export async function handoffToInventory(
  batchId: string,
  actorProfileId: string,
  warehouseId: string,
  quantityKg: number,
  qualityGrade?: string,
  storageLocation?: string,
): Promise<{ success: boolean; inventoryBatchId?: string; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) return { success: false, error: "Not available" };
  const { data, error } = await supabase.rpc("handoff_batch_to_inventory", {
    p_batch_id: batchId,
    p_actor_profile_id: actorProfileId,
    p_warehouse_id: warehouseId,
    p_quantity_kg: quantityKg,
    p_quality_grade: qualityGrade ?? null,
    p_storage_location: storageLocation ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; inventory_batch_id?: string; error?: string };
  if (!r?.success) return { success: false, error: r?.error || "Unable to handoff to inventory" };
  return { success: true, inventoryBatchId: r.inventory_batch_id };
}
