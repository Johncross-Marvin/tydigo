/**
 * Tydigo Auth Service v2
 *
 * Multi-method authentication supporting:
 *   - Phone OTP (primary)
 *   - Email + Password
 *   - Username + Password
 *   - Google OAuth (architecture ready)
 *   - Apple OAuth (architecture ready)
 *
 * Profile creation, role management, and session handling.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { normalizeNigerianPhone } from "@/utils/phone";
import { setSessionToken, clearSessionToken } from "@/lib/api";
import { hasSupabase, APP_ENV } from "@/lib/env";
import { generateUniqueUsername } from "./username";
import { detectIdentifier, type IdentifierResult } from "./identifier";
import { recordDeviceSession } from "./session";
import { logSecurityEvent } from "./security";
import type { UserRole, AuthUser } from "@/lib/api";

// Re-export types
export type { AuthUser, UserRole };

// ─── Expanded Role Type ───────────────────────────────────────

export type ExtendedRole =
  | "customer"
  | "household"
  | "estate"
  | "business"
  | "collector"
  | "recycler"
  | "organic_partner"
  | "fleet"
  | "corporate"
  | "government"
  | "partner"
  | "admin";

// ─── Error Helpers ────────────────────────────────────────────

class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

function friendlyAuthMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (APP_ENV === "development") {
    console.error("[Tydigo Auth] Raw error:", error);
  }

  if (msg.includes("phone_provider_disabled") || msg.includes("Unsupported phone provider")) {
    return "Phone verification is being set up. Please try again shortly.";
  }
  if (msg.includes("invalid_phone") || msg.includes("Invalid phone")) {
    return "This phone number doesn't look right. Please check and try again.";
  }
  if (msg.includes("rate_limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (msg.includes("expired") || msg.includes("timeout")) {
    return "This verification code has expired. Please request a new one.";
  }
  if (msg.includes("token_invalid") || msg.includes("incorrect") || msg.includes("invalid")) {
    return "The verification code is incorrect. Please check and try again.";
  }
  if (msg.includes("user_not_found") || msg.includes("not found")) {
    return "No account found with these details. Please sign up first.";
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this information already exists. Please sign in instead.";
  }
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Incorrect credentials. Please check and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (msg.includes("URL") || msg.includes("url") || msg.includes("URL is required")) {
    return "Authentication is not configured. Please contact support.";
  }

  if (APP_ENV === "development") {
    return `Auth error: ${msg}`;
  }
  return "Something went wrong. Please try again.";
}

// ─── Supabase Check ───────────────────────────────────────────

function requireSupabase(): NonNullable<typeof supabase> {
  if (!isSupabaseAvailable() || !supabase) {
    throw new AuthError("Authentication is not configured. Please contact support.");
  }
  return supabase;
}

// ─── Sign Up ──────────────────────────────────────────────────

export type SignUpParams = {
  fullName: string;
  email?: string;
  phone?: string;
  password?: string;
  city?: string;
  state?: string;
  role?: ExtendedRole;
};

export async function signUp(params: SignUpParams): Promise<{
  user: AuthUser;
  needsVerification: boolean;
  verificationChannel: "sms" | "email" | null;
}> {
  const client = requireSupabase();
  const { fullName, email, phone, password, city, state, role = "customer" } = params;

  // At least one of email or phone is required
  if (!email && !phone) {
    throw new AuthError("Please provide an email address or phone number.");
  }

  // Generate username
  const username = await generateUniqueUsername(fullName);

  // Build auth metadata
  const userMetadata: Record<string, unknown> = {
    full_name: fullName,
    role,
    username,
    city: city || "Abuja",
    state: state || "FCT",
  };

  // Sign up with Supabase Auth
  if (phone && !email) {
    // Phone-only signup
    const normalizedPhone = normalizeNigerianPhone(phone);
    const { data, error } = await client.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        channel: "sms",
        data: userMetadata,
      },
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data) throw new AuthError("We could not send your verification code.");

    return {
      user: { id: "", phone: normalizedPhone, name: fullName, role: role as UserRole },
      needsVerification: true,
      verificationChannel: "sms",
    };
  }

  if (email && password) {
    // Email + password signup
    const { data, error } = await client.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: userMetadata,
      },
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data.user) throw new AuthError("Account creation failed. Please try again.");

    // Create profile immediately for email signups
    const profile = await ensureProfile(data.user.id, {
      fullName,
      email: email.toLowerCase().trim(),
      phone: phone ? normalizeNigerianPhone(phone) : undefined,
      username,
      city: city || "Abuja",
      state: state || "FCT",
      role: role as UserRole,
    });

    if (data.session?.access_token) {
      setSessionToken(data.session.access_token);
    }

    return {
      user: profile,
      needsVerification: !data.user.email_confirmed_at,
      verificationChannel: "email",
    };
  }

  if (email && phone && password) {
    // Both email and phone — sign up with email, add phone after
    const { data, error } = await client.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: userMetadata,
      },
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data.user) throw new AuthError("Account creation failed. Please try again.");

    // Create profile
    const profile = await ensureProfile(data.user.id, {
      fullName,
      email: email.toLowerCase().trim(),
      phone: normalizeNigerianPhone(phone),
      username,
      city: city || "Abuja",
      state: state || "FCT",
      role: role as UserRole,
    });

    if (data.session?.access_token) {
      setSessionToken(data.session.access_token);
    }

    return {
      user: profile,
      needsVerification: !data.user.email_confirmed_at,
      verificationChannel: "email",
    };
  }

  // Phone + password (less common but supported)
  if (phone && password && !email) {
    const normalizedPhone = normalizeNigerianPhone(phone);
    const emailForAuth = `${normalizedPhone.replace(/\D/g, "")}@tydigo.user`;

    const { data, error } = await client.auth.signUp({
      email: emailForAuth,
      password,
      phone: normalizedPhone,
      options: {
        data: userMetadata,
      },
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data.user) throw new AuthError("Account creation failed. Please try again.");

    const profile = await ensureProfile(data.user.id, {
      fullName,
      phone: normalizedPhone,
      username,
      city: city || "Abuja",
      state: state || "FCT",
      role: role as UserRole,
    });

    if (data.session?.access_token) {
      setSessionToken(data.session.access_token);
    }

    return {
      user: profile,
      needsVerification: true,
      verificationChannel: "sms",
    };
  }

  throw new AuthError("Invalid signup configuration.");
}

// ─── Sign In ──────────────────────────────────────────────────

export type SignInParams = {
  identifier: string;
  password?: string;
};

export async function signIn(params: SignInParams): Promise<{
  user: AuthUser;
  needsOtp: boolean;
}> {
  const client = requireSupabase();
  const detected = detectIdentifier(params.identifier);

  if (APP_ENV === "development") {
    console.log("[Tydigo Auth] Sign in detected:", detected);
  }

  if (detected.type === "phone") {
    // Phone OTP sign in
    const { data, error } = await client.auth.signInWithOtp({
      phone: detected.normalized,
      options: {
        shouldCreateUser: false,
        channel: "sms",
      },
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());

    return {
      user: { id: "", phone: detected.normalized, name: "", role: "customer" },
      needsOtp: true,
    };
  }

  if (detected.type === "email" && params.password) {
    // Email + password sign in
    const { data, error } = await client.auth.signInWithPassword({
      email: detected.normalized,
      password: params.password,
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data.user) throw new AuthError("Sign in failed. Please try again.");

    const profile = await getUserProfile(data.user.id);
    if (!profile) throw new AuthError("Account not fully set up. Please contact support.");

    // Update last_login
    await updateLastLogin(profile.id);

    // Record device session & security log
    await recordDeviceSession(profile.id, data.user.id);
    await logSecurityEvent(profile.id, data.user.id, "login");

    if (data.session?.access_token) {
      setSessionToken(data.session.access_token);
    }

    return { user: profile, needsOtp: false };
  }

  if (detected.type === "username" && params.password) {
    // Username + password sign in — look up email first
    const { data: profileData } = await client
      .from("profiles")
      .select("email, auth_user_id")
      .eq("username", detected.normalized)
      .maybeSingle();

    if (!profileData?.email) {
      throw new AuthError("No account found with this username.");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: profileData.email,
      password: params.password,
    });

    if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
    if (!data.user) throw new AuthError("Sign in failed. Please try again.");

    const profile = await getUserProfile(data.user.id);
    if (!profile) throw new AuthError("Account not fully set up. Please contact support.");

    await updateLastLogin(profile.id);

    if (data.session?.access_token) {
      setSessionToken(data.session.access_token);
    }

    return { user: profile, needsOtp: false };
  }

  // Email without password — send magic link or suggest OTP
  if (detected.type === "email" && !params.password) {
    throw new AuthError("Please enter your password to sign in with email.");
  }

  // Username without password
  if (detected.type === "username" && !params.password) {
    throw new AuthError("Please enter your password to sign in.");
  }

  throw new AuthError("Please provide valid credentials to sign in.");
}

// ─── Phone OTP (standalone) ───────────────────────────────────

export async function signInWithPhone(
  phone: string,
  metadata?: { name?: string; role?: UserRole },
): Promise<{ expiresInSeconds: number; delivery: string }> {
  const client = requireSupabase();
  const normalizedPhone = normalizeNigerianPhone(phone);

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

  if (error) throw new AuthError(friendlyAuthMessage(error), error.status?.toString());
  if (!data) throw new AuthError("We could not send your code. Please check your phone number.");

  return { expiresInSeconds: 600, delivery: "sms" };
}

// ─── Verify OTP ───────────────────────────────────────────────

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
    (profileMeta?.role || (data.user.user_metadata?.role as UserRole) || "customer") as UserRole,
  );

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
  if (!isSupabaseAvailable() || !supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return await getUserProfile(data.user.id);
  } catch {
    clearSessionToken();
    return null;
  }
}

// ─── Profile Management ───────────────────────────────────────

async function ensureProfile(
  authUserId: string,
  params: {
    fullName: string;
    email?: string;
    phone?: string;
    username: string;
    city: string;
    state: string;
    role: UserRole;
  },
): Promise<AuthUser> {
  const client = requireSupabase();

  // Check if profile exists
  const { data: existing } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing) {
    return mapProfileToUser(existing);
  }

  // Create new profile
  const now = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    auth_user_id: authUserId,
    phone: params.phone || "",
    email: params.email || null,
    full_name: params.fullName,
    username: params.username,
    role: params.role,
    default_city: params.city,
    default_state: params.state,
    country: "Nigeria",
    language: "en",
    timezone: "Africa/Lagos",
    ecopoints: 500,
    rating: 5.0,
    total_pickups: 0,
    total_kg_recycled: 0,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error } = await client
    .from("profiles")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[Tydigo Auth] Profile insert error:", error);
    throw new AuthError("We couldn't finish setting up your account. Please try again.");
  }
  if (!created) {
    throw new AuthError("We're setting up your account. Please try again in a moment.");
  }

  // Award signup EcoPoints
  try {
    await client.from("ecopoint_transactions").insert({
      profile_id: created.id,
      points: 500,
      reason: "Signup bonus",
      status: "pending",
      created_at: now,
    });
  } catch {
    // Non-fatal
  }

  return mapProfileToUser(created);
}

async function getOrCreateProfile(
  authUserId: string,
  phone: string,
  fullName?: string,
  role: UserRole = "customer",
): Promise<AuthUser> {
  const client = requireSupabase();

  const { data: existing } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing) {
    if (fullName && (existing.full_name === "Tydigo User" || !existing.full_name)) {
      await client
        .from("profiles")
        .update({ full_name: fullName, role, updated_at: new Date().toISOString() })
        .eq("auth_user_id", authUserId);
      return mapProfileToUser({ ...existing, full_name: fullName, role });
    }
    return mapProfileToUser(existing);
  }

  const username = await generateUniqueUsername(fullName || "Tydigo User");
  const now = new Date().toISOString();

  const insertPayload: Record<string, unknown> = {
    auth_user_id: authUserId,
    phone,
    full_name: fullName || "Tydigo User",
    username,
    role,
    default_city: "Abuja",
    default_state: "FCT",
    country: "Nigeria",
    language: "en",
    timezone: "Africa/Lagos",
    ecopoints: 500,
    rating: 5.0,
    total_pickups: 0,
    total_kg_recycled: 0,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error } = await client
    .from("profiles")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[Tydigo Auth] Profile insert error:", error);
    throw new AuthError("We couldn't finish setting up your account. Please try again.");
  }
  if (!created) {
    throw new AuthError("We're setting up your account. Please try again in a moment.");
  }

  // Award signup EcoPoints
  try {
    await client.from("ecopoint_transactions").insert({
      profile_id: created.id,
      points: 500,
      reason: "Signup bonus",
      status: "pending",
      created_at: now,
    });
  } catch {
    // Non-fatal
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

  if (error || !data) return null;
  return mapProfileToUser(data);
}

export async function updateProfile(
  userId: string,
  updates: Partial<{
    fullName: string;
    role: UserRole;
    address: string;
    city: string;
    avatarUrl: string;
    username: string;
    email: string;
  }>,
): Promise<AuthUser> {
  const client = requireSupabase();

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.address) dbUpdates.default_city = updates.address;
  if (updates.city) dbUpdates.default_city = updates.city;
  if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.username) dbUpdates.username = updates.username;
  if (updates.email) dbUpdates.email = updates.email;

  const { data, error } = await client
    .from("profiles")
    .update(dbUpdates)
    .eq("auth_user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw new AuthError("Unable to update profile.");
  if (!data) throw new AuthError("Profile not found.");
  return mapProfileToUser(data);
}

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

// ─── Last Login ───────────────────────────────────────────────

async function updateLastLogin(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  try {
    await supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", profileId);
  } catch {
    // Non-fatal
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
