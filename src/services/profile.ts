/**
 * Tydigo Profile Service
 *
 * Profile CRUD, role profile management, and identity operations.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { UserRole, AuthUser } from "@/lib/api";

export type Profile = {
  id: string;
  auth_user_id: string;
  phone: string;
  email: string | null;
  full_name: string;
  username: string | null;
  role: UserRole;
  account_type: string;
  avatar_url: string | null;
  bio: string | null;
  default_city: string;
  default_state: string;
  country: string;
  language: string;
  timezone: string;
  kyc_status: string;
  email_verified: boolean;
  phone_verified: boolean;
  ecopoints: number;
  rating: number;
  total_pickups: number;
  total_kg_recycled: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export async function getProfile(authUserId: string): Promise<Profile | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return data as Profile | null;
}

export async function getProfileById(profileId: string): Promise<Profile | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  return data as Profile | null;
}

export async function updateProfile(
  authUserId: string,
  updates: Partial<Profile>,
): Promise<Profile | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("auth_user_id", authUserId)
    .select()
    .maybeSingle();

  return data as Profile | null;
}

export async function createRoleProfile(profileId: string, role: UserRole): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const now = new Date().toISOString();
  const base = { profile_id: profileId, created_at: now, updated_at: now };

  const tableMap: Record<string, string> = {
    collector: "collector_profiles",
    business: "business_profiles",
    estate: "business_profiles",
    recycler: "recycler_profiles",
    organic_partner: "organic_partner_profiles",
    fleet: "fleet_profiles",
    government: "government_profiles",
    corporate: "corporate_profiles",
    partner: "partner_profiles",
  };

  const table = tableMap[role];
  if (!table) return;

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) return;

  const defaults: Record<string, unknown> = {};
  if (role === "collector") {
    Object.assign(defaults, { is_online: false, kyc_status: "pending", safety_training_completed: false, total_earnings_ngn: 0, service_city: "Abuja" });
  } else if (role === "business" || role === "estate") {
    Object.assign(defaults, { business_name: "" });
  } else if (role === "partner") {
    Object.assign(defaults, { partner_type: "plastic_recycler", organization_name: "" });
  }

  await supabase.from(table).insert({ ...base, ...defaults });
}

export function mapProfileToUser(profile: Profile): AuthUser {
  return {
    id: profile.auth_user_id || profile.id,
    phone: profile.phone || "",
    name: profile.full_name || "Tydigo User",
    role: profile.role || "customer",
    address: profile.default_city || "",
    city: profile.default_city || "Abuja",
    state: profile.default_state || "FCT",
    ecopoints: profile.ecopoints || 0,
    rating: profile.rating || 5.0,
  };
}
