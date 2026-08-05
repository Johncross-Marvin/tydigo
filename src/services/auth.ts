/**
 * Tydigo Auth Service
 *
 * Handles Supabase phone OTP authentication, session management,
 * profile creation, and role-based routing.
 *
 * Uses Supabase Auth directly from the browser.
 * No API routes needed — phone OTP is handled entirely by Supabase.
 *
 * DEVELOPMENT: Set VITE_ENABLE_MOCK_AUTH=true to use mock API locally.
 * PRODUCTION: Supabase env vars are REQUIRED.
 */

import { supabase, isSupabaseAvailable, generateId } from "@/lib/supabase";
import { normalizeNigerianPhone } from "@/utils/phone";
import { setSessionToken, clearSessionToken } from "@/lib/api";
import { hasSupabase, ENABLE_MOCK_AUTH, APP_ENV } from "@/lib/env";
import type { UserRole, AuthUser } from "@/lib/api";

// Re-export types
export type { AuthUser, UserRole };

// ─── Error Helpers ────────────────────────────────────────────

class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

function friendlyAuthMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  // Log the full error in development for debugging
  if (APP_ENV === "development") {
    console.error("[Tydigo Auth] Raw error:", error);
  }

  // Map Supabase error codes to friendly messages
  if (msg.includes("phone_provider_disabled") || msg.includes("Unsupported phone provider")) {
    return "Phone verification is being set up. Please try again shortly.";
  }
  if (msg.includes("invalid_phone") || msg.includes("Invalid phone") || msg.includes("phone number")) {
    return "This phone number doesn't look right. Please check and try again.";
  }
  if (msg.includes("rate_limit") || msg.includes("too many") || msg.includes("too_many")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (msg.includes("expired") || msg.includes("timeout")) {
    return "This verification code has expired. Please request a new one.";
  }
  if (msg.includes("token_invalid") || msg.includes("incorrect") || msg.includes("invalid")) {
    return "The verification code is incorrect. Please check and try again.";
  }
  if (msg.includes("user_not_found") || msg.includes("not found")) {
    return "No account found. Please sign up first.";
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this phone number already exists. Please sign in instead.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (msg.includes("URL") || msg.includes("url") || msg.includes("URL is required")) {
    return "Authentication is not configured. Please contact support.";
  }
  if (msg.includes("422") || msg.includes("Unprocessable")) {
    if (msg.includes("Twilio") || msg.includes("twilio")) {
      return "SMS delivery failed. The phone verification service may need additional setup.";
    }
    return "Your request could not be processed. Please verify your phone number and try again.";
  }
  if (msg.includes("403") || msg.includes("Forbidden") || msg.includes("not authorized")) {
    return "Access denied. Please check that the authentication service is properly configured.";
  }

  // Generic fallback — show raw in dev, friendly in prod
  if (APP_ENV === "development") {
    return `Auth error: ${msg}`;
  }
  return "Something went wrong. Please try again.";
}

// ─── Supabase Check ───────────────────────────────────────────

function requireSupabase(): NonNullable<typeof supabase> {
  if (!isSupabaseAvailable() || !supabase) {
    // In dev with mock mode, throw a descriptive error
    if (ENABLE_MOCK_AUTH) {
      throw new AuthError(
        "Mock auth is not available in this environment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
    }
    throw new AuthError(
      "Authentication is not configured. Please contact support.",
    );
  }
  return supabase;
}

// ─── Phone OTP Sign In ────────────────────────────────────────

export async function signInWithPhone(
  phone: string,
  metadata?: { name?: string; role?: UserRole },
): Promise<{
  expiresInSeconds: number;
  delivery: string;
}> {
  const client = requireSupabase();
  const normalizedPhone = normalizeNigerianPhone(phone);

  if (APP_ENV === "development") {
    console.log("[Tydigo Auth] Sending OTP to:", normalizedPhone);
  }

  const { data, error } = await client.auth.signInWithOtp({
    phone: normalizedPhone,
    options: {
      shouldCreateUser: true,
      channel: "sms",
      data: metadata
        ? { full_name: metadata.name, role: metadata.role }
        : undefined,
    },
  });

  if (error) {
    if (APP_ENV === "development") {
      console.error("[Tydigo Auth] signInWithOtp error:", error);
    }
    throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
  }

  // Check if Supabase returned an error about SMS not being configured
  if (!data) {
    throw new AuthError("We could not send your code. Please check your phone number.");
  }

  if (APP_ENV === "development") {
    console.log("[Tydigo Auth] OTP sent successfully");
  }

  return {
    expiresInSeconds: 600,
    delivery: "sms",
  };
}

// ─── Phone OTP Verify ─────────────────────────────────────────

export async function verifyOtp(
  phone: string,
  code: string,
  profileMeta?: { name?: string; role?: UserRole },
): Promise<{ user: AuthUser; token?: string }> {
  const client = requireSupabase();
  const normalizedPhone = normalizeNigerianPhone(phone);

  const { data, error } = await client.auth.verifyOtp({
    phone: normalizedPhone,
    token: code,
    type: "sms",
  });

  if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
  if (!data.user) throw new AuthError("Verification failed. Please try again.");

  // Get or create profile
  const profile = await getOrCreateProfile(
    data.user.id,
    normalizedPhone,
    profileMeta?.name || (data.user.user_metadata?.full_name as string),
    (profileMeta?.role || (data.user.user_metadata?.role as UserRole) || "household") as UserRole,
  );

  // Store session token
  const session = data.session;
  if (session?.access_token) {
    setSessionToken(session.access_token);
  }

  return { user: profile, token: session?.access_token };
}

// ─── Sign Out ─────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (isSupabaseAvailable() && supabase) {
    await supabase.auth.signOut();
  }
  clearSessionToken();
}

// ─── Get Current User ─────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) {
    // No Supabase = no user
    return null;
  }

  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return await getUserProfile(data.user.id);
  } catch {
    // Session expired or invalid
    clearSessionToken();
    return null;
  }
}

// ─── Profile Management ───────────────────────────────────────

async function getOrCreateProfile(
  authUserId: string,
  phone: string,
  fullName?: string,
  role: UserRole = "household",
): Promise<AuthUser> {
  const client = requireSupabase();

  // Check if profile exists
  const { data: existing, error: lookupError } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (lookupError) {
    console.error("[Tydigo Auth] Profile lookup error:", lookupError);
  }

  if (existing) {
    // If user just signed up with a name, update the placeholder
    if (fullName && (existing.full_name === "Tydigo User" || !existing.full_name)) {
      await client
        .from("profiles")
        .update({ full_name: fullName, role, updated_at: new Date().toISOString() })
        .eq("auth_user_id", authUserId);
      return mapProfileToUser({ ...existing, full_name: fullName, role });
    }
    return mapProfileToUser(existing);
  }

  // Create new profile
  const profileId = generateId("pro");
  const now = new Date().toISOString();

  const insertResult = await client
    .from("profiles")
    .insert({
      id: profileId,
      auth_user_id: authUserId,
      phone,
      full_name: fullName || "Tydigo User",
      role,
      default_city: "Abuja",
      default_state: "FCT",
      ecopoints: 500,
      rating: 5.0,
      total_pickups: 0,
      total_kg_recycled: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (insertResult.error) {
    console.error("[Tydigo Auth] Profile insert error:", insertResult.error);
    throw new AuthError("Unable to create your profile. Please contact support.");
  }

  const created = insertResult.data;
  if (!created) {
    // Insert returned no data — might be RLS blocking
    console.error("[Tydigo Auth] Profile insert returned no data. RLS may be blocking.");
    throw new AuthError("We're setting up your account. Please try again in a moment.");
  }

  // Award signup EcoPoints
  try {
    await client.from("ecopoint_transactions").insert({
      id: generateId("eco"),
      profile_id: profileId,
      points: 500,
      reason: "Signup bonus",
      status: "confirmed",
      created_at: now,
    });
  } catch {
    // Non-fatal — EcoPoints can be awarded later
  }

  return mapProfileToUser(created);
}

export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[Tydigo Auth] getUserProfile error:", error);
    return null;
  }

  if (!data) return null;
  return mapProfileToUser(data);
}

export async function updateProfile(
  userId: string,
  updates: Partial<{ fullName: string; role: UserRole; address: string; city: string; avatarUrl: string }>,
): Promise<AuthUser> {
  const client = requireSupabase();

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.address) dbUpdates.default_city = updates.address;
  if (updates.city) dbUpdates.default_city = updates.city;
  if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

  const { data, error } = await client
    .from("profiles")
    .update(dbUpdates)
    .eq("auth_user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[Tydigo Auth] updateProfile error:", error);
    throw new AuthError("Unable to update profile.");
  }
  if (!data) throw new AuthError("Profile not found.");
  return mapProfileToUser(data);
}

// ─── Role Management ──────────────────────────────────────────

export async function setUserRole(userId: string, role: UserRole): Promise<AuthUser> {
  return updateProfile(userId, { role });
}

// ─── Session ──────────────────────────────────────────────────

export async function refreshSession(): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  try {
    const { data } = await supabase.auth.refreshSession();
    if (!data.session) return null;
    return getUserProfile(data.session.user.id);
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function mapProfileToUser(profile: Record<string, unknown>): AuthUser {
  return {
    id: (profile.auth_user_id as string) || (profile.id as string),
    phone: (profile.phone as string) || "",
    name: (profile.full_name as string) || "Tydigo User",
    role: (profile.role as UserRole) || "customer",
    address: (profile.default_city as string) || "",
    city: (profile.default_city as string) || "Abuja",
    state: (profile.default_state as string) || "FCT",
    ecopoints: (profile.ecopoints as number) || 0,
    rating: (profile.rating as number) || 5.0,
  };
}
