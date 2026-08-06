/**
 * Tydigo Profile Service
 *
 * Centralized profile operations: creation, retrieval, updates,
 * role-specific profile management, and notification preferences.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { generateUniqueUsername } from "./username";
import type { UserRole, AuthUser } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export type ProfileRecord = {
  id: string;
  auth_user_id: string;
  username: string;
  email: string | null;
  phone: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  default_city: string;
  default_state: string;
  country: string;
  language: string;
  timezone: string;
  kyc_status: string;
  account_type: string;
  ecopoints: number;
  rating: number;
  total_pickups: number;
  total_kg_recycled: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProfileParams = {
  authUserId: string;
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  role?: UserRole;
};

// ─── Create Profile ───────────────────────────────────────────

export async function createProfile(params: CreateProfileParams): Promise<AuthUser> {
  const {
    authUserId,
    fullName,
    email,
    phone = "",
    city = "Abuja",
    state = "FCT",
    role = "customer",
  } = params;

  const username = await generateUniqueUsername(fullName);
  const now = new Date().toISOString();

  if (!isSupabaseAvailable() || !supabase) {
    // Mock fallback
    return {
      id: authUserId,
      phone,
      name: fullName,
      role,
      city,
      state,
      ecopoints: 500,
      rating: 5.0,
    };
  }

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      phone,
      email: email || null,
      full_name: fullName,
      username,
      role,
      default_city: city,
      default_state: state,
      country: "Nigeria",
      language: "en",
      timezone: "Africa/Lagos",
      ecopoints: 500,
      rating: 5.0,
      total_pickups: 0,
      total_kg_recycled: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Profile creation failed: ${error.message}`);
  if (!created) throw new Error("Profile creation returned no data.");

  // Create notification preferences
  await createNotificationPreferences(created.id);

  // Create wallet
  await createWallet(created.id);

  // Award signup EcoPoints
  await awardSignupBonus(created.id);

  return mapProfileToUser(created);
}

// ─── Ensure Profile Exists ────────────────────────────────────

export async function ensureProfile(authUserId: string): Promise<AuthUser> {
  if (!isSupabaseAvailable() || !supabase) {
    return { id: authUserId, phone: "", name: "User", role: "customer", ecopoints: 0, rating: 5.0 };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing) return mapProfileToUser(existing);

  // Profile doesn't exist — create a minimal one
  return createProfile({ authUserId, fullName: "Tydigo User" });
}

// ─── Get Profile ──────────────────────────────────────────────

export async function getProfile(authUserId: string): Promise<AuthUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileToUser(data);
}

// ─── Update Profile ───────────────────────────────────────────

export async function updateProfileRecord(
  authUserId: string,
  updates: Partial<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    avatarUrl: string;
    role: UserRole;
    language: string;
    timezone: string;
  }>,
): Promise<AuthUser> {
  if (!isSupabaseAvailable() || !supabase) {
    throw new Error("Supabase not available.");
  }

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.username) dbUpdates.username = updates.username;
  if (updates.email) dbUpdates.email = updates.email;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.city) dbUpdates.default_city = updates.city;
  if (updates.state) dbUpdates.default_state = updates.state;
  if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.language) dbUpdates.language = updates.language;
  if (updates.timezone) dbUpdates.timezone = updates.timezone;

  const { data, error } = await supabase
    .from("profiles")
    .update(dbUpdates)
    .eq("auth_user_id", authUserId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Profile update failed: ${error.message}`);
  if (!data) throw new Error("Profile not found.");
  return mapProfileToUser(data);
}

// ─── Notification Preferences ─────────────────────────────────

async function createNotificationPreferences(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("notification_preferences").insert({
      profile_id: profileId,
      push_enabled: true,
      sms_enabled: true,
      email_enabled: true,
      pickup_reminders: true,
      collector_updates: true,
      ecopoints_updates: true,
      payment_receipts: true,
      marketing_emails: false,
    });
  } catch {
    // Non-fatal
  }
}

// ─── Wallet ───────────────────────────────────────────────────

async function createWallet(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("wallets").insert({
      profile_id: profileId,
      balance_ngn: 0,
      total_earned_ngn: 0,
    });
  } catch {
    // Non-fatal — wallet may already exist
  }
}

// ─── EcoPoints Bonus ──────────────────────────────────────────

async function awardSignupBonus(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("ecopoint_transactions").insert({
      profile_id: profileId,
      points: 500,
      reason: "Signup bonus",
      status: "pending",
    });
  } catch {
    // Non-fatal
  }
}

// ─── Role-Specific Profile ────────────────────────────────────

export async function createRoleProfile(
  profileId: string,
  role: UserRole,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const tableMap: Partial<Record<UserRole, string>> = {
    customer: "customer_profiles",
    household: "customer_profiles",
    estate: "business_profiles",
    business: "business_profiles",
    corporate: "corporate_profiles",
    collector: "collector_profiles",
    fleet: "fleet_profiles",
    recycler: "recycler_profiles",
    organic_partner: "recycler_profiles",
    partner: "recycler_profiles",
    government: "government_profiles",
  };

  const table = tableMap[role];
  if (!table) return;

  try {
    await supabase.from(table).insert({ profile_id: profileId });
  } catch {
    // May already exist — non-fatal
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
