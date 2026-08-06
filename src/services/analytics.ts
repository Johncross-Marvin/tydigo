/**
 * Tydigo Onboarding Analytics Service
 *
 * Tracks onboarding events: step starts, completions, skips, journey completion.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type AnalyticsEvent =
  | "step_started"
  | "step_completed"
  | "step_skipped"
  | "journey_completed"
  | "journey_abandoned";

export async function trackOnboardingEvent(
  profileId: string,
  journeyId: string,
  eventType: AnalyticsEvent,
  stepId?: string,
  timeSpentSeconds = 0,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("onboarding_analytics").insert({
      profile_id: profileId,
      journey_id: journeyId,
      step_id: stepId || null,
      event_type: eventType,
      time_spent_seconds: timeSpentSeconds,
      metadata: metadata || null,
    });
  } catch {
    // Non-fatal
  }
}

export async function getOnboardingStats(): Promise<{
  totalStarted: number;
  totalCompleted: number;
  completionRate: number;
  avgTimeMinutes: number;
  dropOffStep: string | null;
}> {
  if (!isSupabaseAvailable() || !supabase) {
    return { totalStarted: 0, totalCompleted: 0, completionRate: 0, avgTimeMinutes: 0, dropOffStep: null };
  }

  const { count: started } = await supabase
    .from("onboarding_analytics")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "step_started");

  const { count: completed } = await supabase
    .from("onboarding_analytics")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "journey_completed");

  return {
    totalStarted: started || 0,
    totalCompleted: completed || 0,
    completionRate: started ? Math.round(((completed || 0) / started) * 100) : 0,
    avgTimeMinutes: 0,
    dropOffStep: null,
  };
}
