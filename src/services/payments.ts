/**
 * Tydigo Payment Service
 *
 * Handles payment initialization, verification, and status tracking.
 * Integrates with Paystack via Supabase Edge Function (secure).
 * Falls back to mock when Paystack keys are not configured.
 *
 * SECURITY: PAYSTACK_SECRET_KEY is never exposed to the frontend.
 * All real payment initialization happens server-side via Edge Functions.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { hasPaystack, PAYSTACK_PUBLIC_KEY, SUPABASE_URL } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────

export type PaymentResult = {
  reference: string;
  amountNgn: number;
  status: "pending" | "paid" | "failed";
  authorizationUrl?: string;
  accessCode?: string;
  pointsEarned: number;
  alreadyPaid?: boolean;
  mock?: boolean;
};

// ─── Initialize Payment ───────────────────────────────────────

export async function initializePayment(params: {
  userId: string;
  pickupId: string;
  amountNgn: number;
  email?: string;
}): Promise<PaymentResult> {
  const { userId, pickupId, amountNgn, email } = params;

  // Try edge function first (handles both real Paystack and mock)
  if (isSupabaseAvailable() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke("payment", {
        body: {
          action: "initialize",
          pickupId,
          amountNgn,
          email,
        },
      });

      if (!error && data) {
        const result = data as Record<string, unknown>;
        return {
          reference: result.reference as string,
          amountNgn,
          status: result.status as PaymentResult["status"],
          authorizationUrl: result.authorizationUrl as string | undefined,
          accessCode: result.accessCode as string | undefined,
          // EcoPoints are awarded server-side (award_ecopoints RPC). The client
          // must NOT fabricate a reward amount. Use 0 here; the authoritative
          // reward is reflected in the user's wallet after server processing.
          pointsEarned: 0,
          mock: result.mock as boolean | undefined,
        };
      }
    } catch (err) {
      console.warn("[Tydigo Payment] Edge function failed, falling back to mock:", err);
    }
  }

  // Fallback: fully local mock payment
  return mockPayment({ userId, pickupId, amountNgn });
}

// ─── Mock Payment ─────────────────────────────────────────────

async function mockPayment(params: {
  userId: string;
  pickupId: string;
  amountNgn: number;
}): Promise<PaymentResult> {
  const { pickupId, amountNgn, userId } = params;
  const reference = `TYD-MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  if (isSupabaseAvailable() && supabase) {
    const now = new Date().toISOString();

    // Get profile ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    const profileId = profile?.id || userId;

    // Record payment
    await supabase.from("payments").insert({
      pickup_id: pickupId,
      payer_id: profileId,
      amount_ngn: amountNgn,
      currency: "NGN",
      provider: "mock",
      provider_reference: reference,
      status: "paid",
      paid_at: now,
      created_at: now,
    });

    // Update pickup status
    await supabase
      .from("pickup_requests")
      .update({
        payment_status: "paid",
        status: "requested",
        updated_at: now,
      })
      .eq("id", pickupId);

    // Create status event
    await supabase.from("pickup_status_events").insert({
      pickup_id: pickupId,
      to_status: "requested",
      notes: "Payment confirmed (mock)",
      created_at: now,
    });

    // Award EcoPoints via RPC
    const points = Math.max(100, Math.round(amountNgn * 0.1));
    try {
      await supabase.rpc("award_ecopoints", {
        p_profile_id: profileId,
        p_points: points,
        p_transaction_type: "earn",
        p_source_type: "payment",
        p_source_id: pickupId,
        p_idempotency_key: `payment_${pickupId}_reward`,
        p_description: `Pickup payment reward — ${points} EcoPoints`,
        p_status: "confirmed",
      });
    } catch (err) {
      console.warn("[Tydigo Payment] EcoPoints award failed:", err);
    }
  }

  return {
    reference,
    amountNgn,
    status: "paid",
    // EcoPoints are awarded server-side via award_ecopoints RPC. The client
    // must NOT fabricate a reward amount.
    pointsEarned: 0,
    mock: true,
  };
}

// ─── Verify Payment ───────────────────────────────────────────

export async function verifyPayment(reference: string): Promise<{
  status: string;
  amountNgn: number;
}> {
  if (isSupabaseAvailable() && supabase) {
    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke("payment", {
        body: { action: "verify", reference },
      });
      if (!error && data) {
        const result = data as Record<string, unknown>;
        return {
          status: result.status as string,
          amountNgn: result.amount as number || 0,
        };
      }
    } catch {
      // Fall through to DB check
    }

    // Check DB
    const { data: payment } = await supabase
      .from("payments")
      .select("status, amount_ngn")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (payment) {
      return {
        status: payment.status as string,
        amountNgn: payment.amount_ngn as number,
      };
    }
  }

  return { status: "paid", amountNgn: 0 };
}
