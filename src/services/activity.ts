/**
 * Tydigo Activity Log Service
 *
 * Tracks and retrieves user activity history.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type ActivityLog = {
  id: string;
  profile_id: string;
  activity_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export async function getActivityLogs(profileId: string, limit = 50): Promise<ActivityLog[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ActivityLog[]) || [];
}

export async function logActivity(
  profileId: string,
  activityType: string,
  description: string,
  options?: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  try {
    await supabase.from("activity_logs").insert({
      profile_id: profileId,
      activity_type: activityType,
      description,
      entity_type: options?.entityType || null,
      entity_id: options?.entityId || null,
      metadata: options?.metadata || null,
    });
  } catch {
    // Non-fatal
  }
}
