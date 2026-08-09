/**
 * get-profile Edge Function
 *
 * Reads the current authenticated user's profile using service_role,
 * completely bypassing RLS. This is a stopgap until the RLS recursion
 * fix (migration 0016) is deployed to production.
 *
 * Deploy: npx supabase functions deploy get-profile --no-verify-jwt
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the access token from the Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace("Bearer ", "");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not authenticated." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client (service_role bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the access token by getting the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read profile using service_role (bypasses RLS entirely)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[get-profile] Profile query error:", profileError);
      return new Response(
        JSON.stringify({
          error: "Could not read profile.",
          code: profileError.code,
          details: profileError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      // Profile missing — try to create one
      console.log(`[get-profile] Profile missing for user ${user.id}, attempting repair...`);

      const role = (user.user_metadata?.role as string) || "household";
      const fullName = (user.user_metadata?.full_name as string) || "Tydigo User";
      const email = user.email || "";
      const username = (user.user_metadata?.username as string) || "";
      const phone = (user.user_metadata?.phone as string) || "";
      const phoneE164 = (user.user_metadata?.phone_e164 as string) || "";
      const city = (user.user_metadata?.city as string) || "Abuja";
      const state = (user.user_metadata?.state as string) || "FCT";

      // Map legacy roles
      let canonicalRole = role;
      if (canonicalRole === "fleet") canonicalRole = "fleet_owner";
      if (canonicalRole === "corporate") canonicalRole = "corporate_partner";
      if (canonicalRole === "customer") canonicalRole = "household";

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: crypto.randomUUID(),
          auth_user_id: user.id,
          full_name: fullName,
          username: username,
          email: email,
          phone: phone,
          phone_e164: phoneE164,
          role: canonicalRole,
          default_city: city,
          default_state: state,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "auth_user_id" })
        .select("*")
        .single();

      if (insertError) {
        console.error("[get-profile] Profile repair failed:", insertError);
        return new Response(
          JSON.stringify({ error: "Account setup incomplete.", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ profile: newProfile, repaired: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ profile, repaired: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-profile] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
