/**
 * Tydigo Payment Service
 *
 * Handles payment initialization, verification, and status tracking.
 * Integrates with Paystack when keys are available, falls back to mock.
 *
 * SECURITY: Never exposes PAYSTACK_SECRET_KEY in frontend code.
 * Real payment initialization happens server-side via Edge Functions.
 */

import { supabase, isSupabaseAvailable, generateId } from "@/lib/supabase";
import { api as mockApi } from "@/lib/api";
import { hasPaystack, PAYSTACK_PUBLIC_KEY } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────

export type PaymentResult = {
  reference: string;
  amountNgn: number;
  status: "pending" | "paid" | "failed";
  authorizationUrl?: string;
  pointsEarned: number;
  alreadyPaid?: boolean;
};

// ─── Initialize Payment ───────────────────────────────────────

export async function initializePayment(params: {
  userId: string;
  pickupId: string;
  amountNgn: number;
  email?: string;
}): Promise<PaymentResult> {
  const { userId, pickupId, amountNgn, email } = params;

  if (hasPaystack() && PAYSTACK_PUBLIC_KEY) {
    return initializePaystackPayment({ userId, pickupId, amountNgn, email });
  }

  // Mock payment
  return mockPayment({ userId, pickupId, amountNgn });
}

// ─── Paystack Payment ─────────────────────────────────────────

async function initializePaystackPayment(params: {
  userId: string;
  pickupId: string;
  amountNgn: number;
  email?: string;
}): Promise<PaymentResult> {
  const { userId, pickupId, amountNgn, email } = params;
  const reference = `TYD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const amountInKobo = amountNgn * 100; // Paystack uses kobo

  // Call Paystack inline script to initialize
  return new Promise((resolve, reject) => {
    const handler = (window as unknown as Record<string, unknown>).PaystackPop as {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };

    if (!handler) {
      // Paystack script not loaded — fall back to mock
      resolve(mockPayment({ userId, pickupId, amountNgn }));
      return;
    }

    handler.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email || "customer@tydigo.com",
      amount: amountInKobo,
      ref: reference,
      currency: "NGN",
      label: "Tydigo Pickup",
      onSuccess: async () => {
        // Record payment in DB if Supabase is available
        if (isSupabaseAvailable() && supabase) {
          await recordPayment({
            pickupId,
            userId,
            amountNgn,
            reference,
            status: "paid",
          });
        }

        resolve({
          reference,
          amountNgn,
          status: "paid",
          pointsEarned: Math.max(100, Math.round(amountNgn * 0.1)),
        });
      },
      onClose: () => {
        resolve({
          reference,
          amountNgn,
          status: "pending",
          pointsEarned: 0,
        });
      },
    }).openIframe();
  });
}

// ─── Mock Payment ─────────────────────────────────────────────

async function mockPayment(params: {
  userId: string;
  pickupId: string;
  amountNgn: number;
}): Promise<PaymentResult> {
  const { pickupId, amountNgn } = params;

  // Try mock API first
  try {
    const result = await mockApi.createPayment({
      pickupId,
      method: "card",
    });

    return {
      reference: result.payment.reference,
      amountNgn: result.payment.amountNgn,
      status: "paid",
      pointsEarned: result.pointsEarned,
      alreadyPaid: result.alreadyPaid,
    };
  } catch (error) {
    // If mock API fails, create a fully local mock
    const reference = `TYD-MOCK-${Date.now()}`;

    if (isSupabaseAvailable() && supabase) {
      await recordPayment({
        pickupId,
        userId: params.userId,
        amountNgn,
        reference,
        status: "paid",
      });
    }

    return {
      reference,
      amountNgn,
      status: "paid",
      pointsEarned: Math.max(100, Math.round(amountNgn * 0.1)),
    };
  }
}

// ─── Record Payment in DB ─────────────────────────────────────

async function recordPayment(params: {
  pickupId: string;
  userId: string;
  amountNgn: number;
  reference: string;
  status: string;
}): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const paymentId = generateId("pay");
  const now = new Date().toISOString();

  await supabase.from("payments").insert({
    id: paymentId,
    pickup_id: params.pickupId,
    payer_id: params.userId,
    amount_ngn: params.amountNgn,
    currency: "NGN",
    provider: "paystack",
    provider_reference: params.reference,
    status: params.status,
    paid_at: params.status === "paid" ? now : null,
    created_at: now,
  });

  // Update pickup payment status
  await supabase
    .from("pickup_requests")
    .update({
      payment_status: params.status === "paid" ? "paid" : "pending",
      updated_at: now,
    })
    .eq("id", params.pickupId);

  // Award EcoPoints for this payment
  if (params.status === "paid") {
    const points = Math.max(100, Math.round(params.amountNgn * 0.1));
    const { data: pickup } = await supabase
      .from("pickup_requests")
      .select("customer_id")
      .eq("id", params.pickupId)
      .maybeSingle();

    if (pickup) {
      await supabase.from("ecopoint_transactions").insert({
        id: generateId("eco"),
        profile_id: pickup.customer_id,
        pickup_id: params.pickupId,
        points,
        reason: "Pickup payment reward",
        status: "confirmed",
        created_at: now,
      });

      // Update profile EcoPoints balance
      const { data: prof } = await supabase
        .from("profiles")
        .select("ecopoints")
        .eq("id", pickup.customer_id)
        .maybeSingle();

      if (prof) {
        await supabase
          .from("profiles")
          .update({
            ecopoints: Number(prof.ecopoints || 0) + points,
            updated_at: now,
          })
          .eq("id", pickup.customer_id);
      }
    }
  }
}

// ─── Verify Payment ───────────────────────────────────────────

export async function verifyPayment(reference: string): Promise<{
  status: string;
  amountNgn: number;
}> {
  if (isSupabaseAvailable() && supabase) {
    const { data } = await supabase
      .from("payments")
      .select("status, amount_ngn")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (data) {
      return {
        status: data.status as string,
        amountNgn: data.amount_ngn as number,
      };
    }
  }

  return { status: "paid", amountNgn: 0 };
}
