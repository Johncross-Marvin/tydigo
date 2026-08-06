/**
 * Tydigo Collector Performance Service
 *
 * Performance analytics, levels, badges, achievements, bonuses.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type CollectorPerformance = {
  id: string;
  collector_id: string;
  total_pickups: number;
  completed_jobs: number;
  cancelled_jobs: number;
  total_weight_kg: number;
  total_distance_km: number;
  average_rating: number;
  acceptance_rate: number;
  completion_rate: number;
  on_time_rate: number;
  average_response_seconds: number;
  total_earnings_ngn: number;
  total_ecopoints: number;
  current_level: string;
  performance_score: number;
};

export type CollectorLevel = {
  id: string;
  name: string;
  minimum_points: number;
  minimum_rating: number;
  minimum_completion_rate: number;
  platform_fee_discount_pct: number;
  priority_boost: number;
  badge_icon: string | null;
  benefits: string[] | null;
};

export type CollectorBadge = {
  id: string;
  collector_id: string;
  badge_name: string;
  badge_icon: string | null;
  earned_at: string;
};

export type BonusProgram = {
  id: string;
  title: string;
  description: string | null;
  bonus_type: string;
  reward_ngn: number;
  reward_ecopoints: number;
  multiplier: number;
  is_active: boolean;
};

export async function getPerformance(profileId: string): Promise<CollectorPerformance | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("collector_performance").select("*").eq("collector_id", profileId).maybeSingle();
  return data as CollectorPerformance | null;
}

export async function getLevels(): Promise<CollectorLevel[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_levels").select("*").order("minimum_points", { ascending: true });
  return (data || []) as CollectorLevel[];
}

export async function getNextLevel(currentPoints: number): Promise<CollectorLevel | null> {
  const levels = await getLevels();
  return levels.find((l) => l.minimum_points > currentPoints) || null;
}

export async function getBadges(profileId: string): Promise<CollectorBadge[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_badges").select("*").eq("collector_id", profileId).order("earned_at", { ascending: false });
  return (data || []) as CollectorBadge[];
}

export async function getBonusPrograms(): Promise<BonusProgram[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_bonus_programs").select("*").eq("is_active", true);
  return (data || []) as BonusProgram[];
}

export async function getLeaderboard(limit = 20): Promise<Array<{ name: string; score: number; level: string; pickups: number }>> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_performance").select("collector_id, performance_score, current_level, completed_jobs").order("performance_score", { ascending: false }).limit(limit);
  if (!data?.length) return [];

  const profileIds = data.map((d: Record<string, unknown>) => d.collector_id);
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profileIds);

  const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p.full_name]));

  return data.map((d: Record<string, unknown>) => ({
    name: (profileMap.get(d.collector_id as string) || "Collector") as string,
    score: d.performance_score as number,
    level: d.current_level as string,
    pickups: d.completed_jobs as number,
  }));
}

export const LEVEL_COLORS: Record<string, string> = {
  bronze: "bg-amber-700 text-amber-100",
  silver: "bg-gray-400 text-white",
  gold: "bg-amber-500 text-amber-900",
  platinum: "bg-cyan-500 text-white",
  diamond: "bg-blue-500 text-white",
  master: "bg-purple-600 text-white",
  elite: "bg-gradient-to-r from-amber-400 to-pink-500 text-white",
};
