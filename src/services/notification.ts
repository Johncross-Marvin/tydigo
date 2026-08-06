/**
 * Tydigo Notification Service
 *
 * Manages in-app notifications, push notification preferences,
 * and notification CRUD operations.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────

export type Notification = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  type: "pickup_update" | "payment" | "ecopoints" | "system" | "kyc" | "promo";
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  pickup_updates: boolean;
  payment_updates: boolean;
  ecopoints_updates: boolean;
  promo_notifications: boolean;
};

// ─── Get Notifications ────────────────────────────────────────

export async function getNotifications(
  profileId: string,
  options?: { limit?: number; unreadOnly?: boolean },
): Promise<Notification[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Notification[];
}

// ─── Get Unread Count ─────────────────────────────────────────

export async function getUnreadCount(profileId: string): Promise<number> {
  if (!isSupabaseAvailable() || !supabase) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

// ─── Mark as Read ─────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllAsRead(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("profile_id", profileId)
    .eq("read", false);
}

// ─── Create Notification ──────────────────────────────────────

export async function createNotification(params: {
  profileId: string;
  title: string;
  body: string;
  type: Notification["type"];
  data?: Record<string, unknown>;
}): Promise<Notification | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      profile_id: params.profileId,
      title: params.title,
      body: params.body,
      type: params.type,
      data: params.data ?? {},
      read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return data as Notification;
}

// ─── Notification Preferences ─────────────────────────────────

export async function getNotificationPreferences(
  profileId: string,
): Promise<NotificationPreferences> {
  if (!isSupabaseAvailable() || !supabase) {
    return {
      push_enabled: true,
      email_enabled: true,
      sms_enabled: true,
      pickup_updates: true,
      payment_updates: true,
      ecopoints_updates: true,
      promo_notifications: false,
    };
  }

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return {
    push_enabled: true,
    email_enabled: true,
    sms_enabled: true,
    pickup_updates: true,
    payment_updates: true,
    ecopoints_updates: true,
    promo_notifications: false,
  };

  return {
    push_enabled: data.push_enabled as boolean,
    email_enabled: data.email_enabled as boolean,
    sms_enabled: data.sms_enabled as boolean,
    pickup_updates: data.pickup_updates as boolean,
    payment_updates: data.payment_updates as boolean,
    ecopoints_updates: data.ecopoints_updates as boolean,
    promo_notifications: data.promo_notifications as boolean,
  };
}

export async function updateNotificationPreferences(
  profileId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const dbUpdates: Record<string, unknown> = {};
  if (prefs.push_enabled !== undefined) dbUpdates.push_enabled = prefs.push_enabled;
  if (prefs.email_enabled !== undefined) dbUpdates.email_enabled = prefs.email_enabled;
  if (prefs.sms_enabled !== undefined) dbUpdates.sms_enabled = prefs.sms_enabled;
  if (prefs.pickup_updates !== undefined) dbUpdates.pickup_updates = prefs.pickup_updates;
  if (prefs.payment_updates !== undefined) dbUpdates.payment_updates = prefs.payment_updates;
  if (prefs.ecopoints_updates !== undefined) dbUpdates.ecopoints_updates = prefs.ecopoints_updates;
  if (prefs.promo_notifications !== undefined) dbUpdates.promo_notifications = prefs.promo_notifications;

  await supabase
    .from("notification_preferences")
    .upsert({ profile_id: profileId, ...dbUpdates }, { onConflict: "profile_id" });
}

// ─── Subscribe to Real-time Notifications ─────────────────────

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
        filter: `profile_id=eq.${profileId}`,
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
