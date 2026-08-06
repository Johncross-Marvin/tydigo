/**
 * Tydigo Collector Service
 *
 * Core collector operations: availability, profile, job management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type CollectorProfile = {
  id: string;
  profile_id: string;
  is_online: boolean;
  vehicle_type: string | null;
  vehicle_plate_number: string | null;
  kyc_status: string;
  safety_training_completed: boolean;
  total_earnings_ngn: number;
  current_lat: number | null;
  current_lng: number | null;
  service_city: string;
  service_zones: string[] | null;
  max_capacity_kg: number | null;
};

export type CollectorDashboard = {
  profile: CollectorProfile | null;
  wallet: { available_balance_ngn: number; pending_balance_ngn: number; lifetime_earnings_ngn: number } | null;
  performance: { total_pickups: number; completed_jobs: number; average_rating: number; acceptance_rate: number; completion_rate: number; current_level: string; performance_score: number } | null;
  todayEarnings: number;
  todayJobs: number;
  activeJob: Record<string, unknown> | null;
  pendingRequests: number;
};

export async function getCollectorProfile(userId: string): Promise<CollectorProfile | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!profile) return null;
  const { data } = await supabase.from("collector_profiles").select("*").eq("profile_id", profile.id).maybeSingle();
  return data as CollectorProfile | null;
}

export async function toggleAvailability(userId: string, isOnline: boolean): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!profile) return;
  await supabase.from("collector_profiles").update({ is_online: isOnline, last_location_at: new Date().toISOString() }).eq("profile_id", profile.id);
}

export async function updateLocation(userId: string, lat: number, lng: number): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!profile) return;
  await supabase.from("collector_profiles").update({ current_lat: lat, current_lng: lng, last_location_at: new Date().toISOString() }).eq("profile_id", profile.id);
}

export async function getCollectorDashboard(userId: string): Promise<CollectorDashboard> {
  if (!isSupabaseAvailable() || !supabase) {
    return { profile: null, wallet: null, performance: null, todayEarnings: 0, todayJobs: 0, activeJob: null, pendingRequests: 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!profile) throw new Error("Profile not found");

  const profileId = profile.id;

  const [collectorRes, walletRes, perfRes, assignmentsRes] = await Promise.all([
    supabase.from("collector_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("collector_wallets").select("*").eq("collector_id", profileId).maybeSingle(),
    supabase.from("collector_performance").select("*").eq("collector_id", profileId).maybeSingle(),
    supabase.from("collector_assignments").select("*, pickup_request:pickup_request_id(*)").eq("collector_id", profileId).order("created_at", { ascending: false }).limit(20),
  ]);

  const assignments = (assignmentsRes.data || []) as unknown as Array<Record<string, unknown>>;
  const today = new Date().toISOString().slice(0, 10);
  const todayAssignments = assignments.filter((a) => (a.created_at as string)?.startsWith(today));
  const activeJob = assignments.find((a) => a.completed_at === null && a.cancelled_at === null) || null;
  const todayCompleted = todayAssignments.filter((a) => a.completed_at !== null);

  const todayEarnings = todayCompleted.reduce((sum, a) => {
    const pr = a.pickup_request as Record<string, unknown> | undefined;
    return sum + ((pr?.final_total_ngn as number) || 0);
  }, 0);

  return {
    profile: collectorRes.data as CollectorProfile | null,
    wallet: walletRes.data as CollectorDashboard["wallet"],
    performance: perfRes.data as CollectorDashboard["performance"],
    todayEarnings,
    todayJobs: todayCompleted.length,
    activeJob,
    pendingRequests: assignments.filter((a) => !a.accepted_at && !a.cancelled_at).length,
  };
}
