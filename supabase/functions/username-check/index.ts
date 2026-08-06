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
    );

    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    if (!username || username.length < 3) {
      return new Response(JSON.stringify({ available: false, reason: "Username must be at least 3 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return new Response(JSON.stringify({ available: false, reason: "Username must be 3-30 lowercase letters/numbers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    return new Response(JSON.stringify({ available: !data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[username-check] Error:", err);
    return new Response(JSON.stringify({ available: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
