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

// Only return these fields to the client — never expose internal/sensitive columns
const PROFILE_COLUMNS = [
  "id",
  "auth_user_id",
  "full_name",
  "username",
  "email",
  "phone",
  "phone_e164",
  "role",
  "avatar_url",
  "default_city",
  "default_state",
  "default_lat",
  "default_lng",
  "ecopoints",
  "rating",
  "total_pickups",
  "total_kg_recycled",
  "kyc_status",
  "account_type",
  "country",
  "language",
  "timezone",
  "last_login",
  "city_id",
  "state_id",
  "country_id",
  "bio",
  "email_verified",
  "phone_verified",
  "date_of_birth",
  "gender",
  "profile_completion",
  "status",
  "onboarding_status",
  "created_at",
  "updated_at",
].join(",");

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

    // Read profile using service_role (bypasses RLS entirely).
    // Only select allowed columns — never expose internal fields.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLUMNS)
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
      // Profile missing — do NOT auto-create.
      // Profile creation is handled exclusively by the handle_new_user DB trigger
      // and the admin-signup edge function.
      console.log(`[get-profile] Profile missing for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Profile not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ profile }),
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
