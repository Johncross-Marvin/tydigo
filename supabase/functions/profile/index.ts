/**
 * Tydigo Profile Edge Function
 *
 * Server-side profile operations: update profile, verify bank,
 * upload avatar, calculate profile completion.
 */

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case "update-profile": return await updateProfile(supabaseClient, user, body);
      case "verify-bank": return await verifyBank(supabaseClient, user, body);
      case "calculate-completion": return await calculateCompletion(supabaseClient, user);
      case "get-full-profile": return await getFullProfile(supabaseClient, user);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[profile] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getProfile(client: ReturnType<typeof createClient>, authUserId: string) {
  const { data } = await client.from("profiles")
    .select("*").eq("auth_user_id", authUserId).maybeSingle();
  return data;
}

async function updateProfile(
  client: ReturnType<typeof createClient>,
  user: { id: string },
  body: Record<string, unknown>,
) {
  const profile = await getProfile(client, user.id);
  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowedFields = ["full_name", "bio", "date_of_birth", "gender", "language", "timezone"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await client.from("profiles")
    .update(updates)
    .eq("id", profile.id)
    .select()
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log activity
  await client.from("activity_logs").insert({
    profile_id: profile.id,
    activity_type: "profile_update",
    description: "Updated profile information",
  });

  return new Response(JSON.stringify({ profile: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyBank(
  client: ReturnType<typeof createClient>,
  user: { id: string },
  body: { accountId: string },
) {
  const profile = await getProfile(client, user.id);
  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: account } = await client.from("bank_accounts")
    .select("*").eq("id", body.accountId).eq("profile_id", profile.id).maybeSingle();

  if (!account) {
    return new Response(JSON.stringify({ error: "Bank account not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // In production, call Paystack resolve account API here
  // For now, mark as verified
  const { data, error } = await client.from("bank_accounts")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("id", body.accountId)
    .select()
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ account: data, verified: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function calculateCompletion(
  client: ReturnType<typeof createClient>,
  user: { id: string },
) {
  const profile = await getProfile(client, user.id);
  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fields = [
    { key: "full_name", weight: 10 },
    { key: "phone", weight: 10 },
    { key: "email", weight: 10 },
    { key: "username", weight: 5 },
    { key: "avatar_url", weight: 5 },
    { key: "bio", weight: 5 },
    { key: "date_of_birth", weight: 5 },
    { key: "gender", weight: 5 },
    { key: "default_city", weight: 5 },
    { key: "kyc_status", weight: 15, check: (v: unknown) => v === "approved" },
    { key: "email_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "phone_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "last_login", weight: 5, check: (v: unknown) => !!v },
  ];

  let score = 0;
  for (const field of fields) {
    const val = (profile as Record<string, unknown>)[field.key];
    if (field.check ? field.check(val) : !!val) {
      score += field.weight;
    }
  }

  const pct = Math.min(100, score);

  await client.from("profiles")
    .update({ profile_completion: pct, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  return new Response(JSON.stringify({ completionPct: pct }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getFullProfile(
  client: ReturnType<typeof createClient>,
  user: { id: string },
) {
  const profile = await getProfile(client, user.id);
  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch related data
  const [
    { data: wallet },
    { data: ecoWallet },
    { data: addresses },
    { data: banks },
    { data: emergencies },
    { data: kyc },
    { data: privacy },
  ] = await Promise.all([
    client.from("wallets").select("*").eq("profile_id", profile.id).maybeSingle(),
    client.from("eco_points_wallets").select("*").eq("profile_id", profile.id).maybeSingle(),
    client.from("addresses").select("*").eq("profile_id", profile.id).order("is_default", { ascending: false }),
    client.from("bank_accounts").select("*").eq("profile_id", profile.id),
    client.from("emergency_contacts").select("*").eq("profile_id", profile.id),
    client.from("kyc_documents").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
    client.from("privacy_settings").select("*").eq("profile_id", profile.id).maybeSingle(),
  ]);

  return new Response(JSON.stringify({
    profile,
    wallet: wallet || null,
    ecoPointsWallet: ecoWallet || null,
    addresses: addresses || [],
    bankAccounts: banks || [],
    emergencyContacts: emergencies || [],
    kycDocuments: kyc || [],
    privacySettings: privacy || null,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
