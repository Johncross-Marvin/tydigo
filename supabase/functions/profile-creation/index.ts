import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the service role key for sensitive mutations. The caller's identity
    // is still verified below via the user-scoped client.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, role, city, state, username, email, phone } = await req.json();

    // Normalize role to a valid user_role enum value.
    let canonicalRole = role || "household";
    if (canonicalRole === "fleet") canonicalRole = "fleet_owner";
    if (canonicalRole === "corporate") canonicalRole = "corporate_partner";
    if (canonicalRole === "customer") canonicalRole = "household";
    if (canonicalRole === "admin") canonicalRole = "household";

    // Determine status/kyc consistently with create_profile_for_user RPC.
    const status =
      canonicalRole === "government" || canonicalRole === "collector"
        ? "pending"
        : "active";
    const kycStatus =
      canonicalRole === "collector" ||
      canonicalRole === "recycler" ||
      canonicalRole === "organic_partner" ||
      canonicalRole === "fleet_owner"
        ? "pending"
        : "not_required";

    // Check if profile already exists
    const { data: existing } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ profile: existing, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Create profile
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        phone: phone || "",
        email: email || user.email || null,
        full_name: fullName || user.user_metadata?.full_name || "Tydigo User",
        username: username || null,
        role: canonicalRole,
        default_city: city || "Abuja",
        default_state: state || "FCT",
        country: "Nigeria",
        language: "en",
        timezone: "Africa/Lagos",
        ecopoints: 500,
        rating: 5.0,
        total_pickups: 0,
        total_kg_recycled: 0,
        kyc_status: kycStatus,
        status,
        account_type: canonicalRole,
        onboarding_status: "pending",
        profile_completion: 20,
        email_verified: user.email_confirmed_at ? true : false,
        phone_verified: user.phone_confirmed_at ? true : false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (profileError) {
      console.error("[profile-creation] Profile insert error:", profileError);
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create wallet
    const { error: walletError } = await serviceClient
      .from("wallets")
      .insert({
        profile_id: profile.id,
        balance_ngn: 0,
        total_earned_ngn: 0,
        created_at: now,
        updated_at: now,
      });

    if (walletError) {
      console.error("[profile-creation] Wallet creation error:", walletError);
    }

    // Create EcoPoints wallet
    const { error: ecoError } = await serviceClient
      .from("eco_points_wallets")
      .insert({
        profile_id: profile.id,
        balance: 500,
        lifetime_earned: 500,
        lifetime_redeemed: 0,
        created_at: now,
        updated_at: now,
      });

    if (ecoError) {
      console.error("[profile-creation] EcoPoints wallet error:", ecoError);
    }

    // Create notification preferences
    const { error: notifError } = await serviceClient
      .from("notification_preferences")
      .insert({
        profile_id: profile.id,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: true,
        pickup_updates: true,
        payment_updates: true,
        ecopoints_updates: true,
        promotional: false,
        security_alerts: true,
        created_at: now,
        updated_at: now,
      });

    if (notifError) {
      console.error("[profile-creation] Notification prefs error:", notifError);
    }

    // Create role-specific profile
    await createRoleProfile(serviceClient, profile.id, canonicalRole, now);

    // Log security event
    await serviceClient.from("security_logs").insert({
      profile_id: profile.id,
      auth_user_id: user.id,
      event_type: "signup",
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
      metadata: { role: canonicalRole, city, state },
      created_at: now,
    });

    // Award signup EcoPoints using the atomic RPC for wallet tracking,
    // idempotency, and balance reconciliation.
    const { error: awardError } = await serviceClient.rpc("award_ecopoints", {
      p_profile_id: profile.id,
      p_points: 500,
      p_transaction_type: "earn",
      p_source_type: "signup",
      p_idempotency_key: `signup_${profile.id}_bonus`,
      p_description: "Signup bonus",
      p_status: "confirmed",
    });

    if (awardError) {
      console.error("[profile-creation] award_ecopoints error:", awardError);
    }

    return new Response(JSON.stringify({ profile, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[profile-creation] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createRoleProfile(
  client: ReturnType<typeof createClient>,
  profileId: string,
  role: string,
  now: string
) {
  const basePayload = { profile_id: profileId, created_at: now, updated_at: now };

  switch (role) {
    case "collector":
      await client.from("collector_profiles").insert({
        ...basePayload,
        is_online: false,
        kyc_status: "pending",
        safety_training_completed: false,
        total_earnings_ngn: 0,
        service_city: "Abuja",
      });
      break;
    case "business":
    case "estate":
      await client.from("business_profiles").insert({
        ...basePayload,
        business_name: "",
      });
      break;
    case "recycler":
      await client.from("recycler_profiles").insert(basePayload);
      break;
    case "organic_partner":
      await client.from("organic_partner_profiles").insert(basePayload);
      break;
    case "fleet_owner":
      await client.from("fleet_profiles").insert(basePayload);
      break;
    case "government":
      await client.from("government_profiles").insert(basePayload);
      break;
    case "corporate_partner":
      await client.from("corporate_profiles").insert(basePayload);
      break;
    case "partner":
      await client.from("partner_profiles").insert({
        ...basePayload,
        partner_type: "plastic_recycler",
        organization_name: "",
      });
      break;
    default:
      // customer/household — already handled by customer_profiles in original migration
      break;
  }
}
