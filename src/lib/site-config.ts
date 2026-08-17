/**
 * Tydigo Site Configuration
 *
 * Single source of truth for public navigation, footer, role pathways,
 * social/legal links, support categories, and media slots. Components
 * (header, mega-menu, footer, role chooser, homepage) derive from here
 * to avoid duplicated role labels and URLs.
 */

import type { UserRole } from "@/lib/api";

// ─── Account type groups ──────────────────────────────────────

export type AccountGroup = "get_services" | "earn_operate" | "process_materials" | "partner_govern";

export type RoleExperience = {
  accountType: UserRole;
  label: string;
  shortLabel: string;
  group: AccountGroup;
  summary: string;
  icon: string;
  accent: string;
  iconBg: string;
  publicRoute: string;
  signupRoute: string;
  dashboardRoute: string;
  requiresVerification: boolean;
};

export const ROLE_EXPERIENCES: RoleExperience[] = [
  {
    accountType: "household",
    label: "Household",
    shortLabel: "Household",
    group: "get_services",
    summary: "Schedule waste pickups at home and earn EcoPoints.",
    icon: "Home",
    accent: "text-[#145C25]",
    iconBg: "bg-green-100 text-[#145C25]",
    publicRoute: "/services/households",
    signupRoute: "/signup/household",
    dashboardRoute: "/household/dashboard",
    requiresVerification: false,
  },
  {
    accountType: "estate",
    label: "Estate",
    shortLabel: "Estate",
    group: "get_services",
    summary: "Manage waste collection for your residential estate.",
    icon: "Building2",
    accent: "text-teal-600",
    iconBg: "bg-teal-100 text-teal-600",
    publicRoute: "/services/estates",
    signupRoute: "/signup/estate",
    dashboardRoute: "/estate/dashboard",
    requiresVerification: false,
  },
  {
    accountType: "business",
    label: "Business",
    shortLabel: "Business",
    group: "get_services",
    summary: "Bulk waste management and sustainability reports.",
    icon: "BarChart3",
    accent: "text-purple-600",
    iconBg: "bg-purple-100 text-purple-600",
    publicRoute: "/services/businesses",
    signupRoute: "/signup/business",
    dashboardRoute: "/business/dashboard",
    requiresVerification: false,
  },
  {
    accountType: "collector",
    label: "Collector",
    shortLabel: "Collector",
    group: "earn_operate",
    summary: "Accept pickup jobs and grow your earnings.",
    icon: "Truck",
    accent: "text-blue-600",
    iconBg: "bg-blue-100 text-blue-600",
    publicRoute: "/earn/collector",
    signupRoute: "/signup/collector",
    dashboardRoute: "/collector/dashboard",
    requiresVerification: true,
  },
  {
    accountType: "fleet_owner",
    label: "Fleet Operator",
    shortLabel: "Fleet",
    group: "earn_operate",
    summary: "Manage vehicles, drivers, and dispatch operations.",
    icon: "Truck",
    accent: "text-indigo-600",
    iconBg: "bg-indigo-100 text-indigo-600",
    publicRoute: "/earn/fleet-operator",
    signupRoute: "/signup/fleet_owner",
    dashboardRoute: "/fleet/dashboard",
    requiresVerification: true,
  },
  {
    accountType: "recycler",
    label: "Recycler",
    shortLabel: "Recycler",
    group: "process_materials",
    summary: "Source recyclable materials and manage intake.",
    icon: "Recycle",
    accent: "text-amber-600",
    iconBg: "bg-amber-100 text-amber-600",
    publicRoute: "/earn/recycler",
    signupRoute: "/signup/recycler",
    dashboardRoute: "/recycler/dashboard",
    requiresVerification: true,
  },
  {
    accountType: "organic_partner",
    label: "Organic Partner",
    shortLabel: "Organic",
    group: "process_materials",
    summary: "BSF farms, compost, and livestock feed producers.",
    icon: "Leaf",
    accent: "text-lime-600",
    iconBg: "bg-lime-100 text-lime-600",
    publicRoute: "/earn/organic-partner",
    signupRoute: "/signup/organic_partner",
    dashboardRoute: "/organic/dashboard",
    requiresVerification: true,
  },
  {
    accountType: "corporate_partner",
    label: "Corporate Partner",
    shortLabel: "Corporate",
    group: "partner_govern",
    summary: "Sustainability partnerships and ESG reporting.",
    icon: "Globe",
    accent: "text-rose-600",
    iconBg: "bg-rose-100 text-rose-600",
    publicRoute: "/services/businesses",
    signupRoute: "/signup/corporate_partner",
    dashboardRoute: "/corporate/dashboard",
    requiresVerification: true,
  },
  {
    accountType: "government",
    label: "Government",
    shortLabel: "Government",
    group: "partner_govern",
    summary: "Agency oversight and regulatory compliance.",
    icon: "Shield",
    accent: "text-slate-600",
    iconBg: "bg-slate-100 text-slate-600",
    publicRoute: "/services/businesses",
    signupRoute: "/signup/government",
    dashboardRoute: "/government/dashboard",
    requiresVerification: true,
  },
];

export const ACCOUNT_GROUPS: { key: AccountGroup; label: string; description: string }[] = [
  { key: "get_services", label: "Get services", description: "Book waste collection for your home, estate, or business." },
  { key: "earn_operate", label: "Earn & operate", description: "Collect waste or run a fleet and get paid." },
  { key: "process_materials", label: "Process materials", description: "Recover recyclables and organic waste." },
  { key: "partner_govern", label: "Partner & govern", description: "Corporate partnerships and public oversight." },
];

export function getRolesByGroup(group: AccountGroup): RoleExperience[] {
  return ROLE_EXPERIENCES.filter((r) => r.group === group);
}

export function getRoleExperience(role: UserRole): RoleExperience | undefined {
  return ROLE_EXPERIENCES.find((r) => r.accountType === role);
}

// ─── Mega-menu categories ─────────────────────────────────────

export type MenuLink = { label: string; href: string; description?: string };

export type MenuCategory = {
  key: string;
  label: string;
  links: MenuLink[];
};

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    key: "services",
    label: "Products & Services",
    links: [
      { label: "Household pickup", href: "/services/households", description: "On-demand collection at home" },
      { label: "Estate operations", href: "/services/estates", description: "Community-wide waste management" },
      { label: "Business waste", href: "/services/businesses", description: "Bulk and recurring service" },
      { label: "Recycling & recovery", href: "/services/recycling", description: "Material recovery network" },
      { label: "Organic recovery", href: "/services/organic-recovery", description: "Compost and BSF feedstock" },
      { label: "Smart tracking", href: "/services/households", description: "Proof of service and live status" },
    ],
  },
  {
    key: "earn",
    label: "Earn with TYDIGO",
    links: [
      { label: "Become a Collector", href: "/earn/collector", description: "Accept jobs and earn" },
      { label: "Partner as a Recycler", href: "/earn/recycler", description: "Source materials" },
      { label: "Organic Recovery Partner", href: "/earn/organic-partner", description: "Process organic waste" },
      { label: "Operate a Fleet", href: "/earn/fleet-operator", description: "Manage vehicles and drivers" },
    ],
  },
  {
    key: "company",
    label: "Company",
    links: [
      { label: "About TYDIGO", href: "/company/about", description: "Our mission and story" },
      { label: "Impact", href: "/company/impact", description: "Environmental outcomes" },
      { label: "Careers", href: "/company/careers", description: "Join the team" },
      { label: "Partnerships", href: "/company/about", description: "Work with us" },
    ],
  },
  {
    key: "safety",
    label: "Safety",
    links: [
      { label: "Safety Centre", href: "/safety", description: "Standards and guidance" },
      { label: "Collector Safety", href: "/safety/collectors", description: "On-the-job safety" },
      { label: "Waste Handling", href: "/safety/waste-handling", description: "Safe sorting and disposal" },
      { label: "Report an Incident", href: "/safety/report-incident", description: "Tell us what happened" },
    ],
  },
  {
    key: "support",
    label: "Support",
    links: [
      { label: "Help Centre", href: "/support", description: "Find answers" },
      { label: "Account & verification", href: "/support", description: "KYC and account help" },
      { label: "Payments & rewards", href: "/support", description: "Wallet and EcoPoints" },
      { label: "Contact support", href: "/support", description: "Reach our team" },
    ],
  },
  {
    key: "cities",
    label: "Cities",
    links: [
      { label: "Coverage directory", href: "/cities", description: "Where we operate" },
      { label: "Request your city", href: "/cities", description: "Bring TYDIGO to you" },
    ],
  },
];

// ─── Footer groups ────────────────────────────────────────────

export type FooterGroup = { title: string; links: MenuLink[] };

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: "Products & Services",
    links: [
      { label: "Household pickup", href: "/services/households" },
      { label: "Estate operations", href: "/services/estates" },
      { label: "Business waste", href: "/services/businesses" },
      { label: "Recycling & recovery", href: "/services/recycling" },
      { label: "Organic recovery", href: "/services/organic-recovery" },
    ],
  },
  {
    title: "Earn with TYDIGO",
    links: [
      { label: "Become a Collector", href: "/earn/collector" },
      { label: "Partner as a Recycler", href: "/earn/recycler" },
      { label: "Organic Recovery Partner", href: "/earn/organic-partner" },
      { label: "Operate a Fleet", href: "/earn/fleet-operator" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About TYDIGO", href: "/company/about" },
      { label: "Impact", href: "/company/impact" },
      { label: "Careers", href: "/company/careers" },
      { label: "Partnerships", href: "/company/about" },
    ],
  },
  {
    title: "Safety & Support",
    links: [
      { label: "Safety Centre", href: "/safety" },
      { label: "Help Centre", href: "/support" },
      { label: "Report an Incident", href: "/safety/report-incident" },
      { label: "Cities", href: "/cities" },
    ],
  },
];

// ─── Social & legal links ─────────────────────────────────────

export const SOCIAL_LINKS: { label: string; href: string; icon: string }[] = [
  // Verified social profiles only. Placeholder hrefs are intentionally omitted
  // until real profiles are configured — see feature flags below.
];

export const LEGAL_LINKS: MenuLink[] = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Security", href: "/legal/security" },
];

// ─── Feature flags ────────────────────────────────────────────

export const FEATURE_FLAGS = {
  /** Native app store links — hidden until real URLs are configured. */
  appStoreLinks: false,
  /** Social profiles — hidden until verified URLs are configured. */
  socialLinks: false,
  /** Non-English locales — hidden until reviewed catalogues exist. */
  nonEnglishLocales: false,
};

// ─── Language metadata ────────────────────────────────────────

export type Language = {
  code: string;
  nativeName: string;
  englishName: string;
  status: "active" | "beta" | "coming_soon";
};

export const LANGUAGES: Language[] = [
  { code: "en", nativeName: "English", englishName: "English", status: "active" },
  { code: "ha", nativeName: "Hausa", englishName: "Hausa", status: "coming_soon" },
  { code: "yo", nativeName: "Yorùbá", englishName: "Yoruba", status: "coming_soon" },
  { code: "ig", nativeName: "Igbo", englishName: "Igbo", status: "coming_soon" },
];

// ─── Media slots ──────────────────────────────────────────────

export type MediaSlot = {
  key: string;
  desktop?: string;
  mobile?: string;
  aspectRatio: string;
  objectPosition?: string;
  alt: string;
  credit?: string;
};

/**
 * Replaceable media registry. The owner will supply final imagery.
 * Slots use neutral brand fallbacks when files are absent.
 */
export const MEDIA_SLOTS: Record<string, MediaSlot> = {
  "home.hero": {
    key: "home.hero",
    aspectRatio: "16 / 9",
    alt: "Waste collection in a Nigerian city",
  },
  "home.scrollStage": {
    key: "home.scrollStage",
    aspectRatio: "21 / 9",
    alt: "Tydigo collectors and recycling operations",
  },
  "home.services": {
    key: "home.services",
    aspectRatio: "4 / 3",
    alt: "Tydigo services overview",
  },
  "appInstall.device": {
    key: "appInstall.device",
    aspectRatio: "4 / 5",
    alt: "Tydigo app on a mobile device",
  },
};

// ─── Support categories ───────────────────────────────────────

export const SUPPORT_AUDIENCES: { label: string; href: string; icon: string }[] = [
  { label: "Household", href: "/support/household", icon: "Home" },
  { label: "Estate", href: "/support/estate", icon: "Building2" },
  { label: "Business", href: "/support/business", icon: "BarChart3" },
  { label: "Collector", href: "/support/collector", icon: "Truck" },
  { label: "Recycler", href: "/support/recycler", icon: "Recycle" },
  { label: "Organic Partner", href: "/support/organic-partner", icon: "Leaf" },
  { label: "Fleet Operator", href: "/support/fleet-operator", icon: "Truck" },
  { label: "Corporate Partner", href: "/support/corporate-partner", icon: "Globe" },
  { label: "Government", href: "/support/government", icon: "Shield" },
];

// ─── Coverage (verified service areas only) ───────────────────

export type CoverageStatus = "active" | "pilot" | "coming_soon";

export type CoverageArea = {
  city: string;
  state: string;
  status: CoverageStatus;
  services: string[];
};

/**
 * Verified coverage. Do NOT imply nationwide coverage — only list cities
 * where service is actually available. This is intentionally conservative.
 */
export const COVERAGE_AREAS: CoverageArea[] = [
  { city: "Abuja", state: "FCT", status: "active", services: ["Household", "Business", "Collector"] },
  { city: "Lagos", state: "Lagos", status: "pilot", services: ["Household", "Collector"] },
];
