/**
 * Tydigo Address Service
 *
 * CRUD for user addresses, pickup locations, and default management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type Address = {
  id: string;
  profile_id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  country: string;
  state: string | null;
  city: string | null;
  lga: string | null;
  estate: string | null;
  street: string | null;
  building: string | null;
  landmark: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PickupLocation = {
  id: string;
  profile_id: string;
  address_id: string | null;
  nickname: string | null;
  is_favorite: boolean;
  last_used_at: string | null;
  created_at: string;
  address?: Address;
};

export type AddressInput = Omit<Address, "id" | "profile_id" | "created_at" | "updated_at">;

// ─── Addresses ─────────────────────────────────────────────

export async function getAddresses(profileId: string): Promise<Address[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("profile_id", profileId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as Address[]) || [];
}

export async function getAddress(addressId: string): Promise<Address | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("addresses").select("*").eq("id", addressId).maybeSingle();
  return data as Address | null;
}

export async function createAddress(profileId: string, input: AddressInput): Promise<Address | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  // If this is the default, unset other defaults
  if (input.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("profile_id", profileId);
  }

  const { data } = await supabase
    .from("addresses")
    .insert({ ...input, profile_id: profileId })
    .select()
    .maybeSingle();

  return data as Address | null;
}

export async function updateAddress(addressId: string, input: Partial<AddressInput>): Promise<Address | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data: existing } = await supabase.from("addresses").select("profile_id").eq("id", addressId).maybeSingle();
  if (!existing) return null;

  if (input.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("profile_id", existing.profile_id);
  }

  const { data } = await supabase
    .from("addresses")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", addressId)
    .select()
    .maybeSingle();

  return data as Address | null;
}

export async function deleteAddress(addressId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("addresses").delete().eq("id", addressId);
}

export async function setDefaultAddress(profileId: string, addressId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("addresses").update({ is_default: false }).eq("profile_id", profileId);
  await supabase.from("addresses").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", addressId);
}

// ─── Pickup Locations ──────────────────────────────────────

export async function getPickupLocations(profileId: string): Promise<PickupLocation[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("pickup_locations")
    .select("*, address:addresses(*)")
    .eq("profile_id", profileId)
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false });
  return (data as unknown as PickupLocation[]) || [];
}

export async function addPickupLocation(profileId: string, addressId: string, nickname?: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("pickup_locations").insert({
    profile_id: profileId,
    address_id: addressId,
    nickname: nickname || null,
    last_used_at: new Date().toISOString(),
  });
}

export async function toggleFavoritePickup(locationId: string, isFavorite: boolean): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("pickup_locations").update({ is_favorite: isFavorite }).eq("id", locationId);
}
