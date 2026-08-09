import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = new Set([
  "household", "estate", "business", "collector", "recycler",
  "organic_partner", "fleet_owner", "corporate_partner", "government",
  "admin", "partner", "customer"
]);

function normalizeRole(role: string): string {
  const r = (role || "household").toLowerCase().trim();
  const aliases: Record<string, string> = {
    fleet: "fleet_owner",
    corporate: "corporate_partner",
    customer: "household",
  };
  const canonical = aliases[r] || r;
  if (!VALID_ROLES.has(canonical)) return "household";
  if (canonical === "admin") return "household";
  return canonical;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { email, password, full_name, username, phone, phone_e164, role, city, state } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();

    console.log(`[admin-signup:${requestId}] Request:`, {
      email: normalizedEmail, role, hasPassword: !!password,
    });

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const canonicalRole = normalizeRole(role);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Step 1: Create auth user ──────────────────────────────────
    console.log(`[admin-signup:${requestId}] Creating auth user:`, { email: normalizedEmail, role: canonicalRole });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: (full_name || "Tydigo User").trim(),
        username: (username || "").toLowerCase().trim(),
        phone: (phone || "").trim(),
        phone_e164: (phone_e164 || phone || "").trim(),
        role: canonicalRole,
        city: (city || "Abuja").trim(),
        state: (state || "FCT").trim(),
      },
    });

    if (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[admin-signup:${requestId}] Auth user creation failed (${elapsed}ms):`, {
        message: error.message,
        status: (error as Record<string, unknown>).status,
        code: (error as Record<string, unknown>).code,
      });

      if ((error as Record<string, unknown>).status === 422 ||
          error.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists.", code: "user_already_exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: error.message, code: (error as Record<string, unknown>).code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = data.user?.id;
    if (!authUserId) {
      return new Response(
        JSON.stringify({ error: "User created but no ID returned." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[admin-signup:${requestId}] Auth user created:`, { userId: authUserId });

    // ── Step 2: Create profile via RPC (handles user_role cast properly) ──
    console.log(`[admin-signup:${requestId}] Creating profile via RPC...`);

    const { data: profileId, error: rpcError } = await supabaseAdmin.rpc(
      "create_profile_for_user",
      {
        p_auth_user_id: authUserId,
        p_full_name: (full_name || "Tydigo User").trim(),
        p_username: (username || "").toLowerCase().trim(),
        p_email: normalizedEmail,
        p_phone: (phone || "").trim(),
        p_phone_e164: (phone_e164 || phone || "").trim(),
        p_role: canonicalRole,
        p_city: (city || "Abuja").trim(),
        p_state: (state || "FCT").trim(),
      }
    );

    if (rpcError) {
      console.error(`[admin-signup:${requestId}] RPC profile creation failed:`, rpcError);
      // Clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      return new Response(
        JSON.stringify({ error: "Failed to create profile. Please try again.", code: "profile_creation_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[admin-signup:${requestId}] Success (${elapsed}ms):`, {
      userId: authUserId,
      profileId,
      email: normalizedEmail,
      role: canonicalRole,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUserId,
          email: data.user?.email,
          email_confirmed_at: data.user?.email_confirmed_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[admin-signup:${requestId}] Unexpected error (${elapsed}ms):`, {
      message: err instanceof Error ? err.message : String(err),
    });

    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again.", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
