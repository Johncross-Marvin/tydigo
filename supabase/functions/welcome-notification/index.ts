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
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profileId } = await req.json();

    if (!profileId) {
      return new Response(JSON.stringify({ error: "profileId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const welcomeMessages = [
      {
        type: "system",
        title: "Welcome to Tydigo! 🌍",
        body: "Thank you for joining. Start by scheduling your first waste pickup or exploring your dashboard.",
      },
      {
        type: "ecopoints",
        title: "500 EcoPoints Bonus! 🎉",
        body: "You've earned 500 EcoPoints as a welcome bonus. Start recycling to earn more!",
      },
      {
        type: "system",
        title: "Complete Your Profile",
        body: "Add your address and verify your identity to unlock all features.",
      },
    ];

    const now = new Date().toISOString();
    for (const msg of welcomeMessages) {
      await supabaseClient.from("notifications").insert({
        recipient_id: profileId,
        type: msg.type,
        title: msg.title,
        body: msg.body,
        read: false,
        created_at: now,
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: welcomeMessages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[welcome-notification] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
