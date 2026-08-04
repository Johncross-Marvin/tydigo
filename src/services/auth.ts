/**
 * Tydigo Auth Service
 *
 * Handles Supabase phone OTP authentication, session management,
 * profile creation, and role-based routing.
 * Falls back to mock API when Supabase is not configured.
 */

import { supabase, isSupabaseAvailable, normalizePhone, generateId } from "@/lib/supabase";
import { api as mockApi, type AuthUser, type UserRole, setSessionToken, clearSessionToken } from "@/lib/api";
import { hasSupabase } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────

export type { AuthUser, UserRole };

// ─── Phone OTP Sign In ────────────────────────────────────────

export async function signInWithPhone(phone: string): Promise<{
  verificationId?: string;
  maskedPhone?: string;
  expiresInSeconds: number;
  delivery: string;
  verificationCode?: string;
}> {
  if (isSupabaseAvailable() && supabase) {
    const normalizedPhone = normalizePhone(phone);
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        channel: "sms",
      },
    });

    if (error) throw new Error(error.message);

    return {
      expiresInSeconds: 600,
      delivery: "sms",
      // With Supabase, verification is handled server-side, no code returned
    };
  }

  // Fallback to mock API
  return mockApi.startAuth({ mode: "signin", phone });
}

// ─── Phone OTP Verify ─────────────────────────────────────────

export async function verifyOtp(
  phone: string,
  code: string,
  verificationId?: string,
): Promise<{ user: AuthUser; token?: string }> {
  if (isSupabaseAvailable() && supabase) {
    const normalizedPhone = normalizePhone(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: code,
      type: "sms",
    });

    if (error) throw new Error(error.message);

    if (!data.user) throw new Error("Verification failed. Please try again.");

    // Get or create profile
    const profile = await getOrCreateProfile(data.user.id, normalizedPhone);

    // Get session token
    const session = data.session;
    if (session?.access_token) {
      setSessionToken(session.access_token);
    }

    return {
      user: profile,
      token: session?.access_token,
    };
  }

  // Fallback to mock API
  const result = await mockApi.verifyAuth({
    verificationId: verificationId || "",
    code,
  });
  return { user: result.user, token: result.token };
}

// ─── Sign Out ─────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (isSupabaseAvailable() && supabase) {
    await supabase.auth.signOut();
  }

  clearSessionToken();

  // Also call mock logout if available
  try {
    await mockApi.logout();
  } catch {
    // Ignore — mock logout may fail if no mock session
  }
}

// ─── Get Current User ─────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isSupabaseAvailable() && supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;

    return await getUserProfile(data.user.id);
  }

  // Fallback to mock API
  try {
    const { user } = await mockApi.me();
    return user;
  } catch {
    return null;
  }
}

// ─── Profile Management ───────────────────────────────────────

async function getOrCreateProfile(
  authUserId: string,
  phone: string,
): Promise<AuthUser> {
  if (!isSupabaseAvailable() || !supabase) {
    // Mock fallback
    try {
      const { user } = await mockApi.me();
      return user;
    } catch {
      return {
        id: authUserId,
        phone,
        name: "Tydigo User",
        role: "customer",
        ecopoints: 500,
        rating: 5,
      };
    }
  }

  // Check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (existing) {
    return mapProfileToUser(existing);
  }

  // Create new profile
  const profileId = generateId("pro");
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: profileId,
      auth_user_id: authUserId,
      phone,
      full_name: "Tydigo User",
      role: "household",
      default_city: "Abuja",
      default_state: "FCT",
      ecopoints: 500,
      rating: 5.0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Award signup EcoPoints
  if (supabase) {
    await supabase.from("ecopoint_transactions").insert({
      id: generateId("eco"),
      profile_id: profileId,
      points: 500,
      reason: "Signup bonus",
      status: "confirmed",
    });
  }

  return mapProfileToUser(created);
}

export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) {
    try {
      const { user } = await mockApi.me();
      return user;
    } catch {
      return null;
    }
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
    .single();

  if (!data) return null;
  return mapProfileToUser(data);
}

export async function updateProfile(
  userId: string,
  updates: Partial<{ fullName: string; role: UserRole; address: string; city: string; avatarUrl: string }>,
): Promise<AuthUser> {
  if (!isSupabaseAvailable() || !supabase) {
    const { user } = await mockApi.updateMe({
      name: updates.fullName,
      role: updates.role,
      address: updates.address,
      city: updates.city,
    });
    return user;
  }

  const dbUpdates: Record<string, unknown> = {};
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.address) dbUpdates.default_city = updates.address;
  if (updates.city) dbUpdates.default_city = updates.city;
  if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(dbUpdates)
    .eq("auth_user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProfileToUser(data);
}

// ─── Role Management ──────────────────────────────────────────

export async function setUserRole(userId: string, role: UserRole): Promise<AuthUser> {
  return updateProfile(userId, { role });
}

// ─── Session ──────────────────────────────────────────────────

export async function refreshSession(): Promise<AuthUser | null> {
  if (isSupabaseAvailable() && supabase) {
    const { data } = await supabase.auth.refreshSession();
    if (!data.session) return null;
    return getUserProfile(data.session.user.id);
  }

  return getCurrentUser();
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
