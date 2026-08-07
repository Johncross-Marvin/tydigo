/**
 * Tydigo Tracking Service
 *
 * Real-time collector location tracking via Supabase Realtime.
 * Records location pings and provides live subscription.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type TrackingPoint = {
  id: string;
  pickup_request_id: string;
  collector_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  battery_level: number | null;
  timestamp: string;
};

/**
 * Record a tracking ping from the collector.
 */
export async function recordTrackingPing(
  pickupRequestId: string,
  collectorId: string,
  location: { latitude: number; longitude: number; speed?: number; heading?: number; accuracy?: number; batteryLevel?: number },
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase.from("pickup_tracking").insert({
    pickup_request_id: pickupRequestId,
    collector_id: collectorId,
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed || null,
    heading: location.heading || null,
    accuracy: location.accuracy || null,
    battery_level: location.batteryLevel || null,
  });

  // Update collector's current location (collectorId is profiles.id, not collector_profiles.id)
  await supabase
    .from("collector_profiles")
    .update({
      current_lat: location.latitude,
      current_lng: location.longitude,
      last_location_at: new Date().toISOString(),
    })
    .eq("profile_id", collectorId);
}

/**
 * Get the latest tracking point for a pickup.
 */
export async function getLatestTrackingPoint(pickupRequestId: string): Promise<TrackingPoint | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("pickup_tracking")
    .select("*")
    .eq("pickup_request_id", pickupRequestId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as TrackingPoint | null;
}

/**
 * Get tracking history for a pickup.
 */
export async function getTrackingHistory(pickupRequestId: string, limit = 50): Promise<TrackingPoint[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("pickup_tracking")
    .select("*")
    .eq("pickup_request_id", pickupRequestId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (data as TrackingPoint[]) || [];
}

/**
 * Subscribe to real-time tracking updates for a pickup.
 */
export function subscribeToTracking(
  pickupRequestId: string,
  onUpdate: (point: TrackingPoint) => void,
): () => void {
  if (!isSupabaseAvailable() || !supabase) return () => {};

  const channel = supabase
    .channel(`tracking:${pickupRequestId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pickup_tracking",
        filter: `pickup_request_id=eq.${pickupRequestId}`,
      },
      (payload) => {
        onUpdate(payload.new as TrackingPoint);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to pickup status changes in real-time.
 */
export function subscribeToPickupStatus(
  pickupRequestId: string,
  onStatusChange: (status: string, data: Record<string, unknown>) => void,
): () => void {
  if (!isSupabaseAvailable() || !supabase) return () => {};

  const channel = supabase
    .channel(`pickup:${pickupRequestId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "pickup_requests",
        filter: `id=eq.${pickupRequestId}`,
      },
      (payload) => {
        const newData = payload.new as Record<string, unknown>;
        onStatusChange(newData.status as string, newData);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
