import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Canonical role values that must match the user_role enum
const VALID_ROLES = [
  "household", "estate", "business", "collector", "recycler",
  "organic_partner", "fleet_owner", "corporate_partner", "government",
  "admin", "partner", "customer"
];

function normalizeRole(role: string): string {
  const r = (role || "household").toLowerCase().trim();
  const aliases: Record<string, string> = {
    fleet: "fleet_owner",
    corporate: "corporate_partner",
    customer: "household",
  };
  const canonical = aliases[r] || r;
  if (!VALID_ROLES.includes(canonical)) {
    console.log("[admin-signup] Unknown role, defaulting to household:", canonical);
    return "household";
  }
  return canonical;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, full_name, username, phone, phone_e164, role, city, state } = body;

    console.log("[admin-signup] Request received:", { email: email?.toLowerCase()?.trim(), role });

    if (!email || !password) {
      console.log("[admin-signup] Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const canonicalRole = normalizeRole(role);
    const normalizedEmail = email.toLowerCase().trim();

    console.log("[admin-signup] Normalized:", { email: normalizedEmail, role: canonicalRole });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("[admin-signup] Creating user with admin API...");

    // Create user via admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "Tydigo User",
        username: username || "",
        phone: phone || "",
        phone_e164: phone_e164 || "",
        role: canonicalRole,
        city: city || "Abuja",
        state: state || "FCT",
      },
    });

    if (error) {
      console.error("[admin-signup] Admin API error:", {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
        name: error.name,
      });

      // Check if it's an existing user error
      if ((error as any).status === 422 || (error as any).code === "user_already_exists") {
        return new Response(
          JSON.stringify({
            error: "An account with this email already exists. Please sign in or reset your password.",
            code: "user_already_exists",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: error.message,
          code: (error as any).code,
          status: (error as any).status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-signup] User created successfully:", {
      id: data.user?.id,
      email: data.user?.email,
      email_confirmed: data.user?.email_confirmed_at,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          email_confirmed_at: data.user?.email_confirmed_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[admin-signup] Unexpected error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
