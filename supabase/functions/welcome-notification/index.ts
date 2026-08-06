/**
 * Tydigo Welcome Notification Edge Function
 *
 * Sends welcome notifications (email, SMS, push) when a user
 * completes onboarding or signs up. Triggered by the client
 * after onboarding completion.
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

    const { action, profileId } = await req.json();

    switch (action) {
      case "welcome": return await sendWelcome(supabaseClient, profileId, user);
      case "reminder": return await sendReminder(supabaseClient, profileId);
      case "completion": return await sendCompletion(supabaseClient, profileId);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[welcome-notification] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWelcome(
  client: ReturnType<typeof createClient>,
  profileId: string,
  _user: { id: string },
) {
  const { data: profile } = await client.from("profiles")
    .select("full_name, phone, email, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = profile.full_name || "there";
  const roleLabel = getRoleLabel(profile.role);

  // Create in-app notification
  await client.from("notifications").insert({
    profile_id: profileId,
    title: `Welcome to Tydigo, ${name}! 🎉`,
    body: `You're now registered as a ${roleLabel}. Complete your onboarding to start earning EcoPoints and making an impact.`,
    type: "system",
    read: false,
    created_at: new Date().toISOString(),
  });

  // Create welcome email notification (queued for email service)
  await client.from("notification_queue").insert({
    profile_id: profileId,
    channel: "email",
    subject: `Welcome to Tydigo, ${name}!`,
    body: `Hi ${name},\n\nWelcome to Tydigo! You've joined as a ${roleLabel}. Complete your onboarding to start scheduling pickups, earning EcoPoints, and making a real environmental impact.\n\nGet started: complete your onboarding journey in the app.\n\n— The Tydigo Team`,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  // SMS welcome (queued)
  if (profile.phone) {
    await client.from("notification_queue").insert({
      profile_id: profileId,
      channel: "sms",
      subject: null,
      body: `Welcome to Tydigo, ${name}! You're now a ${roleLabel}. Complete onboarding to start earning EcoPoints. 🌍`,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({ ok: true, message: "Welcome notifications queued" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendReminder(
  client: ReturnType<typeof createClient>,
  profileId: string,
) {
  const { data: profile } = await client.from("profiles")
    .select("full_name, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = profile.full_name || "there";

  await client.from("notifications").insert({
    profile_id: profileId,
    title: "Finish setting up your account",
    body: `Hi ${name}, you haven't completed your onboarding yet. Finish in just a few minutes to unlock all features!`,
    type: "system",
    read: false,
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendCompletion(
  client: ReturnType<typeof createClient>,
  profileId: string,
) {
  const { data: profile } = await client.from("profiles")
    .select("full_name, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = profile.full_name || "there";

  await client.from("notifications").insert({
    profile_id: profileId,
    title: "🎉 Onboarding Complete!",
    body: `Congratulations ${name}! You've earned 500 EcoPoints. Your dashboard is now unlocked — start making an impact today!`,
    type: "ecopoints",
    read: false,
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    household: "Household Member",
    estate: "Estate Manager",
    business: "Business",
    collector: "Collector",
    recycler: "Recycler",
    organic_partner: "Organic Waste Partner",
    fleet: "Fleet Operator",
    corporate: "Corporate Partner",
    government: "Government Agency",
    admin: "Administrator",
    partner: "Partner",
    customer: "Customer",
  };
  return labels[role] || role;
}
