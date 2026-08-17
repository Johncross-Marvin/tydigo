/**
 * Tydigo Registration Service
 *
 * Manages registration applications and the admin review workflow.
 * Uses the atomic review_registration_application RPC for approval decisions.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type RegistrationApplication = {
  id: string;
  profile_id: string;
  account_type: string;
  status: "draft" | "pending_review" | "changes_requested" | "approved" | "rejected" | "withdrawn";
  details: Record<string, unknown>;
  terms_version: string | null;
  consented_at: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewDecision = "approved" | "rejected" | "changes_requested";

// ─── Get my application ──────────────────────────────────────
export async function getMyApplication(): Promise<RegistrationApplication | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("registration_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as RegistrationApplication;
}

// ─── Admin: list pending applications ────────────────────────
export async function listPendingApplications(): Promise<RegistrationApplication[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data, error } = await supabase
    .from("registration_applications")
    .select("*")
    .in("status", ["pending_review", "changes_requested"])
    .order("submitted_at", { ascending: true });

  if (error || !data) return [];
  return data as RegistrationApplication[];
}

// ─── Admin: review an application (atomic RPC) ───────────────
export async function reviewApplication(
  applicationId: string,
  decision: ReviewDecision,
  notes?: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (!isSupabaseAvailable() || !supabase) {
    throw new Error("Review is not available in offline mode.");
  }

  const { data, error } = await supabase.rpc("review_registration_application", {
    p_application_id: applicationId,
    p_decision: decision,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);

  const result = data as { success: boolean; status?: string; error?: string };
  if (!result?.success) {
    throw new Error(result?.error || "Review failed.");
  }

  return result;
}
