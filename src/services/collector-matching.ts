/**
 * Tydigo Collector Matching Service
 *
 * Finds and ranks nearby collectors for pickup assignment.
 * Uses distance, availability, rating, vehicle capacity, and waste compatibility.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type NearbyCollector = {
  id: string;
  profile_id: string;
  full_name: string;
  rating: number;
  vehicle_type: string | null;
  max_capacity_kg: number | null;
  current_lat: number | null;
  current_lng: number | null;
  distance_km: number;
  is_online: boolean;
  total_pickups: number;
  acceptance_rate: number;
};

export type MatchResult = {
  collector: NearbyCollector;
  score: number;
  estimatedArrivalMinutes: number;
};

/**
 * Find nearby collectors within radius, ranked by match score.
 */
export async function findNearbyCollectors(
  lat: number,
  lng: number,
  radiusKm = 10,
  limit = 10,
): Promise<NearbyCollector[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  // Get online collectors with location
  const { data: collectors } = await supabase
    .from("collector_profiles")
    .select(`
      id, profile_id, is_online, vehicle_type, max_capacity_kg,
      current_lat, current_lng, total_earnings_ngn,
      profiles!inner(id, full_name, rating, total_pickups)
    `)
    .eq("is_online", true)
    .not("current_lat", "is", null)
    .not("current_lng", "is", null);

  if (!collectors?.length) return [];

  // Calculate distances and filter
  const withDistance: NearbyCollector[] = (collectors as unknown as Array<{
    id: string; profile_id: string; is_online: boolean; vehicle_type: string | null;
    max_capacity_kg: number | null; current_lat: number | null; current_lng: number | null;
    total_earnings_ngn: number;
    profiles: { id: string; full_name: string; rating: number; total_pickups: number };
  }>)
    .map((c) => {
      const distance = haversineDistance(lat, lng, c.current_lat || 0, c.current_lng || 0);
      return {
        id: c.id,
        profile_id: c.profile_id,
        full_name: c.profiles?.full_name || "Collector",
        rating: c.profiles?.rating || 5.0,
        vehicle_type: c.vehicle_type,
        max_capacity_kg: c.max_capacity_kg,
        current_lat: c.current_lat,
        current_lng: c.current_lng,
        distance_km: Math.round(distance * 10) / 10,
        is_online: c.is_online,
        total_pickups: c.profiles?.total_pickups || 0,
        acceptance_rate: 0.85, // Default; would be calculated from assignment history
      };
    })
    .filter((c) => c.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  return withDistance;
}

/**
 * Rank collectors by composite score: distance, rating, capacity, acceptance rate.
 */
export function rankCollectors(
  collectors: NearbyCollector[],
  estimatedWeightKg: number,
): MatchResult[] {
  return collectors
    .map((c) => {
      // Distance score (closer = better, max 40 points)
      const distanceScore = Math.max(0, 40 - c.distance_km * 4);

      // Rating score (5.0 = 30 points)
      const ratingScore = (c.rating / 5) * 30;

      // Capacity score (can handle weight = 20 points)
      const capacityScore = c.max_capacity_kg && c.max_capacity_kg >= estimatedWeightKg ? 20 : 5;

      // Acceptance rate score (10 points)
      const acceptanceScore = c.acceptance_rate * 10;

      const score = distanceScore + ratingScore + capacityScore + acceptanceScore;

      // Estimated arrival: ~3 min per km + 2 min prep
      const estimatedArrivalMinutes = Math.round(c.distance_km * 3 + 2);

      return { collector: c, score: Math.round(score * 10) / 10, estimatedArrivalMinutes };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Assign the best collector to a pickup request.
 */
export async function assignCollector(
  pickupRequestId: string,
  collectorProfileId: string,
  distanceKm: number,
  estimatedArrivalMinutes: number,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const now = new Date().toISOString();

  // Create assignment
  await supabase.from("collector_assignments").insert({
    pickup_request_id: pickupRequestId,
    collector_id: collectorProfileId,
    distance_km: distanceKm,
    estimated_arrival_minutes: estimatedArrivalMinutes,
    accepted_at: now,
  });

  // Update pickup request
  await supabase
    .from("pickup_requests")
    .update({
      collector_id: collectorProfileId,
      collector_assigned_at: now,
      status: "collector_assigned",
      updated_at: now,
    })
    .eq("id", pickupRequestId);

  // Record status event
  await supabase.from("pickup_status_events").insert({
    pickup_id: pickupRequestId,
    from_status: "matching_collector",
    to_status: "collector_assigned",
    notes: `Collector assigned (${distanceKm}km, ~${estimatedArrivalMinutes}min)`,
    created_at: now,
  });
}

/**
 * Haversine distance between two coordinates in km.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
