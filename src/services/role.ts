/**
 * Tydigo Role Service
 *
 * Role management, permissions, and role-specific dashboard routing.
 */

import type { UserRole } from "@/lib/api";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  household: "Household",
  estate: "Estate",
  business: "Business",
  collector: "Collector",
  recycler: "Recycler",
  organic_partner: "Organic Partner",
  fleet_owner: "Fleet Operator",
  corporate_partner: "Corporate Partner",
  government: "Government Agency",
  partner: "Partner",
  admin: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  customer: "Schedule waste pickups and earn EcoPoints",
  household: "Schedule waste pickups at home",
  estate: "Manage waste for your estate or community",
  business: "Bulk waste management and sustainability reports",
  collector: "Accept pickup jobs and earn money",
  recycler: "Source recyclable materials",
  organic_partner: "BSF farms, compost, and livestock feed",
  fleet_owner: "Manage collection vehicles and drivers",
  corporate_partner: "Sustainability partnerships and ESG reporting",
  government: "Agency oversight and regulatory compliance",
  partner: "Recycling and waste processing partner",
  admin: "Platform administration and management",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  customer: "/household/dashboard",
  household: "/household/dashboard",
  estate: "/estate/dashboard",
  business: "/business/dashboard",
  collector: "/collector/dashboard",
  recycler: "/recycler/dashboard",
  organic_partner: "/organic/dashboard",
  fleet_owner: "/fleet/dashboard",
  corporate_partner: "/corporate/dashboard",
  government: "/government/dashboard",
  partner: "/partner/dashboard",
  admin: "/admin/dashboard",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] || role;
}

export function getRoleDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role] || "/household/dashboard";
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function isCollectorRole(role: UserRole): boolean {
  return role === "collector";
}

export function isBusinessRole(role: UserRole): boolean {
  return role === "business" || role === "estate" || role === "corporate_partner";
}

export function isPartnerRole(role: UserRole): boolean {
  return role === "partner" || role === "recycler" || role === "organic_partner";
}
