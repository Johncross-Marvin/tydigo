/**
 * Tydigo Collector Vehicle Service
 *
 * Vehicle CRUD, photos, capacity management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type CollectorVehicle = {
  id: string;
  collector_id: string;
  vehicle_type: "truck" | "van" | "tricycle" | "motorcycle" | "bicycle" | "cart" | "other";
  brand: string | null;
  model: string | null;
  year: number | null;
  plate_number: string | null;
  capacity_kg: number | null;
  fuel_type: "petrol" | "diesel" | "electric" | "manual" | "other" | null;
  photo_url: string | null;
  status: "active" | "maintenance" | "inactive" | "retired";
};

export type VehicleInput = Omit<CollectorVehicle, "id" | "collector_id" | "created_at" | "updated_at">;

export async function getVehicles(profileId: string): Promise<CollectorVehicle[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_vehicles").select("*").eq("collector_id", profileId).order("created_at", { ascending: false });
  return (data || []) as CollectorVehicle[];
}

export async function getVehicle(vehicleId: string): Promise<CollectorVehicle | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("collector_vehicles").select("*").eq("id", vehicleId).maybeSingle();
  return data as CollectorVehicle | null;
}

export async function addVehicle(profileId: string, input: VehicleInput): Promise<CollectorVehicle> {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Supabase not available");
  const { data } = await supabase.from("collector_vehicles").insert({ ...input, collector_id: profileId }).select().maybeSingle();
  if (!data) throw new Error("Failed to add vehicle");
  return data as CollectorVehicle;
}

export async function updateVehicle(vehicleId: string, updates: Partial<VehicleInput>): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("collector_vehicles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", vehicleId);
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("collector_vehicles").delete().eq("id", vehicleId);
}

export async function uploadVehiclePhoto(profileId: string, vehicleId: string, file: File): Promise<string> {
  if (!isSupabaseAvailable() || !supabase) return URL.createObjectURL(file);
  const fileName = `${profileId}/${vehicleId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("vehicle-photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from("vehicle-photos").getPublicUrl(data.path);
  await supabase.from("collector_vehicles").update({ photo_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq("id", vehicleId);
  return urlData.publicUrl;
}

export const VEHICLE_TYPES = [
  { value: "truck", label: "Truck", icon: "🚛" },
  { value: "van", label: "Van", icon: "🚐" },
  { value: "tricycle", label: "Tricycle (Keke)", icon: "🛺" },
  { value: "motorcycle", label: "Motorcycle", icon: "🏍️" },
  { value: "bicycle", label: "Bicycle", icon: "🚲" },
  { value: "cart", label: "Push Cart", icon: "🛒" },
  { value: "other", label: "Other", icon: "🚗" },
] as const;

export const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "manual", label: "Manual" },
  { value: "other", label: "Other" },
] as const;
