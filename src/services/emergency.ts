/**
 * Tydigo Emergency Contacts Service
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type EmergencyContact = {
  id: string;
  profile_id: string;
  full_name: string;
  relationship: string;
  phone: string;
  email: string | null;
  priority: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type EmergencyContactInput = {
  full_name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority?: number;
};

export const RELATIONSHIP_OPTIONS = [
  "Spouse", "Parent", "Sibling", "Child", "Friend",
  "Neighbor", "Colleague", "Guardian", "Other",
];

export async function getEmergencyContacts(profileId: string): Promise<EmergencyContact[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("profile_id", profileId)
    .order("priority")
    .order("created_at", { ascending: false });
  return (data as EmergencyContact[]) || [];
}

export async function addEmergencyContact(profileId: string, input: EmergencyContactInput): Promise<EmergencyContact | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("emergency_contacts")
    .insert({
      profile_id: profileId,
      full_name: input.full_name,
      relationship: input.relationship,
      phone: input.phone,
      email: input.email || null,
      priority: input.priority || 1,
    })
    .select()
    .maybeSingle();
  return data as EmergencyContact | null;
}

export async function updateEmergencyContact(contactId: string, input: Partial<EmergencyContactInput>): Promise<EmergencyContact | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("emergency_contacts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select()
    .maybeSingle();
  return data as EmergencyContact | null;
}

export async function deleteEmergencyContact(contactId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("emergency_contacts").delete().eq("id", contactId);
}
