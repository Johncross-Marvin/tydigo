/**
 * Tydigo Payment Edge Function
 *
 * Securely initializes Paystack transactions.
 * PAYSTACK_SECRET_KEY is only used server-side here.
 *
 * Actions:
 *   - initialize: Create a Paystack transaction and return authorization URL
 *   - verify: Verify a payment by reference
 *   - webhook: Handle Paystack webhook events
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
const PAYSTACK_BASE = "https://api.paystack.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for unrestricted DB access (payment writes, webhook updates)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, ...body } = await req.json();

    switch (action) {
      case "initialize": {
        // Still authenticate the user for initialize — extract user from the auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
          authHeader.replace("Bearer ", ""),
        );
        if (userError || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return await initializePayment(supabaseClient, user.id, body);
      }
      case "verify":
        return await verifyPayment(body);
      case "webhook":
        return await handleWebhook(supabaseClient, req, body);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[payment] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function initializePayment(
  client: ReturnType<typeof createClient>,
  authUserId: string,
  body: { pickupId: string; amountNgn: number; email?: string },
) {
  const { pickupId, amountNgn, email } = body;

  // Get profile
  const { data: profile } = await client
    .from("profiles")
    .select("id, email, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reference = `TYD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const amountInKobo = amountNgn * 100;
  const customerEmail = email || profile.email || "customer@tydigo.com";

  // If no Paystack key, return mock success
  if (!PAYSTACK_SECRET_KEY) {
    console.log("[payment] No Paystack key — using mock payment");

    const now = new Date().toISOString();
    await client.from("payments").insert({
      pickup_id: pickupId,
      payer_id: profile.id,
      amount_ngn: amountNgn,
      currency: "NGN",
      provider: "mock",
      provider_reference: reference,
      status: "paid",
      paid_at: now,
      created_at: now,
    });

    await client.from("pickup_requests").update({
      payment_status: "paid",
      status: "requested",
      updated_at: now,
    }).eq("id", pickupId);

    await client.from("pickup_status_events").insert({
      pickup_id: pickupId,
      to_status: "requested",
      notes: "Payment confirmed (mock)",
      created_at: now,
    });

    return new Response(JSON.stringify({
      reference,
      status: "paid",
      authorizationUrl: null,
      mock: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Initialize Paystack transaction
  const paystackResponse = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: customerEmail,
      amount: amountInKobo,
      reference,
      currency: "NGN",
      metadata: {
        pickup_id: pickupId,
        profile_id: profile.id,
      },
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
    }),
  });

  const paystackData = await paystackResponse.json();

  if (!paystackData.status) {
    console.error("[payment] Paystack init failed:", paystackData);
    return new Response(JSON.stringify({ error: "Payment initialization failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Record pending payment
  const now = new Date().toISOString();
  await client.from("payments").insert({
    pickup_id: pickupId,
    payer_id: profile.id,
    amount_ngn: amountNgn,
    currency: "NGN",
    provider: "paystack",
    provider_reference: reference,
    status: "pending",
    created_at: now,
  });

  return new Response(JSON.stringify({
    reference,
    status: "pending",
    authorizationUrl: paystackData.data.authorization_url,
    accessCode: paystackData.data.access_code,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyPayment(body: { reference: string }) {
  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ status: "paid", mock: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${body.reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const data = await response.json();

  return new Response(JSON.stringify({
    status: data.data?.status === "success" ? "paid" : data.data?.status || "pending",
    amount: data.data?.amount ? data.data.amount / 100 : 0,
    gatewayResponse: data.data?.gateway_response,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleWebhook(
  client: ReturnType<typeof createClient>,
  req: Request,
  body: Record<string, unknown>,
) {
  // Verify webhook signature
  if (PAYSTACK_SECRET_KEY) {
    const signature = req.headers.get("x-paystack-signature") || "";
    const rawBody = JSON.stringify(body);
    const computedHash = createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    if (signature !== computedHash) {
      console.error("[payment] Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const event = body.event as string;
  const data = body.data as Record<string, unknown> | undefined;

  if (!data) {
    return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reference = data.reference as string;
  const status = data.status as string;

  console.log("[payment] Webhook received:", { event, reference, status });

  if (event === "charge.success" && status === "success") {
    const now = new Date().toISOString();
    const amountNgn = Math.round((data.amount as number || 0) / 100);

    // Update payment record
    await client.from("payments").update({
      status: "paid",
      paid_at: now,
    }).eq("provider_reference", reference);

    // Get payment to find pickup
    const { data: payment } = await client
      .from("payments")
      .select("pickup_id, payer_id, amount_ngn")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (payment) {
      // Update pickup status
      await client.from("pickup_requests").update({
        payment_status: "paid",
        status: "requested",
        updated_at: now,
      }).eq("id", payment.pickup_id);

      // Create status event
      await client.from("pickup_status_events").insert({
        pickup_id: payment.pickup_id,
        to_status: "requested",
        notes: "Payment confirmed via Paystack webhook",
        created_at: now,
      });

      // Award EcoPoints via RPC
      const points = Math.max(100, Math.round((payment.amount_ngn as number || amountNgn) * 0.1));
      await client.rpc("award_ecopoints", {
        p_profile_id: payment.payer_id,
        p_points: points,
        p_transaction_type: "earn",
        p_source_type: "payment",
        p_source_id: payment.pickup_id,
        p_idempotency_key: `payment_${payment.pickup_id}_reward`,
        p_description: `Pickup payment reward — ${points} EcoPoints`,
        p_status: "confirmed",
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
