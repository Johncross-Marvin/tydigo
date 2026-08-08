/**
 * Tydigo Post-Auth Router
 *
 * Centralized post-authentication destination resolver.
 * Determines where a user should be routed after login, signup verification,
 * or session restoration based on their account state.
 */

import type { AuthUser, UserRole } from "@/lib/api";
import { getRoleDashboardPath } from "@/services/role";

export type PostAuthDestination =
  | { kind: "login" }
  | { kind: "check_email"; email: string }
  | { kind: "onboarding"; role: UserRole }
  | { kind: "dashboard"; path: string }
  | { kind: "account_status"; reason: string };

export type PostAuthContext = {
  user: AuthUser | null;
  emailConfirmed: boolean;
  onboardingComplete: boolean;
  accountStatus: "active" | "pending" | "suspended" | "deactivated";
};

/**
 * Determine the correct post-auth destination for a user.
 *
 * Priority:
 * 1. No user → login
 * 2. Email not confirmed → check email
 * 3. Account suspended/deactivated → account status page
 * 4. Onboarding incomplete → onboarding
 * 5. Ready → role dashboard
 */
export function getPostAuthDestination(ctx: PostAuthContext): PostAuthDestination {
  if (!ctx.user) {
    return { kind: "login" };
  }

  if (!ctx.emailConfirmed) {
    return { kind: "check_email", email: "" };
  }

  if (ctx.accountStatus === "suspended" || ctx.accountStatus === "deactivated") {
    return {
      kind: "account_status",
      reason: ctx.accountStatus === "suspended"
        ? "Your account has been suspended. Please contact support."
        : "Your account has been deactivated.",
    };
  }

  if (!ctx.onboardingComplete) {
    return { kind: "onboarding", role: ctx.user.role };
  }

  return {
    kind: "dashboard",
    path: getRoleDashboardPath(ctx.user.role),
  };
}

/**
 * Convenience function to get the post-auth path as a string.
 * Returns the path to navigate to.
 */
export function getPostAuthPath(ctx: PostAuthContext): string {
  const dest = getPostAuthDestination(ctx);
  switch (dest.kind) {
    case "login":
      return "/login";
    case "check_email":
      return "/check-email";
    case "onboarding":
      return "/onboarding";
    case "dashboard":
      return dest.path;
    case "account_status":
      return "/status";
  }
}
