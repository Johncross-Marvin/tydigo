/**
 * Tydigo Security Audit Service
 *
 * Tracks security events: login, logout, password changes, etc.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type SecurityEventType =
  | "account_created"
  | "email_verified"
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "email_change_requested"
  | "email_changed"
  | "phone_changed"
  | "username_changed"
  | "session_revoked"
  | "suspicious_activity";

export type SecurityEvent = {
  id: string;
  profile_id: string;
  event_type: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function logSecurityEvent(
  profileId: string,
  eventType: SecurityEventType,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase.from("security_events").insert({
    profile_id: profileId,
    event_type: eventType,
    action,
    ip_address: null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent?.slice(0, 500) : null,
    metadata: metadata || null,
  });
}

export async function getSecurityEvents(profileId: string, limit = 50): Promise<SecurityEvent[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("security_events")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as SecurityEvent[];
}
