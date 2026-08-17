import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Canonical public roles (admin/partner are NOT public signup) ──────────
const PUBLIC_ROLES = new Set([
  "household", "estate", "business", "collector", "recycler",
  "organic_partner", "fleet_owner", "corporate_partner", "government",
]);

// Legacy aliases that may be canonicalized (never admin/partner)
const ROLE_ALIASES: Record<string, string> = {
  fleet: "fleet_owner",
  corporate: "corporate_partner",
  customer: "household",
};

// ─── Role-specific allowed detail keys (whitelist) ─────────────────────────
const ROLE_FIELD_WHITELIST: Record<string, string[]> = {
  household: ["pickup_address", "property_type", "household_size", "preferred_window"],
  estate: ["estate_name", "estate_address", "units_count", "manager_role", "weekly_volume_kg"],
  business: ["business_name", "business_type", "rc_number", "service_address", "weekly_volume_kg"],
  collector: ["vehicle_type", "vehicle_plate", "max_capacity_kg", "service_city", "service_zones"],
  recycler: ["organization_name", "rc_number", "accepted_materials", "weekly_capacity_kg", "facility_address"],
  organic_partner: ["organization_name", "operation_type", "rc_number", "accepted_streams", "weekly_capacity_kg", "site_address"],
  fleet_owner: ["fleet_name", "rc_number", "vehicle_count", "vehicle_types", "service_cities"],
  corporate_partner: ["organization_name", "rc_number", "industry", "employee_count", "head_office_address", "sustainability_goals"],
  government: ["agency_name", "agency_level", "jurisdiction", "department", "official_email", "official_phone"],
};

// ─── Required fields per role (server-side enforcement) ────────────────────
const ROLE_REQUIRED_FIELDS: Record<string, string[]> = {
  household: [],
  estate: ["estate_name"],
  business: ["business_name"],
  collector: ["vehicle_type", "service_city"],
  recycler: ["organization_name"],
  organic_partner: ["organization_name"],
  fleet_owner: ["fleet_name"],
  corporate_partner: ["organization_name"],
  government: ["agency_name", "jurisdiction"],
};

// Roles that require verification (pending_review) vs auto-activation
const VERIFICATION_ROLES = new Set([
  "collector", "recycler", "organic_partner", "fleet_owner",
  "corporate_partner", "government",
]);

function normalizeRole(role: string): string {
  const r = (role || "household").toLowerCase().trim();
  const canonical = ROLE_ALIASES[r] || r;
  if (!PUBLIC_ROLES.has(canonical)) return "household";
  return canonical;
}

function sanitizeString(value: unknown, maxLen = 200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function sanitizeArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Whitelist + sanitize role-specific details
function sanitizeDetails(role: string, raw: unknown): Record<string, unknown> {
  const allowed = ROLE_FIELD_WHITELIST[role] || [];
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of allowed) {
    const val = source[key];
    if (val === undefined || val === null) continue;

    if (key === "service_zones" || key === "vehicle_types" || key === "accepted_materials" || key === "accepted_streams" || key === "service_cities") {
      out[key] = sanitizeArray(val);
    } else if (key === "household_size" || key === "units_count" || key === "weekly_volume_kg" || key === "max_capacity_kg" || key === "weekly_capacity_kg" || key === "vehicle_count" || key === "employee_count") {
      const n = sanitizeNumber(val);
      if (n !== null) out[key] = n;
    } else {
      out[key] = sanitizeString(val);
    }
  }

  return out;
}

function validateRequiredFields(role: string, details: Record<string, unknown>): string | null {
  const required = ROLE_REQUIRED_FIELDS[role] || [];
  for (const key of required) {
    const val = details[key];
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      return `Missing required field: ${key}`;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      email, password, full_name, username, phone, phone_e164,
      role, city, state, metadata, registration_details, terms_version,
    } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();

    console.log(`[admin-signup:${requestId}] Request:`, {
      email: normalizedEmail, role, hasPassword: !!password,
    });

    // ── Validate email ──
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate password ──
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate phone (required for operational contact) ──
    const normalizedPhone = sanitizeString(phone, 20);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "A valid phone number is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Canonicalize + reject non-public roles ──
    const canonicalRole = normalizeRole(role);

    // ── Sanitize role-specific details ──
    const rawDetails = registration_details || metadata || {};
    const details = sanitizeDetails(canonicalRole, rawDetails);

    // ── Validate required role fields ──
    const missingField = validateRequiredFields(canonicalRole, details);
    if (missingField) {
      return new Response(
        JSON.stringify({ error: missingField }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // ── Determine approval/status ──
    const requiresVerification = VERIFICATION_ROLES.has(canonicalRole);
    const profileStatus = requiresVerification ? "pending" : "active";
    const kycStatus = requiresVerification ? "pending" : "not_required";
    const onboardingStatus = "pending";

    // ── Step 1: Create auth user ──
    console.log(`[admin-signup:${requestId}] Creating auth user:`, { email: normalizedEmail, role: canonicalRole });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: sanitizeString(full_name, 200) || "Tydigo User",
        username: sanitizeString(username, 30).toLowerCase(),
        phone: normalizedPhone,
        phone_e164: sanitizeString(phone_e164 || phone, 20),
        role: canonicalRole,
        city: sanitizeString(city, 100) || "Abuja",
        state: sanitizeString(state, 100) || "FCT",
        ...details,
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

    // ── Step 2: Create profile via RPC ──
    console.log(`[admin-signup:${requestId}] Creating profile via RPC...`);

    const { data: profileId, error: rpcError } = await supabaseAdmin.rpc(
      "create_profile_for_user",
      {
        p_auth_user_id: authUserId,
        p_full_name: sanitizeString(full_name, 200) || "Tydigo User",
        p_username: sanitizeString(username, 30).toLowerCase(),
        p_email: normalizedEmail,
        p_phone: normalizedPhone,
        p_phone_e164: sanitizeString(phone_e164 || phone, 20),
        p_role: canonicalRole,
        p_city: sanitizeString(city, 100) || "Abuja",
        p_state: sanitizeString(state, 100) || "FCT",
      }
    );

    if (rpcError) {
      console.error(`[admin-signup:${requestId}] RPC profile creation failed:`, rpcError);
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      return new Response(
        JSON.stringify({ error: "Failed to create profile. Please try again.", code: "profile_creation_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Set status/onboarding_status on profile ──
    const { error: statusError } = await supabaseAdmin
      .from("profiles")
      .update({
        status: profileStatus,
        kyc_status: kycStatus,
        onboarding_status: onboardingStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (statusError) {
      console.warn(`[admin-signup:${requestId}] Failed to set profile status:`, statusError.message);
    }

    // ── Step 4: Persist registration application (verification roles) ──
    if (requiresVerification) {
      const { error: appError } = await supabaseAdmin
        .from("registration_applications")
        .insert({
          profile_id: profileId,
          account_type: canonicalRole,
          status: "pending_review",
          details,
          terms_version: sanitizeString(terms_version, 50) || null,
          consented_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
        });

      if (appError) {
        console.error(`[admin-signup:${requestId}] Failed to persist registration application:`, appError.message);
        // Non-fatal: profile still created, but log for admin awareness
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[admin-signup:${requestId}] Success (${elapsed}ms):`, {
      userId: authUserId,
      profileId,
      email: normalizedEmail,
      role: canonicalRole,
      requiresVerification,
    });

    return new Response(
      JSON.stringify({
        success: true,
        approvalRequired: requiresVerification,
        applicationStatus: requiresVerification ? "pending_review" : "approved",
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
