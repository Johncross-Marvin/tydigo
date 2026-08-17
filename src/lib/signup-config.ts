/**
 * Tydigo Account-Type Signup Registry
 *
 * Single source of truth for each account type's dedicated registration flow.
 * Mirrors Bolt's "one product = one registration flow" model: every account
 * type has its own landing copy, hero, and role-specific fields.
 */

import type { UserRole } from "@/lib/api";

export type SignupField = {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "tel" | "select" | "textarea";
  required: boolean;
  options?: string[];
  hint?: string;
};

export type AccountTypeConfig = {
  role: UserRole;
  /** Short product name (e.g. "Household", "Collector") */
  title: string;
  /** One-line value proposition */
  tagline: string;
  /** Longer description shown on the landing card */
  description: string;
  /** Hero headline on the dedicated signup page */
  heroTitle: string;
  /** Hero subtitle */
  heroSubtitle: string;
  /** Icon name (lucide) */
  icon: string;
  /** Tailwind color classes for the accent */
  accent: string;
  /** Tailwind background classes for the icon chip */
  iconBg: string;
  /** Role-specific fields beyond the common identity fields */
  fields: SignupField[];
  /** Whether this account type requires verification before full access */
  requiresVerification: boolean;
  /** Steps shown in the "how it works" section */
  steps: string[];
};

export const ACCOUNT_TYPES: AccountTypeConfig[] = [
  {
    role: "household",
    title: "Household",
    tagline: "Schedule waste pickups at home",
    description: "Book on-demand waste collection, track your collector in real time, and earn EcoPoints for every pickup.",
    heroTitle: "Cleaner homes, smarter pickups",
    heroSubtitle: "Schedule waste collection from your doorstep and earn rewards for recycling.",
    icon: "Home",
    accent: "text-[#145C25]",
    iconBg: "bg-green-100 text-[#145C25]",
    fields: [],
    requiresVerification: false,
    steps: ["Create your account", "Schedule a pickup", "Track your collector", "Earn EcoPoints"],
  },
  {
    role: "estate",
    title: "Estate",
    tagline: "Manage waste for your estate",
    description: "Coordinate waste collection for your entire estate or residential community with bulk scheduling and reporting.",
    heroTitle: "Waste management for your community",
    heroSubtitle: "Manage collection for your entire estate with bulk scheduling and community reporting.",
    icon: "Building2",
    accent: "text-teal-600",
    iconBg: "bg-teal-100 text-teal-600",
    fields: [
      { key: "estate_name", label: "Estate / Community Name", placeholder: "e.g. Lekki Gardens", type: "text", required: true },
      { key: "units", label: "Number of Units", placeholder: "e.g. 120", type: "text", required: false },
    ],
    requiresVerification: false,
    steps: ["Register your estate", "Add your community", "Schedule bulk pickups", "Track & report"],
  },
  {
    role: "business",
    title: "Business",
    tagline: "Bulk waste management & reports",
    description: "Bulk waste management, sustainability impact reports, and dedicated support for your organisation.",
    heroTitle: "Waste management for your business",
    heroSubtitle: "Bulk pickups, sustainability reports, and dedicated support for your organisation.",
    icon: "BarChart3",
    accent: "text-purple-600",
    iconBg: "bg-purple-100 text-purple-600",
    fields: [
      { key: "business_name", label: "Business Name", placeholder: "e.g. Acme Ltd", type: "text", required: true },
      { key: "business_type", label: "Business Type", placeholder: "Select type", type: "select", required: false, options: ["Office", "Restaurant", "Retail", "Manufacturing", "Hospitality", "Other"] },
      { key: "rc_number", label: "RC Number (optional)", placeholder: "e.g. RC 123456", type: "text", required: false },
    ],
    requiresVerification: false,
    steps: ["Register your business", "Add locations", "Schedule bulk pickups", "Get impact reports"],
  },
  {
    role: "collector",
    title: "Collector",
    tagline: "Accept jobs & earn",
    description: "Accept pickup jobs, navigate to locations, and grow your earnings on your own schedule.",
    heroTitle: "Earn money collecting waste",
    heroSubtitle: "Accept pickup jobs on your schedule, navigate routes, and get paid weekly.",
    icon: "Truck",
    accent: "text-blue-600",
    iconBg: "bg-blue-100 text-blue-600",
    fields: [
      { key: "vehicle_type", label: "Vehicle Type", placeholder: "Select vehicle", type: "select", required: true, options: ["Tricycle (Keke)", "Motorcycle", "Van", "Pickup Truck", "Truck"] },
      { key: "vehicle_plate", label: "Vehicle Plate Number", placeholder: "e.g. ABC 123 XY", type: "text", required: false },
      { key: "service_city", label: "Service City", placeholder: "e.g. Abuja", type: "text", required: true },
    ],
    requiresVerification: true,
    steps: ["Register online", "Upload your documents", "Get verified", "Start earning"],
  },
  {
    role: "recycler",
    title: "Recycler",
    tagline: "Source recyclable materials",
    description: "Source recyclable materials, manage requests, and track deliveries from a dedicated portal.",
    heroTitle: "Source recyclable materials",
    heroSubtitle: "Connect with waste suppliers, manage material requests, and track deliveries.",
    icon: "Recycle",
    accent: "text-amber-600",
    iconBg: "bg-amber-100 text-amber-600",
    fields: [
      { key: "organization_name", label: "Organization Name", placeholder: "e.g. GreenCycle Ltd", type: "text", required: true },
      { key: "accepted_materials", label: "Materials You Accept", placeholder: "e.g. Plastic, Paper, Metal", type: "text", required: false },
    ],
    requiresVerification: true,
    steps: ["Register your facility", "List materials", "Get verified", "Source materials"],
  },
  {
    role: "organic_partner",
    title: "Organic Partner",
    tagline: "BSF farms & compost",
    description: "BSF farms, compost operators, and livestock feed producers sourcing organic waste.",
    heroTitle: "Turn organic waste into value",
    heroSubtitle: "Source organic waste for BSF farms, compost, and livestock feed production.",
    icon: "Leaf",
    accent: "text-lime-600",
    iconBg: "bg-lime-100 text-lime-600",
    fields: [
      { key: "organization_name", label: "Organization Name", placeholder: "e.g. EcoFeed Farms", type: "text", required: true },
      { key: "facility_type", label: "Facility Type", placeholder: "Select type", type: "select", required: false, options: ["BSF Farm", "Compost Site", "Livestock Feed", "Other"] },
    ],
    requiresVerification: true,
    steps: ["Register your facility", "Describe your operation", "Get verified", "Source organic waste"],
  },
  {
    role: "fleet_owner",
    title: "Fleet Operator",
    tagline: "Manage collection vehicles",
    description: "Manage collection vehicles, routes, and driver assignments from a dedicated fleet portal.",
    heroTitle: "Grow your transport business",
    heroSubtitle: "Manage vehicles, drivers, and dispatch operations from one dashboard.",
    icon: "Truck",
    accent: "text-indigo-600",
    iconBg: "bg-indigo-100 text-indigo-600",
    fields: [
      { key: "fleet_name", label: "Fleet / Company Name", placeholder: "e.g. Swift Haulage", type: "text", required: true },
      { key: "vehicle_count", label: "Number of Vehicles", placeholder: "e.g. 10", type: "text", required: false },
    ],
    requiresVerification: true,
    steps: ["Register your fleet", "Add vehicles & drivers", "Get approved", "Start earning"],
  },
  {
    role: "corporate_partner",
    title: "Corporate Partner",
    tagline: "Sustainability partnerships",
    description: "Sustainability partnerships, ESG reporting, and large-scale impact for your organisation.",
    heroTitle: "Drive your ESG goals",
    heroSubtitle: "Partner with Tydigo for sustainability programmes and measurable impact reporting.",
    icon: "Globe",
    accent: "text-rose-600",
    iconBg: "bg-rose-100 text-rose-600",
    fields: [
      { key: "company_name", label: "Company Name", placeholder: "e.g. Global Corp", type: "text", required: true },
      { key: "industry", label: "Industry", placeholder: "Select industry", type: "select", required: false, options: ["FMCG", "Banking", "Telecom", "Energy", "Technology", "Other"] },
    ],
    requiresVerification: true,
    steps: ["Register your company", "Define your goals", "Get approved", "Track impact"],
  },
  {
    role: "government",
    title: "Government Agency",
    tagline: "Agency oversight & reports",
    description: "Agency oversight, regulatory compliance, and city-wide waste analytics.",
    heroTitle: "City-wide waste oversight",
    heroSubtitle: "Monitor waste collection, compliance, and environmental impact across your jurisdiction.",
    icon: "Shield",
    accent: "text-slate-600",
    iconBg: "bg-slate-100 text-slate-600",
    fields: [
      { key: "agency_name", label: "Agency Name", placeholder: "e.g. Ministry of Environment", type: "text", required: true },
      { key: "jurisdiction", label: "Jurisdiction", placeholder: "e.g. FCT Abuja", type: "text", required: true },
    ],
    requiresVerification: true,
    steps: ["Register your agency", "Verify credentials", "Get approved", "Access analytics"],
  },
];

export function getAccountTypeConfig(role: UserRole): AccountTypeConfig | undefined {
  return ACCOUNT_TYPES.find((c) => c.role === role);
}
