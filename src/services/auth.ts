/**
 * Tydigo Auth Service — Production
 *
 * Email/password authentication with username + phone login aliases.
 * Multi-identifier login: email, username, or phone + password.
 * Database trigger provisions profiles automatically on auth.users INSERT.
 * Phone OTP / Twilio removed.
 */

import { supabase, isSupabaseAvailable, generateId, normalizePhone } from "@/lib/supabase";
import { normalizeNigerianPhone, maskPhone } from "@/utils/phone";
import { setSessionToken, clearSessionToken } from "@/lib/api";
import { hasSupabase, APP_ENV, SUPABASE_ANON_KEY } from "@/lib/env";
import type { UserRole, AuthUser } from "@/lib/api";

export type { AuthUser, UserRole };

class AuthError extends Error {
  constructor(message: string, public code?: string) { super(message); this.name = "AuthError"; }
}

function friendlyMessage(error: unknown): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const msg = err.message;
  const code = (error as { code?: string }).code;
  const status = (error as { status?: number }).status;

  // Structured development logging
  console.error("[Tydigo Auth Error]", {
    message: msg,
    code,
    status,
    name: err.name,
    timestamp: new Date().toISOString(),
  });

  if (msg.includes("Invalid login") || msg.includes("Invalid login details")) return "Invalid login details.";
  if (msg.includes("Email not confirmed") || msg.includes("not verified")) return "Please verify your email before continuing.";
  if (msg.includes("already registered") || msg.includes("already exists") || code === "user_already_exists") return "An account with this email already exists.";
  if (msg.includes("weak") || msg.includes("password")) return "Password must be at least 8 characters with letters and numbers.";
  if (msg.includes("rate") || msg.includes("too many")) return "Too many attempts. Please wait and try again.";
  if (msg.includes("network") || msg.includes("fetch")) return "Network error. Please check your connection.";
  if (msg.includes("Database error") || status === 500) return "We couldn't create your account because our account setup service encountered an error. Please try again shortly.";
  if (APP_ENV === "development") return msg;
  return "Something went wrong. Please try again.";
}

function requireClient() {
  if (!isSupabaseAvailable() || !supabase) throw new AuthError("Authentication is not configured.");
  return supabase;
}

// ─── Sign Up ──────────────────────────────────────────────────

export type SignUpParams = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  state?: string;
  role: UserRole;
};

export async function signUp(params: SignUpParams) {
  const phoneE164 = normalizeNigerianPhone(params.phone);
  const normalizedEmail = params.email.toLowerCase().trim();

  // ENFORCE: Email is REQUIRED for all signups
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthError("A valid email address is required to create an account.");
  }

  // ENFORCE: Password must be at least 8 characters
  if (!params.password || params.password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }

  // Map frontend role to canonical DB role
  const canonicalRole = mapToCanonicalRole(params.role);

  console.log("[Tydigo Auth] Signup request:", {
    email: normalizedEmail,
    role: canonicalRole,
    hasPassword: !!params.password,
  });

  // Use edge function to create user via admin API (bypasses SMTP email issues)
  let response: Response;
  try {
    response = await fetch(
      "https://gwsywtptelowvbcwplsj.supabase.co/functions/v1/admin-signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: params.password,
          full_name: params.fullName.trim(),
          username: params.username.toLowerCase().trim(),
          phone: params.phone.trim(),
          phone_e164: phoneE164,
          role: canonicalRole,
          city: params.city,
          state: params.state || "FCT",
        }),
      }
    );
  } catch (fetchError) {
    console.error("[Tydigo Auth] Network error calling admin-signup:", fetchError);
    throw new AuthError("Network error. Please check your connection and try again.");
  }

  let result: { success?: boolean; error?: string; code?: string; user?: unknown };
  try {
    result = await response.json();
  } catch {
    console.error("[Tydigo Auth] admin-signup returned non-JSON response, status:", response.status);
    throw new AuthError("Account service temporarily unavailable. Please try again.");
  }

  console.log("[Tydigo Auth] admin-signup response:", {
    status: response.status,
    ok: response.ok,
    success: result.success,
    error: result.error,
    code: result.code,
  });

  if (!response.ok || !result.success) {
    const errorMsg = result.error || "Unable to create account. Please try again.";
    const errorCode = result.code;
    throw new AuthError(errorMsg, errorCode);
  }

  // Now sign in the user to get a session
  const client = requireClient();
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: params.password,
  });

  if (signInError) {
    // User was created but sign-in failed — still return success
    console.error("[Tydigo Auth] Sign-in after signup failed:", {
      message: signInError.message,
      status: signInError.status,
      code: (signInError as { code?: string }).code,
    });
    return { user: result.user, needsVerification: false };
  }

  if (signInData.session?.access_token) {
    setSessionToken(signInData.session.access_token);
  }

  return { user: signInData.user, needsVerification: false };
}

/** Map any role alias to the canonical DB role value. */
function mapToCanonicalRole(role: string): string {
  const mapping: Record<string, string> = {
    fleet: "fleet_owner",
    fleet_owner: "fleet_owner",
    corporate: "corporate_partner",
    corporate_partner: "corporate_partner",
    household: "household",
    estate: "estate",
    business: "business",
    collector: "collector",
    recycler: "recycler",
    organic_partner: "organic_partner",
    government: "government",
    partner: "partner",
    admin: "admin",
    customer: "household",
  };
  return mapping[role] || role;
}

// ─── Sign In (Multi-Identifier) ───────────────────────────────

export async function signIn(identifier: string, password: string) {
  const client = requireClient();
  const email = await resolveIdentifier(identifier);

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new AuthError(friendlyMessage(error));
  if (!data.user?.email_confirmed_at) throw new AuthError("Please verify your email before continuing.");

  const profile = await getOrFetchProfile(data.user.id);
  if (data.session?.access_token) setSessionToken(data.session.access_token);
  return { user: profile };
}

// ─── Identifier Resolution ────────────────────────────────────

async function resolveIdentifier(identifier: string): Promise<string> {
  const trimmed = identifier.trim();

  // Email pattern — return directly, no profile lookup needed
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Username/phone lookup: these require querying profiles which may fail
  // if RLS is broken. Catch errors gracefully and fall through to email error.
  const client = requireClient();

  // Phone pattern (digits only, 10+ digits)
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    try {
      const normalized = normalizeNigerianPhone(trimmed);
      const { data, error } = await client
        .from("profiles")
        .select("email")
        .eq("phone_e164", normalized)
        .maybeSingle();
      if (!error && data?.email) return data.email as string;
    } catch {
      // Profile query failed — fall through
      console.warn("[Tydigo Auth] Phone lookup failed, falling through to email-only");
    }
  }

  // Username lookup
  const username = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (username.length >= 3) {
    try {
      const { data, error } = await client
        .from("profiles")
        .select("email")
        .eq("username", username)
        .maybeSingle();
      if (!error && data?.email) return data.email as string;
    } catch {
      console.warn("[Tydigo Auth] Username lookup failed, falling through to email-only");
    }
  }

  // If username/phone lookup failed or returned nothing, and the input
  // doesn't look like an email, we can't resolve it.
  throw new AuthError("Invalid login details. Please use your email address to sign in.");
}

// ─── Get Profile ──────────────────────────────────────────────
// Uses the get-profile edge function (service_role) to bypass RLS.
// Falls back to direct query + RPC if edge function is unavailable.

async function getOrFetchProfile(authUserId: string): Promise<AuthUser> {
  const client = requireClient();

  // PRIMARY PATH: Use edge function (bypasses RLS entirely via service_role)
  try {
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (accessToken) {
      const edgeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (edgeResponse.ok) {
        const result = await edgeResponse.json();
        if (result.profile) {
          console.log("[Tydigo Auth] Profile loaded via edge function:", {
            profileId: result.profile.id,
            role: result.profile.role,
            repaired: result.repaired,
          });
          return mapProfile(result.profile as Record<string, unknown>);
        }
        if (result.error) {
          console.warn("[Tydigo Auth] Edge function returned error:", result.error);
        }
      } else {
        console.warn("[Tydigo Auth] Edge function unavailable, status:", edgeResponse.status);
      }
    }
  } catch (edgeErr) {
    console.warn("[Tydigo Auth] Edge function call failed, falling back to direct query:", edgeErr);
  }

  // FALLBACK: Direct query + RPC repair
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("[Tydigo Auth] Profile query error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      authUserId,
      timestamp: new Date().toISOString(),
    });

    // 500-level errors indicate a server/database issue, not a missing profile.
    if (
      error.code === "PGRST301" ||
      error.code === "42P17" ||
      String(error.code) === "500" ||
      String((error as { status?: number }).status) === "500"
    ) {
      // Try RPC fallback which uses SECURITY DEFINER to bypass RLS
      try {
        console.log("[Tydigo Auth] Direct query failed, trying RPC fallback...");
        const { data: rpcData, error: rpcError } = await client.rpc("get_my_profile");
        if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
          const profile = (rpcData as unknown[])[0];
          console.log("[Tydigo Auth] RPC fallback succeeded");
          return mapProfile(profile as Record<string, unknown>);
        }
        if (rpcError) {
          console.error("[Tydigo Auth] RPC fallback also failed:", rpcError);
        }
      } catch (rpcErr) {
        console.error("[Tydigo Auth] RPC fallback exception:", rpcErr);
      }
      throw new AuthError(
        "We couldn't load your account profile due to a server error. Please try again shortly.",
        error.code
      );
    }
    throw new AuthError("We couldn't load your profile. Please try again.");
  }

  if (!data) {
    // Profile row genuinely missing — try to repair via RPC
    console.warn("[Tydigo Auth] Profile row missing for auth user:", authUserId);
    try {
      const { data: repairResult } = await client.rpc("ensure_current_user_profile");
      console.log("[Tydigo Auth] Profile repair result:", repairResult);

      const { data: retryData, error: retryError } = await client
        .from("profiles")
        .select("*")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (retryError) {
        console.error("[Tydigo Auth] Profile retry error after repair:", retryError);
        throw new AuthError("We couldn't load your profile. Please try signing in again.");
      }
      if (!retryData) {
        throw new AuthError("Account setup incomplete. Please contact support.");
      }
      return mapProfile(retryData);
    } catch (repairErr) {
      if (repairErr instanceof AuthError) throw repairErr;
      console.error("[Tydigo Auth] Profile repair failed:", repairErr);
      throw new AuthError("Account setup incomplete. Please contact support.");
    }
  }

  return mapProfile(data);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return getOrFetchProfile(data.user.id);
  } catch (err) {
    console.error("[Tydigo Auth] getCurrentUser failed:", err instanceof Error ? err.message : String(err));
    clearSessionToken();
    return null;
  }
}

// ─── Sign Out ─────────────────────────────────────────────────

export async function signOut() {
  if (isSupabaseAvailable() && supabase) await supabase.auth.signOut();
  clearSessionToken();
}

// ─── Resend Verification ──────────────────────────────────────

export async function resendVerification(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resend({ type: "signup", email: email.toLowerCase().trim() });
  if (error) throw new AuthError(friendlyMessage(error));
}

// ─── Password Reset ───────────────────────────────────────────

export async function resetPassword(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
    redirectTo: `${window.location.origin}/auth/callback`,
  });
  if (error) throw new AuthError(friendlyMessage(error));
}

export async function updatePassword(newPassword: string) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new AuthError(friendlyMessage(error));
}

// ─── Contact Resolution (for active pickups) ──────────────────

export async function getPickupContactPhone(pickupId: string): Promise<string | null> {
  const client = requireClient();
  const { data: user } = await client.auth.getUser();
  if (!user.user) return null;

  const { data } = await client.rpc("get_pickup_contact_phone", {
    pickup_id: pickupId,
    requesting_user_id: user.user.id,
  });
  return (data as string) || null;
}

// ─── Helpers ──────────────────────────────────────────────────

function mapProfile(p: Record<string, unknown>): AuthUser {
  return {
    // id = profiles.id (UUID) for database queries
    // authUserId = auth.users.id for auth operations
    id: (p.id as string) || "",
    phone: (p.phone as string) || "",
    name: (p.full_name as string) || "Tydigo User",
    role: canonicalizeRole((p.role as string) || "household"),
    address: (p.default_city as string) || "",
    city: (p.default_city as string) || "Abuja",
    state: (p.default_state as string) || "FCT",
    ecopoints: (p.ecopoints as number) || 0,
    rating: (p.rating as number) || 5.0,
  };
}

/**
 * Canonicalize a role value coming from the database into a valid UserRole.
 *
 * The `profiles.role` column is a `user_role` enum that historically includes
 * the legacy alias `customer` (its default value). Every dashboard, route, and
 * RLS policy treats `household` as the canonical public role, so we normalize
 * `customer` → `household` here to keep a single source of truth.
 */
function canonicalizeRole(role: string): UserRole {
  const mapping: Record<string, UserRole> = {
    customer: "household",
    fleet: "fleet_owner",
    corporate: "corporate_partner",
  };
  const canonical = mapping[role];
  if (canonical) return canonical;
  return (role as UserRole) || "household";
}

// Legacy exports for backward compatibility
export { signUp as signUpLegacy };
