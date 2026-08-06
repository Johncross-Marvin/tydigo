/**
 * Tydigo Unlock Service
 *
 * Gates access to restricted features until required onboarding steps are complete.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { UserRole } from "@/lib/api";

export type FeatureGate = {
  feature: string;
  label: string;
  requiredStepNumbers: number[];
  isUnlocked: boolean;
};

const ROLE_FEATURE_GATES: Record<string, FeatureGate[]> = {
  household: [
    { feature: "request_pickup", label: "Request Pickup", requiredStepNumbers: [5], isUnlocked: false },
    { feature: "ecopoints_redeem", label: "Redeem EcoPoints", requiredStepNumbers: [4], isUnlocked: false },
  ],
  collector: [
    { feature: "accept_jobs", label: "Accept Pickup Jobs", requiredStepNumbers: [3, 4, 5], isUnlocked: false },
    { feature: "view_earnings", label: "View Earnings", requiredStepNumbers: [6], isUnlocked: false },
  ],
  recycler: [
    { feature: "receive_materials", label: "Receive Materials", requiredStepNumbers: [2, 3, 4], isUnlocked: false },
    { feature: "create_bids", label: "Create Material Bids", requiredStepNumbers: [5], isUnlocked: false },
  ],
  business: [
    { feature: "bulk_pickup", label: "Bulk Pickup Scheduling", requiredStepNumbers: [2, 3], isUnlocked: false },
    { feature: "impact_reports", label: "Impact Reports", requiredStepNumbers: [5], isUnlocked: false },
  ],
  estate: [
    { feature: "bulk_pickup", label: "Estate Collection", requiredStepNumbers: [2, 3], isUnlocked: false },
  ],
  fleet: [
    { feature: "manage_fleet", label: "Fleet Management", requiredStepNumbers: [2], isUnlocked: false },
  ],
  corporate: [
    { feature: "esg_reports", label: "ESG Reports", requiredStepNumbers: [2, 3], isUnlocked: false },
  ],
  government: [
    { feature: "compliance_reports", label: "Compliance Reports", requiredStepNumbers: [2], isUnlocked: false },
  ],
  organic_partner: [
    { feature: "receive_organic", label: "Receive Organic Waste", requiredStepNumbers: [2, 3, 4], isUnlocked: false },
  ],
};

export async function getFeatureGates(profileId: string, role: UserRole): Promise<FeatureGate[]> {
  const gates = ROLE_FEATURE_GATES[role] || [];
  if (gates.length === 0) return gates;

  if (!isSupabaseAvailable() || !supabase) {
    return gates.map((g) => ({ ...g, isUnlocked: true }));
  }

  // Get completed step numbers
  const { data: journey } = await supabase
    .from("onboarding_journeys")
    .select("id")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();

  if (!journey) return gates.map((g) => ({ ...g, isUnlocked: true }));

  const { data: progress } = await supabase
    .from("user_onboarding_progress")
    .select("completed, onboarding_steps!inner(step_number)")
    .eq("profile_id", profileId)
    .eq("journey_id", journey.id)
    .eq("completed", true);

  const completedStepNumbers = new Set(
    (progress || []).map((p: Record<string, unknown>) => {
      const step = p.onboarding_steps as Record<string, unknown> | null;
      return step?.step_number as number;
    })
  );

  return gates.map((gate) => ({
    ...gate,
    isUnlocked: gate.requiredStepNumbers.every((n) => completedStepNumbers.has(n)),
  }));
}

export async function isFeatureUnlocked(
  profileId: string,
  role: UserRole,
  feature: string,
): Promise<boolean> {
  const gates = await getFeatureGates(profileId, role);
  const gate = gates.find((g) => g.feature === feature);
  return gate?.isUnlocked ?? true;
}

export function getRequiredStepsForFeature(role: UserRole, feature: string): number[] {
  const gates = ROLE_FEATURE_GATES[role] || [];
  const gate = gates.find((g) => g.feature === feature);
  return gate?.requiredStepNumbers || [];
}
