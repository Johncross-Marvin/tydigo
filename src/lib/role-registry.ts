/**
 * Tydigo Canonical Role Registry
 *
 * Single source of truth for all role definitions, dashboard paths,
 * approval policies, and capabilities. Every other module should
 * derive its role configuration from this registry.
 */

import type { UserRole } from "@/lib/api";

export type RoleDefinition = {
  label: string;
  description: string;
  dashboardPath: string;
  publicSignup: boolean;
  approvalPolicy: "auto" | "pending_verification" | "invitation_only";
  profileKind: string;
  icon: string;
};

export const ROLE_REGISTRY: Record<UserRole, RoleDefinition> = {
  customer: {
    label: "Customer",
    description: "Schedule waste pickups and earn EcoPoints",
    dashboardPath: "/household/dashboard",
    publicSignup: false,
    approvalPolicy: "auto",
    profileKind: "household",
    icon: "Home",
  },
  household: {
    label: "Household",
    description: "Schedule waste pickups at home",
    dashboardPath: "/household/dashboard",
    publicSignup: true,
    approvalPolicy: "auto",
    profileKind: "household",
    icon: "Home",
  },
  estate: {
    label: "Estate",
    description: "Manage waste for your estate or community",
    dashboardPath: "/estate/dashboard",
    publicSignup: true,
    approvalPolicy: "auto",
    profileKind: "estate",
    icon: "Building2",
  },
  business: {
    label: "Business",
    description: "Bulk waste management and sustainability reports",
    dashboardPath: "/business/dashboard",
    publicSignup: true,
    approvalPolicy: "auto",
    profileKind: "business",
    icon: "BarChart3",
  },
  collector: {
    label: "Collector",
    description: "Accept pickup jobs and earn money",
    dashboardPath: "/collector/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "collector",
    icon: "Truck",
  },
  recycler: {
    label: "Recycler",
    description: "Source recyclable materials",
    dashboardPath: "/recycler/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "recycler",
    icon: "Recycle",
  },
  organic_partner: {
    label: "Organic Partner",
    description: "BSF farms, compost, and livestock feed",
    dashboardPath: "/organic/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "organic_partner",
    icon: "Leaf",
  },
  fleet_owner: {
    label: "Fleet Operator",
    description: "Manage collection vehicles and drivers",
    dashboardPath: "/fleet/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "fleet_owner",
    icon: "Truck",
  },
  corporate_partner: {
    label: "Corporate Partner",
    description: "Sustainability partnerships and ESG reporting",
    dashboardPath: "/corporate/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "corporate_partner",
    icon: "Globe",
  },
  government: {
    label: "Government Agency",
    description: "Agency oversight and regulatory compliance",
    dashboardPath: "/government/dashboard",
    publicSignup: true,
    approvalPolicy: "pending_verification",
    profileKind: "government",
    icon: "Shield",
  },
  partner: {
    label: "Partner",
    description: "Recycling and waste processing partner",
    dashboardPath: "/partner/dashboard",
    publicSignup: false,
    approvalPolicy: "pending_verification",
    profileKind: "partner",
    icon: "Handshake",
  },
  admin: {
    label: "Administrator",
    description: "Platform administration and management",
    dashboardPath: "/admin/dashboard",
    publicSignup: false,
    approvalPolicy: "invitation_only",
    profileKind: "admin",
    icon: "Shield",
  },
};

/** Get the dashboard path for a given role */
export function getRoleDashboardPath(role: UserRole): string {
  return ROLE_REGISTRY[role]?.dashboardPath || "/household/dashboard";
}

/** Get the human-readable label for a role */
export function getRoleLabel(role: UserRole): string {
  return ROLE_REGISTRY[role]?.label || role;
}

/** Check if a role is available for public signup */
export function isPublicSignupRole(role: UserRole): boolean {
  return ROLE_REGISTRY[role]?.publicSignup ?? false;
}

/** Check if a role requires verification before full access */
export function requiresVerification(role: UserRole): boolean {
  return ROLE_REGISTRY[role]?.approvalPolicy === "pending_verification";
}

/** Check if a role is admin-only (invitation only) */
export function isAdminOnly(role: UserRole): boolean {
  return ROLE_REGISTRY[role]?.approvalPolicy === "invitation_only";
}

/** Get all roles available for public signup */
export function getPublicSignupRoles(): UserRole[] {
  return (Object.keys(ROLE_REGISTRY) as UserRole[]).filter(isPublicSignupRole);
}

/** Map legacy role aliases to canonical roles */
export function mapToCanonicalRole(role: string): UserRole {
  const mapping: Record<string, UserRole> = {
    fleet: "fleet_owner",
    corporate: "corporate_partner",
    customer: "household",
  };
  const canonical = mapping[role];
  if (canonical) return canonical;
  if (ROLE_REGISTRY[role as UserRole]) return role as UserRole;
  return "household";
}
