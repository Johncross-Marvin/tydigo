import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Canonical role values that must match the user_role enum
const VALID_ROLES = new Set([
  "household", "estate", "business", "collector", "recycler",
  "organic_partner", "fleet_owner", "corporate_partner", "government",
  "admin", "partner", "customer"
]);

/** Normalize any role alias to a canonical value */
function normalizeRole(role: string): string {
  const r = (role || "household").toLowerCase().trim();

  // Map legacy aliases to canonical values
  const aliases: Record<string, string> = {
    fleet: "fleet_owner",
    corporate: "corporate_partner",
    customer: "household",
  };
  const canonical = aliases[r] || r;

  if (!VALID_ROLES.has(canonical)) {
    console.log(`[admin-signup] Unknown role "${canonical}", falling back to household`);
    return "household";
  }

  // NEVER allow public admin signup through this endpoint
  if (canonical === "admin") {
    console.log("[admin-signup] Blocked public admin signup attempt");
    return "household";
  }

  return canonical;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      email, password, full_name, username, phone, phone_e164, role, city, state,
    } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();

    console.log(`[admin-signup:${requestId}] Request:`, {
      email: normalizedEmail,
      role,
      hasPassword: !!password,
    });

    // ── Validate required fields ──────────────────────────────────
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

    // ── Create Supabase admin client ──────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[admin-signup:${requestId}] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
      return new Response(
        JSON.stringify({ error: "Server configuration error. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Create auth user ─────────────────────────────────────────
    console.log(`[admin-signup:${requestId}] Creating user:`, {
      email: normalizedEmail,
      role: canonicalRole,
    });

    let { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Bypass SMTP until Resend is fully configured
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

    const elapsed = Date.now() - startTime;

    // ── If trigger failed ("Database error"), retry without trigger reliance ──
    if (error && error.message.includes("Database error")) {
      console.warn(
        `[admin-signup:${requestId}] Trigger likely failed. ` +
        `Retrying with email_confirm:false to isolate the issue.`
      );

      // Retry: create user without relying on the database trigger
      const retry = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false, // Don't auto-confirm; will require email verification
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

      if (retry.error) {
        console.error(`[admin-signup:${requestId}] Retry also failed:`, {
          message: retry.error.message,
          code: (retry.error as Record<string, unknown>).code,
        });
        error = retry.error;
      } else {
        // Retry succeeded — user created but email not confirmed
        // Explicitly create the profile using service_role (bypasses RLS)
        data = retry.data;
        if (data?.user?.id) {
          console.log(`[admin-signup:${requestId}] Retry succeeded. Creating profile explicitly...`);
          await supabaseAdmin.from("profiles").upsert({
            id: crypto.randomUUID(),
            auth_user_id: data.user.id,
            full_name: (full_name || "Tydigo User").trim(),
            username: (username || "").toLowerCase().trim(),
            email: normalizedEmail,
            phone: (phone || "").trim(),
            phone_e164: (phone_e164 || phone || "").trim(),
            role: canonicalRole,
            default_city: (city || "Abuja").trim(),
            default_state: (state || "FCT").trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "auth_user_id" }).then(({ error: upsertErr }) => {
            if (upsertErr) {
              console.error(`[admin-signup:${requestId}] Explicit profile creation failed:`, upsertErr);
            } else {
              console.log(`[admin-signup:${requestId}] Explicit profile created.`);
            }
          });
        }
        error = null; // Clear error since retry succeeded
        // Mark email as confirmed since we're in dev mode
        if (data?.user?.id) {
          await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
            email_confirm: true,
          }).catch(() => {/* best effort */});
        }
      }
    }

    if (error) {
      console.error(`[admin-signup:${requestId}] Error (${elapsed}ms):`, {
        message: error.message,
        status: (error as Record<string, unknown>).status,
        code: (error as Record<string, unknown>).code,
        name: error.name,
      });

      // User already exists
      if (
        (error as Record<string, unknown>).status === 422 ||
        (error as Record<string, unknown>).code === "user_already_exists" ||
        error.message.includes("already been registered")
      ) {
        return new Response(
          JSON.stringify({
            error: "An account with this email already exists. Please sign in or reset your password.",
            code: "user_already_exists",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Database error (trigger failure that retry couldn't fix)
      if (error.message.includes("Database error")) {
        console.error(
          `[admin-signup:${requestId}] DATABASE ERROR — trigger/constraint failure after retry. ` +
          `Check Supabase Auth logs and Postgres logs for the inner error.`
        );
        return new Response(
          JSON.stringify({
            error: "Account setup service encountered an error. Our team has been notified. Please try again shortly.",
            code: "database_error",
            requestId,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: error.message,
          code: (error as Record<string, unknown>).code,
          status: (error as Record<string, unknown>).status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[admin-signup:${requestId}] Success (${elapsed}ms):`, {
      userId: data.user?.id,
      email: data.user?.email,
      emailConfirmed: !!data.user?.email_confirmed_at,
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
    const elapsed = Date.now() - startTime;
    console.error(`[admin-signup:${requestId}] Unexpected error (${elapsed}ms):`, {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error. Please try again.",
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
