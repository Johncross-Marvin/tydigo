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
import { hasSupabase, APP_ENV } from "@/lib/env";
import type { UserRole, AuthUser } from "@/lib/api";

export type { AuthUser, UserRole };

class AuthError extends Error {
  constructor(message: string, public code?: string) { super(message); this.name = "AuthError"; }
}

function friendlyMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (APP_ENV === "development") console.error("[Tydigo Auth]", error);
  if (msg.includes("Invalid login")) return "Invalid login details.";
  if (msg.includes("Email not confirmed") || msg.includes("not verified")) return "Please verify your email before continuing.";
  if (msg.includes("already registered") || msg.includes("already exists")) return "An account with this email already exists.";
  if (msg.includes("weak") || msg.includes("password")) return "Password must be at least 8 characters with letters and numbers.";
  if (msg.includes("rate") || msg.includes("too many")) return "Too many attempts. Please wait and try again.";
  if (msg.includes("network") || msg.includes("fetch")) return "Network error. Please check your connection.";
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
  const client = requireClient();
  const phoneE164 = normalizeNigerianPhone(params.phone);
  const normalizedEmail = params.email.toLowerCase().trim();

  // Map frontend role to canonical DB role
  const canonicalRole = mapToCanonicalRole(params.role);

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        username: params.username.toLowerCase().trim(),
        phone: params.phone.trim(),
        phone_e164: phoneE164,
        role: canonicalRole,
        city: params.city,
        state: params.state || "FCT",
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw new AuthError(friendlyMessage(error));
  return { user: data.user, needsVerification: !data.user?.email_confirmed_at };
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
    customer: "customer",
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

  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Phone pattern (digits only, 10+ digits)
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    const normalized = normalizeNigerianPhone(trimmed);
    const client = requireClient();
    const { data } = await client
      .from("profiles")
      .select("email")
      .eq("phone_e164", normalized)
      .maybeSingle();
    if (data?.email) return data.email as string;
  }

  // Username lookup
  const username = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  const client = requireClient();
  const { data } = await client
    .from("profiles")
    .select("email")
    .eq("username", username)
    .maybeSingle();
  if (data?.email) return data.email as string;

  throw new AuthError("Invalid login details.");
}

// ─── Get Profile ──────────────────────────────────────────────

async function getOrFetchProfile(authUserId: string): Promise<AuthUser> {
  const client = requireClient();
  const { data } = await client.from("profiles").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (!data) throw new AuthError("Profile not found. Please contact support.");
  return mapProfile(data);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return getOrFetchProfile(data.user.id);
  } catch { clearSessionToken(); return null; }
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
    id: (p.id as string) || (p.auth_user_id as string) || "",
    phone: (p.phone as string) || "",
    name: (p.full_name as string) || "Tydigo User",
    role: (p.role as UserRole) || "customer",
    address: (p.default_city as string) || "",
    city: (p.default_city as string) || "Abuja",
    state: (p.default_state as string) || "FCT",
    ecopoints: (p.ecopoints as number) || 0,
    rating: (p.rating as number) || 5.0,
  };
}

// Legacy exports for backward compatibility
export { signUp as signUpLegacy };
