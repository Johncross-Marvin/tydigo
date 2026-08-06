import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const path = url.pathname.replace("/payment", "");

    // POST /payment/initialize — initialize a payment
    if (req.method === "POST" && path === "/initialize") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { pickupId, amountNgn, email } = await req.json();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reference = `TYD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const customerEmail = email || profile.email || `${profile.phone}@tydigo.user`;

      // Initialize with Paystack
      let authorizationUrl = "";
      let paystackInitialized = false;

      if (PAYSTACK_SECRET_KEY) {
        try {
          const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: customerEmail,
              amount: amountNgn * 100, // kobo
              reference,
              currency: "NGN",
              metadata: { pickup_id: pickupId, profile_id: profile.id },
            }),
          });

          const paystackData = await paystackRes.json();
          if (paystackData.status && paystackData.data?.authorization_url) {
            authorizationUrl = paystackData.data.authorization_url;
            paystackInitialized = true;
          }
        } catch (e) {
          console.error("[payment] Paystack init error:", e);
        }
      }

      // Record payment in DB
      const now = new Date().toISOString();
      const { data: payment, error: dbError } = await supabase
        .from("payments")
        .insert({
          pickup_id: pickupId,
          payer_id: profile.id,
          amount_ngn: amountNgn,
          currency: "NGN",
          provider: "paystack",
          provider_reference: reference,
          status: "pending",
          created_at: now,
        })
        .select()
        .maybeSingle();

      if (dbError) throw dbError;

      return new Response(JSON.stringify({
        payment: {
          reference,
          amountNgn,
          status: "pending",
          authorizationUrl: authorizationUrl || undefined,
        },
        paystackInitialized,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /payment/webhook — Paystack webhook handler
    if (req.method === "POST" && path === "/webhook") {
      const signature = req.headers.get("x-paystack-signature");
      const body = await req.text();

      // Verify webhook signature (if secret is set)
      if (PAYSTACK_SECRET_KEY) {
        // In production, verify the HMAC signature here
        // const crypto = await import("https://deno.land/std@0.190.0/crypto/mod.ts");
      }

      const event = JSON.parse(body);
      console.log("[payment] Webhook received:", event.event);

      if (event.event === "charge.success") {
        const { reference, metadata, amount } = event.data;
        const amountNgn = amount / 100;

        // Update payment status
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("provider_reference", reference)
          .maybeSingle();

        if (payment) {
          const now = new Date().toISOString();
          await supabase
            .from("payments")
            .update({ status: "paid", paid_at: now })
            .eq("provider_reference", reference);

          // Update pickup payment status
          if (payment.pickup_id) {
            await supabase
              .from("pickup_requests")
              .update({ payment_status: "paid", updated_at: now })
              .eq("id", payment.pickup_id);
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /payment/verify/:reference — verify a payment
    if (req.method === "GET" && path.startsWith("/verify/")) {
      const reference = path.replace("/verify/", "");

      const { data: payment } = await supabase
        .from("payments")
        .select("status, amount_ngn")
        .eq("provider_reference", reference)
        .maybeSingle();

      if (!payment) {
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify with Paystack if key is available
      if (PAYSTACK_SECRET_KEY && payment.status === "pending") {
        try {
          const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}` },
          });
          const verifyData = await verifyRes.json();

          if (verifyData.status && verifyData.data?.status === "success") {
            const now = new Date().toISOString();
            await supabase
              .from("payments")
              .update({ status: "paid", paid_at: now })
              .eq("provider_reference", reference);

            return new Response(JSON.stringify({ status: "paid", amountNgn: payment.amount_ngn }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error("[payment] Verify error:", e);
        }
      }

      return new Response(JSON.stringify({ status: payment.status, amountNgn: payment.amount_ngn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[payment] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
