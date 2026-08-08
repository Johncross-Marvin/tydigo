/**
 * Tydigo Role-Aware Profile Completion Service
 *
 * Different roles have different profile completion requirements.
 * A household user should not need KYC, vehicle, or warehouse to be "complete".
 */

import type { UserRole } from "@/lib/api";

type CompletionField = {
  key: string;
  weight: number;
  check?: (value: unknown) => boolean;
};

const BASE_FIELDS: CompletionField[] = [
  { key: "full_name", weight: 15 },
  { key: "email", weight: 15 },
  { key: "phone", weight: 10 },
  { key: "username", weight: 10 },
  { key: "default_city", weight: 10 },
  { key: "avatar_url", weight: 5 },
  { key: "bio", weight: 5 },
  { key: "email_verified", weight: 15, check: (v: unknown) => v === true },
  { key: "last_login", weight: 5, check: (v: unknown) => !!v },
];

const ROLE_EXTRA_FIELDS: Partial<Record<UserRole, CompletionField[]>> = {
  collector: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
  recycler: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
  organic_partner: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
  fleet_owner: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
  corporate_partner: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
  government: [
    { key: "kyc_status", weight: 10, check: (v: unknown) => v === "approved" },
  ],
};

/**
 * Calculate profile completion percentage for a given role.
 * Household users are NOT penalized for missing KYC, vehicle, etc.
 */
export function calculateRoleAwareCompletion(
  profile: Record<string, unknown>,
  role: UserRole,
): number {
  const fields = [...BASE_FIELDS, ...(ROLE_EXTRA_FIELDS[role] || [])];

  let score = 0;
  let totalWeight = 0;

  for (const field of fields) {
    totalWeight += field.weight;
    const val = profile[field.key];
    if (field.check ? field.check(val) : !!val) {
      score += field.weight;
    }
  }

  if (totalWeight === 0) return 100;
  return Math.min(100, Math.round((score / totalWeight) * 100));
}

/**
 * Check if a profile is "complete enough" for the given role.
 * This is informational only — operational eligibility is separate.
 */
export function isProfileComplete(profile: Record<string, unknown>, role: UserRole): boolean {
  return calculateRoleAwareCompletion(profile, role) >= 80;
}
