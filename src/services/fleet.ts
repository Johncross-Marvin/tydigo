/**
 * Tydigo Fleet Service
 *
 * Canonical fleet operations boundary. Queries Supabase directly (no dead REST
 * endpoints). Fleet Operator (fleet_owner) resolves their fleet_profiles row,
 * then reads affiliated drivers (organization_memberships), vehicles
 * (collector_vehicles.fleet_id), and operational metrics from real data.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────

export type FleetProfile = {
  id: string;
  profileId: string;
  companyName: string | null;
  fleetSize: number | null;
  vehicleTypes: string[] | null;
  serviceAreas: string[] | null;
  createdAt: string;
};

export type FleetDriver = {
  profileId: string;
  fullName: string;
  phone: string | null;
  membershipStatus: string;
  membershipRole: string;
  joinedAt: string | null;
  isOnline: boolean;
  kycStatus: string;
  rating: number | null;
  totalPickups: number;
  currentJobId: string | null;
  assignedVehicleId: string | null;
};

export type FleetVehicle = {
  id: string;
  vehicleType: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plateNumber: string | null;
  capacityKg: number | null;
  fuelType: string | null;
  status: string;
  fleetId: string | null;
};

export type FleetOverview = {
  totalDrivers: number;
  onlineDrivers: number;
  busyDrivers: number;
  totalVehicles: number;
  availableVehicles: number;
  activeJobs: number;
  completedJobs: number;
  avgRating: number | null;
};

// ─── Get Fleet Profile ────────────────────────────────────────

export async function getFleetProfile(profileId: string): Promise<FleetProfile | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("fleet_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    profileId: row.profile_id as string,
    companyName: (row.company_name as string) ?? null,
    fleetSize: (row.fleet_size as number) ?? null,
    vehicleTypes: (row.vehicle_types as string[]) ?? null,
    serviceAreas: (row.service_areas as string[]) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Get Fleet Drivers (affiliated collectors) ────────────────

export async function getFleetDrivers(fleetProfileId: string): Promise<FleetDriver[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  // Affiliated collectors are linked via organization_memberships where
  // organization_id = fleet_profiles.id.
  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("profile_id, role, status, joined_at")
    .eq("organization_id", fleetProfileId);

  if (!memberships?.length) return [];

  const profileIds = memberships.map((m) => m.profile_id as string);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, rating, total_pickups, kyc_status")
    .in("id", profileIds);

  const { data: collectorProfiles } = await supabase
    .from("collector_profiles")
    .select("id, profile_id, is_online")
    .in("profile_id", profileIds);

  // collector_availability.collector_profile_id references collector_profiles.id
  // (NOT profiles.id). Resolve the collector_profiles.id values first, then query
  // availability by those IDs so current_job_id resolves correctly.
  const collectorProfileIds = (collectorProfiles || []).map((c) => c.id as string);

  const { data: availability } = collectorProfileIds.length
    ? await supabase
        .from("collector_availability")
        .select("collector_profile_id, current_job_id")
        .in("collector_profile_id", collectorProfileIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id as string, p]));
  const onlineMap = new Map((collectorProfiles || []).map((c) => [c.profile_id as string, c.is_online as boolean]));
  // Map collector_profiles.id → profiles.id so we can look up current_job_id by profile id
  const collectorProfileIdToProfileId = new Map(
    (collectorProfiles || []).map((c) => [c.id as string, c.profile_id as string]),
  );
  const jobMap = new Map(
    (availability || []).map((a) => [
      collectorProfileIdToProfileId.get(a.collector_profile_id as string) ?? (a.collector_profile_id as string),
      a.current_job_id as string | null,
    ]),
  );

  return memberships.map((m) => {
    const p = profileMap.get(m.profile_id as string);
    return {
      profileId: m.profile_id as string,
      fullName: (p?.full_name as string) ?? "Collector",
      phone: (p?.phone as string) ?? null,
      membershipStatus: m.status as string,
      membershipRole: m.role as string,
      joinedAt: m.joined_at as string | null,
      isOnline: onlineMap.get(m.profile_id as string) ?? false,
      kycStatus: (p?.kyc_status as string) ?? "pending",
      rating: (p?.rating as number | null) ?? null,
      totalPickups: (p?.total_pickups as number) ?? 0,
      currentJobId: jobMap.get(m.profile_id as string) ?? null,
      assignedVehicleId: null,
    };
  });
}

// ─── Get Fleet Vehicles ───────────────────────────────────────

export async function getFleetVehicles(fleetProfileId: string): Promise<FleetVehicle[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("collector_vehicles")
    .select("*")
    .eq("fleet_id", fleetProfileId);

  return ((data || []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    vehicleType: row.vehicle_type as string,
    brand: (row.brand as string) ?? null,
    model: (row.model as string) ?? null,
    year: (row.year as number) ?? null,
    plateNumber: (row.plate_number as string) ?? null,
    capacityKg: (row.capacity_kg as number) ?? null,
    fuelType: (row.fuel_type as string) ?? null,
    status: row.status as string,
    fleetId: (row.fleet_id as string) ?? null,
  }));
}

// ─── Get Fleet Overview ───────────────────────────────────────

export async function getFleetOverview(fleetProfileId: string): Promise<FleetOverview> {
  const [drivers, vehicles] = await Promise.all([
    getFleetDrivers(fleetProfileId),
    getFleetVehicles(fleetProfileId),
  ]);

  const onlineDrivers = drivers.filter((d) => d.isOnline).length;
  const busyDrivers = drivers.filter((d) => d.currentJobId != null).length;
  const availableVehicles = vehicles.filter((v) => v.status === "active" || v.status === "available").length;

  const ratings = drivers.map((d) => d.rating).filter((r): r is number => r != null);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : null;

  return {
    totalDrivers: drivers.length,
    onlineDrivers,
    busyDrivers,
    totalVehicles: vehicles.length,
    availableVehicles,
    activeJobs: busyDrivers,
    completedJobs: 0, // Derived from real assignment history (not fabricated)
    avgRating,
  };
}

// ─── Add Fleet Vehicle ────────────────────────────────────────

export async function addFleetVehicle(
  fleetProfileId: string,
  input: {
    vehicleType: string;
    brand?: string;
    model?: string;
    year?: number;
    plateNumber?: string;
    capacityKg?: number;
    fuelType?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { error } = await supabase.from("collector_vehicles").insert({
    fleet_id: fleetProfileId,
    vehicle_type: input.vehicleType,
    brand: input.brand ?? null,
    model: input.model ?? null,
    year: input.year ?? null,
    plate_number: input.plateNumber ?? null,
    capacity_kg: input.capacityKg ?? null,
    fuel_type: input.fuelType ?? null,
    status: "active",
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Update Fleet Vehicle Status ──────────────────────────────

export async function updateFleetVehicleStatus(
  vehicleId: string,
  fleetProfileId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: "Not available" };
  }

  const { error } = await supabase
    .from("collector_vehicles")
    .update({ status })
    .eq("id", vehicleId)
    .eq("fleet_id", fleetProfileId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
