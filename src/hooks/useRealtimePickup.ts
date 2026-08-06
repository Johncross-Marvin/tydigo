import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { Pickup } from "@/lib/api";

type RealtimePickupState = {
  pickup: Pickup | null;
  isConnected: boolean;
  lastUpdate: string | null;
  error: string | null;
};

export function useRealtimePickup(pickupId: string | null) {
  const [state, setState] = useState<RealtimePickupState>({
    pickup: null,
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  useEffect(() => {
    if (!pickupId || !isSupabaseAvailable() || !supabase) return;

    // Initial fetch
    const fetchPickup = async () => {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("id", pickupId)
        .maybeSingle();

      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
        return;
      }

      if (data) {
        setState((prev) => ({
          ...prev,
          pickup: mapDbToPickup(data),
          lastUpdate: new Date().toISOString(),
        }));
      }
    };

    fetchPickup();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`pickup:${pickupId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pickup_requests",
          filter: `id=eq.${pickupId}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            pickup: mapDbToPickup(payload.new as Record<string, unknown>),
            isConnected: true,
            lastUpdate: new Date().toISOString(),
          }));
        },
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          isConnected: status === "SUBSCRIBED",
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pickupId]);

  return state;
}

export function useRealtimeCollectorLocation(pickupId: string | null) {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
    updated_at: string;
  } | null>(null);

  useEffect(() => {
    if (!pickupId || !isSupabaseAvailable() || !supabase) return;

    const channel = supabase
      .channel(`collector-location:${pickupId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "collector_locations",
          filter: `pickup_id=eq.${pickupId}`,
        },
        (payload) => {
          const data = payload.new as Record<string, unknown>;
          setLocation({
            lat: data.latitude as number,
            lng: data.longitude as number,
            heading: data.heading as number | undefined,
            updated_at: data.updated_at as string,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pickupId]);

  return location;
}

function mapDbToPickup(db: Record<string, unknown>): Pickup {
  return {
    id: db.id as string,
    waste_type: db.waste_type as string,
    weight_kg: (db.estimated_weight_kg || db.weight_kg || 0) as number,
    address: (db.pickup_address || db.address || "") as string,
    schedule_window: (db.requested_window || db.schedule_window || "today") as string,
    payment_method: (db.payment_method || "card") as string,
    payment_status: (db.payment_status || "pending") as string,
    price_ngn: (db.final_total_ngn || db.price_ngn || 0) as number,
    status: db.status as string,
    pickup_code: db.pickup_code as string,
    collector_name: (db.collector_name || "Unassigned") as string,
    eta_minutes: db.eta_minutes as number | null | undefined,
    created_at: db.created_at as string,
    updated_at: db.updated_at as string,
  };
}
