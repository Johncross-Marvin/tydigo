/**
 * Tydigo Session Service
 *
 * Manages device sessions — track, list, and terminate sessions.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type DeviceSession = {
  id: string;
  profile_id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  is_current: boolean;
  last_seen_at: string;
  created_at: string;
};

function parseUserAgent(): { browser: string; os: string; device: string } {
  if (typeof window === "undefined") return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) { os = "Android"; device = "Mobile"; }
  else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; device = "Mobile"; }

  return { browser, os, device };
}

export async function recordDeviceSession(profileId: string, authUserId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const { browser, os, device } = parseUserAgent();

  try {
    // Mark all existing sessions as not current
    await supabase
      .from("device_sessions")
      .update({ is_current: false })
      .eq("profile_id", profileId);

    // Create new current session
    await supabase.from("device_sessions").insert({
      profile_id: profileId,
      auth_user_id: authUserId,
      device_name: device,
      browser,
      os,
      is_current: true,
      last_seen_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }
}

export async function getDeviceSessions(profileId: string): Promise<DeviceSession[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("device_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_seen_at", { ascending: false });

  return (data as DeviceSession[]) || [];
}

export async function terminateSession(sessionId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("device_sessions")
    .delete()
    .eq("id", sessionId);
}

export async function terminateOtherSessions(profileId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("device_sessions")
    .delete()
    .eq("profile_id", profileId)
    .eq("is_current", false);
}
