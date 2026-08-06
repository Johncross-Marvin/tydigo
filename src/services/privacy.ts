/**
 * Tydigo Privacy & Settings Service
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type PrivacySettings = {
  id: string;
  profile_id: string;
  show_profile: boolean;
  show_phone: boolean;
  show_email: boolean;
  share_location: boolean;
  allow_messages: boolean;
  allow_marketing: boolean;
};

export type PrivacySettingsInput = Partial<Omit<PrivacySettings, "id" | "profile_id">>;

export async function getPrivacySettings(profileId: string): Promise<PrivacySettings> {
  if (!isSupabaseAvailable() || !supabase) {
    return { id: "", profile_id: profileId, show_profile: true, show_phone: false, show_email: false, share_location: true, allow_messages: true, allow_marketing: false };
  }

  const { data } = await supabase
    .from("privacy_settings")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) {
    // Create defaults
    const defaults = { profile_id: profileId, show_profile: true, show_phone: false, show_email: false, share_location: true, allow_messages: true, allow_marketing: false };
    const { data: created } = await supabase.from("privacy_settings").insert(defaults).select().maybeSingle();
    return (created as PrivacySettings) || { id: "", ...defaults };
  }

  return data as PrivacySettings;
}

export async function updatePrivacySettings(profileId: string, input: PrivacySettingsInput): Promise<PrivacySettings | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("privacy_settings")
    .upsert({ profile_id: profileId, ...input, updated_at: new Date().toISOString() }, { onConflict: "profile_id" })
    .select()
    .maybeSingle();
  return data as PrivacySettings | null;
}
