/**
 * Tydigo Receipt Service
 *
 * Generates and stores digital receipts for completed pickups.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type DigitalReceipt = {
  id: string;
  pickup_request_id: string;
  receipt_number: string;
  pdf_url: string | null;
  issued_at: string;
};

function generateReceiptNumber(): string {
  const prefix = "TYD";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
}

/**
 * Generate and store a digital receipt for a completed pickup.
 */
export async function generateReceipt(pickupRequestId: string): Promise<DigitalReceipt | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const receiptNumber = generateReceiptNumber();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("digital_receipts")
    .insert({
      pickup_request_id: pickupRequestId,
      receipt_number: receiptNumber,
      issued_at: now,
    })
    .select()
    .maybeSingle();

  if (error) {
    // If already exists, return existing
    const { data: existing } = await supabase
      .from("digital_receipts")
      .select("*")
      .eq("pickup_request_id", pickupRequestId)
      .maybeSingle();
    return existing as DigitalReceipt | null;
  }

  return data as DigitalReceipt;
}

/**
 * Get receipt for a pickup.
 */
export async function getReceipt(pickupRequestId: string): Promise<DigitalReceipt | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("digital_receipts")
    .select("*")
    .eq("pickup_request_id", pickupRequestId)
    .maybeSingle();

  return data as DigitalReceipt | null;
}

/**
 * Get receipt data for display (combines receipt + pickup details).
 */
export async function getReceiptDetails(pickupRequestId: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data: pickup } = await supabase
    .from("pickup_requests")
    .select(`
      id, pickup_code, waste_type, estimated_weight_kg, actual_weight_kg,
      pickup_address, final_total_ngn, base_price_ngn, platform_fee_ngn,
      ecopoints_discount_ngn, status, payment_status, completed_at, created_at,
      collector:collector_id(full_name),
      customer:customer_id(full_name, phone)
    `)
    .eq("id", pickupRequestId)
    .maybeSingle();

  if (!pickup) return null;

  const { data: receipt } = await supabase
    .from("digital_receipts")
    .select("*")
    .eq("pickup_request_id", pickupRequestId)
    .maybeSingle();

  const { data: items } = await supabase
    .from("pickup_items")
    .select("*, waste_category:waste_category_id(name)")
    .eq("pickup_request_id", pickupRequestId);

  return {
    ...pickup,
    receipt_number: (receipt as Record<string, unknown> | null)?.receipt_number || null,
    issued_at: (receipt as Record<string, unknown> | null)?.issued_at || null,
    items: items || [],
  };
}
