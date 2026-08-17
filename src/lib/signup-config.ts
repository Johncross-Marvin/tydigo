/**
 * Tydigo Account-Type Signup Registry
 *
 * Single source of truth for each account type's dedicated landing page and
 * registration flow. Mirrors Bolt's "one product = one landing page + one
 * registration flow + one dashboard" model.
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

export type ValueProp = {
  icon: string;
  title: string;
  description: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export type AccountTypeConfig = {
  role: UserRole;
  /** Short product name (e.g. "Household", "Collector") */
  title: string;
  /** One-line value proposition */
  tagline: string;
  /** Longer description shown on the landing card */
  description: string;
  /** Hero headline on the dedicated landing page */
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
  /** Value propositions (why join) */
  valueProps: ValueProp[];
  /** Requirements / what you need to get started */
  requirements: string[];
  /** Frequently asked questions */
  faqs: Faq[];
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
    valueProps: [
      { icon: "MapPin", title: "On-demand pickup", description: "Request a pickup in seconds and get matched with a verified collector nearby." },
      { icon: "Truck", title: "Real-time tracking", description: "Watch your collector approach on a live map and know exactly when they'll arrive." },
      { icon: "Award", title: "Earn EcoPoints", description: "Earn rewards for every pickup and redeem for cash, airtime, or household items." },
      { icon: "Shield", title: "Verified collectors", description: "All collectors are KYC-verified. Rate your experience after every pickup." },
    ],
    requirements: [
      "A valid phone number or email address",
      "Your home address for pickup scheduling",
      "A payment method (card, bank transfer, or EcoPoints)",
    ],
    faqs: [
      { question: "How do I schedule a pickup?", answer: "Create an account, enter your address, choose your waste type, and pick a time window. A verified collector will be assigned to you." },
      { question: "How much does a pickup cost?", answer: "Pricing is based on waste type and weight. You'll see the exact price before confirming your pickup." },
      { question: "How do I earn EcoPoints?", answer: "You earn EcoPoints for every completed pickup. Redeem them for cash, airtime, or household items in the rewards store." },
    ],
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
    valueProps: [
      { icon: "Building2", title: "Bulk scheduling", description: "Schedule pickups for your entire estate in one go, not unit by unit." },
      { icon: "BarChart3", title: "Community reports", description: "Track waste diverted, recycling rates, and environmental impact for your community." },
      { icon: "Users", title: "Resident management", description: "Manage residents and coordinate collection across your community." },
      { icon: "Shield", title: "Dedicated support", description: "Get priority support for your estate's waste management needs." },
    ],
    requirements: [
      "Your estate or community name",
      "The number of residential units",
      "A contact person for coordination",
    ],
    faqs: [
      { question: "Can I schedule pickups for multiple units?", answer: "Yes. Estate accounts support bulk scheduling so you can arrange collection for your entire community at once." },
      { question: "Do residents need their own accounts?", answer: "No. You can manage collection centrally for your estate, though residents can also create individual household accounts." },
    ],
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
    valueProps: [
      { icon: "MapPin", title: "Multi-location", description: "Manage waste collection across all your business locations from one dashboard." },
      { icon: "BarChart3", title: "Impact reports", description: "Download sustainability and ESG reports to track your environmental footprint." },
      { icon: "Calendar", title: "Scheduled pickups", description: "Set recurring pickups on a daily, weekly, or monthly schedule." },
      { icon: "Shield", title: "Dedicated support", description: "Get a dedicated account manager for your business waste needs." },
    ],
    requirements: [
      "Your business name",
      "Your business type and RC number (optional)",
      "A contact person for coordination",
    ],
    faqs: [
      { question: "Can I schedule recurring pickups?", answer: "Yes. Business accounts support daily, weekly, and monthly recurring pickup schedules." },
      { question: "Do you provide sustainability reports?", answer: "Yes. Business accounts get downloadable impact reports showing waste diverted, recycling rates, and carbon offset." },
    ],
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
    valueProps: [
      { icon: "Clock", title: "Flexible schedule", description: "Go online whenever you want. No minimum hours, no boss, no monthly fees." },
      { icon: "DollarSign", title: "Weekly payouts", description: "Get your earnings at the end of each week, with transparent pricing on every job." },
      { icon: "MapPin", title: "Smart routing", description: "See available jobs near you and navigate to pickup locations with ease." },
      { icon: "Award", title: "Earn rewards", description: "Earn bonuses and rewards for consistent, high-quality service." },
    ],
    requirements: [
      "A valid government-issued ID",
      "A smartphone (Android 9.0+ or iOS 12+)",
      "A vehicle (tricycle, motorcycle, van, or truck)",
      "A bank account for payouts",
    ],
    faqs: [
      { question: "How do I start collecting?", answer: "Register online, upload your documents, and get verified. Once approved, you can go online and accept jobs." },
      { question: "How much can I earn?", answer: "Earnings depend on the number of jobs you complete. You'll see the price for each job before accepting it." },
      { question: "When do I get paid?", answer: "Payouts are processed weekly. You can track your earnings in real time in the collector app." },
    ],
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
    valueProps: [
      { icon: "Recycle", title: "Material sourcing", description: "Source recyclable materials from verified waste suppliers across your city." },
      { icon: "Package", title: "Batch tracking", description: "Track material batches from pickup to delivery with full traceability." },
      { icon: "BarChart3", title: "Revenue view", description: "Monitor your material sourcing and revenue in one dashboard." },
      { icon: "Shield", title: "Verified network", description: "Connect with verified collectors and suppliers for reliable sourcing." },
    ],
    requirements: [
      "Your organization name",
      "The types of materials you accept",
      "A facility address for deliveries",
    ],
    faqs: [
      { question: "What materials can I source?", answer: "You can source recyclable materials like plastic, paper, metal, glass, and more, depending on your facility's needs." },
      { question: "How do I get verified?", answer: "After registering, submit your facility details. Our team will review and approve your account." },
    ],
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
    valueProps: [
      { icon: "Leaf", title: "Organic sourcing", description: "Source organic waste for BSF farms, compost, and livestock feed production." },
      { icon: "Package", title: "Batch tracking", description: "Track organic waste batches from source to your facility." },
      { icon: "BarChart3", title: "Supply insights", description: "Monitor your organic waste supply and plan your production." },
      { icon: "Shield", title: "Verified suppliers", description: "Connect with verified waste suppliers for consistent organic feedstock." },
    ],
    requirements: [
      "Your organization name",
      "Your facility type (BSF farm, compost, livestock feed, etc.)",
      "A facility address for deliveries",
    ],
    faqs: [
      { question: "What types of organic waste can I source?", answer: "You can source food waste, agricultural residue, and other organic materials suitable for your operation." },
      { question: "How do I get verified?", answer: "Register your facility, describe your operation, and our team will review and approve your account." },
    ],
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
    valueProps: [
      { icon: "Truck", title: "Fleet management", description: "Manage vehicles, drivers, and routes from one easy-to-use dashboard." },
      { icon: "Users", title: "Driver management", description: "Recruit, assign, and track drivers with real-time performance metrics." },
      { icon: "BarChart3", title: "Real-time analytics", description: "Access earnings data and team performance insights 24/7." },
      { icon: "Shield", title: "Compliance reports", description: "Generate auto-generated reports for your compliance needs." },
    ],
    requirements: [
      "Your fleet or company name",
      "The number of vehicles in your fleet",
      "Vehicle and driver documentation",
    ],
    faqs: [
      { question: "How do I add my fleet?", answer: "Register a fleet company account, add your vehicles and drivers, and our team will activate your account." },
      { question: "How long does approval take?", answer: "It takes just a few minutes to register. Once your fleet details are verified, your vehicles are ready to start earning." },
    ],
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
    valueProps: [
      { icon: "Globe", title: "ESG reporting", description: "Get measurable sustainability and ESG reports for your stakeholders." },
      { icon: "BarChart3", title: "Impact tracking", description: "Track your environmental impact across all your sustainability programmes." },
      { icon: "Users", title: "Employee engagement", description: "Engage your employees in sustainability initiatives and track participation." },
      { icon: "Shield", title: "Dedicated partnership", description: "Get a dedicated partnership manager for your sustainability goals." },
    ],
    requirements: [
      "Your company name",
      "Your industry",
      "A contact person for partnership coordination",
    ],
    faqs: [
      { question: "What kind of partnerships do you offer?", answer: "We offer sustainability partnerships, ESG reporting, and large-scale impact programmes tailored to your organisation." },
      { question: "How do I get started?", answer: "Register your company, define your sustainability goals, and our team will contact you to set up your partnership." },
    ],
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
    valueProps: [
      { icon: "MapPin", title: "Regional analytics", description: "Monitor waste collection and recycling rates across your jurisdiction." },
      { icon: "Shield", title: "Compliance monitoring", description: "Track registered collectors, licensed operators, and compliance rates." },
      { icon: "Globe", title: "Environmental impact", description: "Measure waste diverted, recycling rates, and carbon offset across your region." },
      { icon: "FileText", title: "Public reports", description: "Generate public reports on waste management and environmental impact." },
    ],
    requirements: [
      "Your agency name",
      "Your jurisdiction (city or region)",
      "Official credentials for verification",
    ],
    faqs: [
      { question: "What data can I access?", answer: "Government accounts get access to regional waste analytics, compliance data, and environmental impact reports." },
      { question: "How do I get verified?", answer: "Register your agency, submit your credentials, and our team will verify and approve your account." },
    ],
  },
];

export function getAccountTypeConfig(role: UserRole): AccountTypeConfig | undefined {
  return ACCOUNT_TYPES.find((c) => c.role === role);
}
