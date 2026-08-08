/**
 * Tydigo Profile Service
 *
 * Profile CRUD, avatar upload, profile completion, role profile management.
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
  date_of_birth: string | null;
  gender: string | null;
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
  profile_completion: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<Pick<Profile, "full_name" | "bio" | "date_of_birth" | "gender" | "language" | "timezone" | "username">>;

// ─── CRUD ──────────────────────────────────────────────────

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

// ─── Avatar ────────────────────────────────────────────────

export async function uploadAvatar(profileId: string, file: File): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${profileId}/avatar-${Date.now()}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { cacheControl: "3600", upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
  const avatarUrl = urlData.publicUrl;

  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  return avatarUrl;
}

export async function deleteAvatar(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  // List and delete existing avatars
  const { data: files } = await supabase.storage.from("avatars").list(profileId);
  if (files?.length) {
    await supabase.storage.from("avatars").remove(files.map((f) => `${profileId}/${f.name}`));
  }
  await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", profileId);
}

// ─── Profile Completion ────────────────────────────────────

export function calculateProfileCompletion(profile: Record<string, unknown>): number {
  const fields = [
    { key: "full_name", weight: 10 },
    { key: "phone", weight: 10 },
    { key: "email", weight: 10 },
    { key: "username", weight: 5 },
    { key: "avatar_url", weight: 5 },
    { key: "bio", weight: 5 },
    { key: "date_of_birth", weight: 5 },
    { key: "gender", weight: 5 },
    { key: "default_city", weight: 5 },
    { key: "kyc_status", weight: 15, check: (v: unknown) => v === "approved" },
    { key: "email_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "phone_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "last_login", weight: 5, check: (v: unknown) => !!v },
  ];

  let score = 0;
  for (const field of fields) {
    const val = profile[field.key];
    if (field.check ? field.check(val) : !!val) {
      score += field.weight;
    }
  }

  return Math.min(100, score);
}

export async function syncProfileCompletion(profileId: string): Promise<number> {
  if (!isSupabaseAvailable() || !supabase) return 0;
  const profile = await getProfileById(profileId);
  if (!profile) return 0;
  const pct = calculateProfileCompletion(profile as unknown as Record<string, unknown>);
  await supabase
    .from("profiles")
    .update({ profile_completion: pct, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  return pct;
}

// ─── Role Profiles ─────────────────────────────────────────

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
    fleet_owner: "fleet_profiles",
    government: "government_profiles",
    corporate_partner: "corporate_profiles",
    partner: "partner_profiles",
  };

  const table = tableMap[role];
  if (!table) return;

  const { data: existing } = await supabase.from(table).select("id").eq("profile_id", profileId).maybeSingle();
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
    id: profile.id,
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
