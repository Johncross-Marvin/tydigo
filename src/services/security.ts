/**
 * Tydigo Security Service
 *
 * Logs security events: login, logout, password changes, etc.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type SecurityEventType =
  | "login"
  | "logout"
  | "password_change"
  | "phone_change"
  | "email_change"
  | "failed_login"
  | "otp_request"
  | "role_change"
  | "suspicious_activity"
  | "signup";

export type SecurityLog = {
  id: string;
  profile_id: string;
  auth_user_id: string;
  event_type: SecurityEventType;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function logSecurityEvent(
  profileId: string,
  authUserId: string,
  eventType: SecurityEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("security_logs").insert({
      profile_id: profileId,
      auth_user_id: authUserId,
      event_type: eventType,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: metadata || null,
    });
  } catch {
    // Non-fatal
  }
}

export async function getSecurityLogs(
  profileId: string,
  limit = 50,
): Promise<SecurityLog[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("security_logs")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as SecurityLog[]) || [];
}
