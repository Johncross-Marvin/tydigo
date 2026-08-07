/**
 * Tydigo Notification Service
 *
 * Integrates with the canonical notifications table for
 * pickup lifecycle events. Uses Supabase Realtime for
 * live notification delivery.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type NotificationType =
  | "pickup.requested"
  | "pickup.matching"
  | "collector.offer_created"
  | "collector.assigned"
  | "collector.en_route"
  | "collector.arrived"
  | "pickup.verification_required"
  | "pickup.verified"
  | "pickup.collected"
  | "pickup.completed"
  | "pickup.cancelled"
  | "receipt_ready"
  | "payment_received";

export type Notification = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

// ─── Send Notification ────────────────────────────────────────

export async function sendNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || null,
      read: false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[Tydigo Notifications] Failed to send:", error);
    return null;
  }

  return (data as Record<string, unknown> | null)?.id as string || null;
}

// ─── Get Notifications ────────────────────────────────────────

export async function getNotifications(
  profileId: string,
  limit = 20,
  unreadOnly = false,
): Promise<Notification[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data } = await query;
  return (data as Notification[]) || [];
}

// ─── Mark as Read ─────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", profileId)
    .eq("read", false);
}

// ─── Unread Count ─────────────────────────────────────────────

export async function getUnreadCount(profileId: string): Promise<number> {
  if (!isSupabaseAvailable() || !supabase) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", profileId)
    .eq("read", false);

  return count || 0;
}

// ─── Subscribe to Notifications ───────────────────────────────

export function subscribeToNotifications(
  profileId: string,
  onNotification: (notification: Notification) => void,
): () => void {
  if (!isSupabaseAvailable() || !supabase) return () => {};

  const channel = supabase
    .channel(`notifications:${profileId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${profileId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Pickup Lifecycle Notification Helpers ────────────────────

export async function notifyPickupRequested(
  customerId: string,
  pickupId: string,
  pickupCode: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "pickup.requested",
    title: "Pickup Requested",
    body: `Your pickup #${pickupCode} has been created. We're finding a collector for you.`,
    data: { pickup_id: pickupId, pickup_code: pickupCode },
  });
}

export async function notifyCollectorAssigned(
  customerId: string,
  collectorId: string,
  pickupId: string,
  collectorName: string,
  etaMinutes: number | null,
): Promise<void> {
  // Notify customer
  await sendNotification({
    recipientId: customerId,
    type: "collector.assigned",
    title: "Collector Assigned",
    body: `${collectorName} is on the way${etaMinutes ? ` — ETA: ${etaMinutes} min` : ""}`,
    data: { pickup_id: pickupId, collector_name: collectorName, eta_minutes: etaMinutes },
  });

  // Notify collector
  await sendNotification({
    recipientId: collectorId,
    type: "collector.assigned",
    title: "Pickup Confirmed",
    body: `You've been assigned to a pickup. Head to the location.`,
    data: { pickup_id: pickupId },
  });
}

export async function notifyCollectorEnRoute(
  customerId: string,
  pickupId: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "collector.en_route",
    title: "Collector En Route",
    body: "Your collector is on the way. Track their location live.",
    data: { pickup_id: pickupId },
  });
}

export async function notifyCollectorArrived(
  customerId: string,
  pickupId: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "collector.arrived",
    title: "Collector Arrived",
    body: "Your collector has arrived. Please prepare your waste for pickup.",
    data: { pickup_id: pickupId },
  });
}

export async function notifyPickupVerified(
  customerId: string,
  pickupId: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "pickup.verified",
    title: "Pickup Verified",
    body: "Your waste has been verified. The collector will now pick it up.",
    data: { pickup_id: pickupId },
  });
}

export async function notifyWastePicked(
  customerId: string,
  pickupId: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "pickup.collected",
    title: "Waste Collected",
    body: "Your waste has been collected. Thank you for recycling!",
    data: { pickup_id: pickupId },
  });
}

export async function notifyPickupCompleted(
  customerId: string,
  pickupId: string,
  receiptNumber: string | null,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "pickup.completed",
    title: "Pickup Complete",
    body: receiptNumber
      ? `Your pickup is complete! Receipt #${receiptNumber} is ready.`
      : "Your pickup is complete! Thank you for using Tydigo.",
    data: { pickup_id: pickupId, receipt_number: receiptNumber },
  });
}

export async function notifyPickupCancelled(
  customerId: string,
  pickupId: string,
  reason?: string,
): Promise<void> {
  await sendNotification({
    recipientId: customerId,
    type: "pickup.cancelled",
    title: "Pickup Cancelled",
    body: reason || "Your pickup has been cancelled.",
    data: { pickup_id: pickupId, reason },
  });
}
