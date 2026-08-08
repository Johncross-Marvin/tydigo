/**
 * Tydigo Supabase Realtime Hook
 *
 * Provides targeted Realtime subscriptions for role-specific data.
 * Uses TanStack Query invalidation to keep dashboard data fresh.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = string;
type EventFilter = "INSERT" | "UPDATE" | "DELETE" | "*";

type RealtimeSubscription = {
  table: TableName;
  filter?: string;
  events?: EventFilter[];
  queryKeys: string[][];
};

/**
 * Subscribe to Supabase Realtime changes and invalidate TanStack Query cache.
 *
 * @param subscriptions - Array of table subscriptions with associated query keys
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useRealtime(
  subscriptions: RealtimeSubscription[],
  enabled = true,
) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!enabled || !isSupabaseAvailable() || !supabase) return;

    const channels: RealtimeChannel[] = [];

    for (const sub of subscriptions) {
      const filter = sub.filter
        ? { event: sub.events?.join(",") || "*", schema: "public", table: sub.table, filter: sub.filter }
        : { event: sub.events?.join(",") || "*", schema: "public", table: sub.table };

      const channel = supabase
        .channel(`realtime:${sub.table}:${sub.filter || "all"}`)
        .on(
          "postgres_changes" as never,
          filter as never,
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            // Invalidate all associated query keys
            for (const queryKey of sub.queryKeys) {
              queryClient.invalidateQueries({ queryKey });
            }
          },
        )
        .subscribe();

      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [enabled, queryClient, subscriptions]);
}

/**
 * Pre-built subscription configs for common role dashboards.
 */

export const householdRealtimeSubs = (profileId: string): RealtimeSubscription[] => [
  {
    table: "pickup_requests",
    filter: `customer_id=eq.${profileId}`,
    events: ["UPDATE", "INSERT"],
    queryKeys: [["pickups", profileId], ["dashboard", "household", profileId]],
  },
  {
    table: "notifications",
    filter: `recipient_id=eq.${profileId}`,
    events: ["INSERT"],
    queryKeys: [["notifications", profileId]],
  },
  {
    table: "profiles",
    filter: `id=eq.${profileId}`,
    events: ["UPDATE"],
    queryKeys: [["profile", profileId]],
  },
];

export const collectorRealtimeSubs = (profileId: string): RealtimeSubscription[] => [
  {
    table: "collector_assignments",
    filter: `collector_id=eq.${profileId}`,
    events: ["INSERT", "UPDATE"],
    queryKeys: [["collector", "jobs", profileId], ["dashboard", "collector", profileId]],
  },
  {
    table: "notifications",
    filter: `recipient_id=eq.${profileId}`,
    events: ["INSERT"],
    queryKeys: [["notifications", profileId]],
  },
  {
    table: "profiles",
    filter: `id=eq.${profileId}`,
    events: ["UPDATE"],
    queryKeys: [["profile", profileId]],
  },
];

export const recyclerRealtimeSubs = (profileId: string): RealtimeSubscription[] => [
  {
    table: "marketplace_offers",
    filter: `seller_profile_id=eq.${profileId}`,
    events: ["INSERT", "UPDATE"],
    queryKeys: [["marketplace", "offers", profileId], ["dashboard", "recycler", profileId]],
  },
  {
    table: "marketplace_trades",
    filter: `seller_profile_id=eq.${profileId}`,
    events: ["INSERT", "UPDATE"],
    queryKeys: [["marketplace", "trades", profileId]],
  },
  {
    table: "notifications",
    filter: `recipient_id=eq.${profileId}`,
    events: ["INSERT"],
    queryKeys: [["notifications", profileId]],
  },
];

export const fleetRealtimeSubs = (profileId: string): RealtimeSubscription[] => [
  {
    table: "collector_assignments",
    events: ["INSERT", "UPDATE"],
    queryKeys: [["fleet", "assignments", profileId], ["dashboard", "fleet", profileId]],
  },
  {
    table: "notifications",
    filter: `recipient_id=eq.${profileId}`,
    events: ["INSERT"],
    queryKeys: [["notifications", profileId]],
  },
];

export const governmentRealtimeSubs = (profileId: string): RealtimeSubscription[] => [
  {
    table: "notifications",
    filter: `recipient_id=eq.${profileId}`,
    events: ["INSERT"],
    queryKeys: [["notifications", profileId]],
  },
];
