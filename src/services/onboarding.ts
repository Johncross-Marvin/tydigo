/**
 * Tydigo Onboarding Service
 *
 * Manages onboarding journeys, steps, progress, tutorials, and tooltips.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { UserRole } from "@/lib/api";

export type OnboardingJourney = {
  id: string;
  role: string;
  title: string;
  description: string | null;
  is_active: boolean;
};

export type OnboardingStep = {
  id: string;
  journey_id: string;
  step_number: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  illustration: string | null;
  video_url: string | null;
  estimated_minutes: number;
  action_type: string;
  action_value: string | null;
  is_required: boolean;
  sort_order: number;
};

export type OnboardingProgress = {
  id: string;
  profile_id: string;
  journey_id: string;
  step_id: string;
  completed: boolean;
  completed_at: string | null;
  time_spent: number;
  skipped: boolean;
  step?: OnboardingStep;
};

export type OnboardingState = {
  journey: OnboardingJourney | null;
  steps: OnboardingStep[];
  progress: OnboardingProgress[];
  completionPct: number;
  completedCount: number;
  totalSteps: number;
  estimatedMinutes: number;
  isComplete: boolean;
};

// ─── Journey & Steps ──────────────────────────────────────

export async function getJourney(role: UserRole): Promise<OnboardingJourney | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("onboarding_journeys")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();

  return data as OnboardingJourney | null;
}

export async function getSteps(journeyId: string): Promise<OnboardingStep[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("onboarding_steps")
    .select("*")
    .eq("journey_id", journeyId)
    .order("sort_order");

  return (data as OnboardingStep[]) || [];
}

// ─── Progress ─────────────────────────────────────────────

export async function getProgress(profileId: string, journeyId: string): Promise<OnboardingProgress[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("user_onboarding_progress")
    .select("*, step:onboarding_steps(*)")
    .eq("profile_id", profileId)
    .eq("journey_id", journeyId)
    .order("created_at");

  return (data as unknown as OnboardingProgress[]) || [];
}

export async function initProgress(profileId: string, journeyId: string, stepIds: string[]): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const { data: existing } = await supabase
    .from("user_onboarding_progress")
    .select("step_id")
    .eq("profile_id", profileId)
    .eq("journey_id", journeyId);

  const existingIds = new Set((existing || []).map((e: Record<string, unknown>) => e.step_id));
  const now = new Date().toISOString();

  const inserts = stepIds
    .filter((id) => !existingIds.has(id))
    .map((stepId) => ({
      profile_id: profileId,
      journey_id: journeyId,
      step_id: stepId,
      completed: false,
      skipped: false,
      created_at: now,
    }));

  if (inserts.length > 0) {
    await supabase.from("user_onboarding_progress").insert(inserts);
  }
}

export async function completeStep(
  profileId: string,
  stepId: string,
  timeSpent = 0,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("user_onboarding_progress")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      time_spent: timeSpent,
    })
    .eq("profile_id", profileId)
    .eq("step_id", stepId);
}

export async function skipStep(profileId: string, stepId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("user_onboarding_progress")
    .update({ skipped: true, completed: true, completed_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("step_id", stepId);
}

export async function getOnboardingState(profileId: string, role: UserRole): Promise<OnboardingState> {
  const empty: OnboardingState = {
    journey: null, steps: [], progress: [], completionPct: 100,
    completedCount: 0, totalSteps: 0, estimatedMinutes: 0, isComplete: true,
  };

  const journey = await getJourney(role);
  if (!journey) return empty;

  const steps = await getSteps(journey.id);
  if (steps.length === 0) return { ...empty, journey, isComplete: true };

  // Init progress
  await initProgress(profileId, journey.id, steps.map((s) => s.id));

  const progress = await getProgress(profileId, journey.id);
  const completedCount = progress.filter((p) => p.completed).length;
  const totalSteps = steps.length;
  const totalMinutes = steps.reduce((sum, s) => sum + (s.estimated_minutes || 2), 0);

  return {
    journey,
    steps,
    progress,
    completionPct: Math.round((completedCount / totalSteps) * 100),
    completedCount,
    totalSteps,
    estimatedMinutes: totalMinutes - (completedCount * 2),
    isComplete: completedCount >= totalSteps,
  };
}

// ─── Tutorials ────────────────────────────────────────────

export async function getTutorials(profileId: string): Promise<Record<string, boolean>> {
  if (!isSupabaseAvailable() || !supabase) return {};

  const { data } = await supabase
    .from("user_tutorials")
    .select("tutorial_key, completed")
    .eq("profile_id", profileId);

  const map: Record<string, boolean> = {};
  for (const row of (data || [])) {
    map[row.tutorial_key] = row.completed;
  }
  return map;
}

export async function completeTutorial(profileId: string, tutorialKey: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase.from("user_tutorials").upsert({
    profile_id: profileId,
    tutorial_key: tutorialKey,
    completed: true,
    completed_at: new Date().toISOString(),
  }, { onConflict: "profile_id, tutorial_key" });
}

// ─── Tooltips ─────────────────────────────────────────────

export async function getTooltipsSeen(profileId: string): Promise<Set<string>> {
  if (!isSupabaseAvailable() || !supabase) return new Set();

  const { data } = await supabase
    .from("tooltips_seen")
    .select("tooltip_key")
    .eq("profile_id", profileId);

  return new Set((data || []).map((t: Record<string, unknown>) => t.tooltip_key as string));
}

export async function markTooltipSeen(profileId: string, tooltipKey: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase.from("tooltips_seen").upsert({
    profile_id: profileId,
    tooltip_key: tooltipKey,
    seen: true,
  }, { onConflict: "profile_id, tooltip_key" });
}

// ─── Rewards ──────────────────────────────────────────────

export async function grantOnboardingReward(
  profileId: string,
  points: number,
  reason: string,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  // Use the atomic award_ecopoints RPC for wallet tracking, idempotency,
  // and balance reconciliation. Never insert directly into ecopoint_transactions.
  await supabase.rpc("award_ecopoints", {
    p_profile_id: profileId,
    p_points: points,
    p_transaction_type: "earn",
    p_source_type: "onboarding",
    p_idempotency_key: `onboarding_${profileId}_${reason}`,
    p_description: reason,
    p_status: "confirmed",
  });
}

// ─── Profile Completion ───────────────────────────────────

export function calculateProfileCompletion(profile: Record<string, unknown>): number {
  const fields = [
    { key: "full_name", weight: 10 },
    { key: "phone", weight: 10 },
    { key: "email", weight: 10 },
    { key: "username", weight: 10 },
    { key: "default_city", weight: 10 },
    { key: "avatar_url", weight: 5 },
    { key: "bio", weight: 5 },
    { key: "kyc_status", weight: 15, check: (v: unknown) => v === "approved" },
    { key: "email_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "phone_verified", weight: 10, check: (v: unknown) => v === true },
    { key: "last_login", weight: 5, check: (v: unknown) => !!v },
  ];

  let score = 0;
  for (const field of fields) {
    const val = profile[field.key];
    if (field.check ? field.check(val) : !!val) {
      score += field.weight;
    }
  }

  return Math.min(100, score);
}
