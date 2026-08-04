/**
 * Tydigo EcoPoints Reward Engine
 *
 * Manages EcoPoints calculation, earning rules, conversion,
 * and redemption logic.
 *
 * EcoPoints are earned by customers and collectors for
 * environmentally positive actions on the platform.
 */

// ─── Constants ───────────────────────────────────────────────

export const ECOPOINT_VALUE_NGN = 0.10; // 1 EcoPoint = ₦0.10
export const ECOPOINTS_PER_NAIRA = 10; // ₦1 = 10 EcoPoints

// ─── Status ──────────────────────────────────────────────────

export type EcopointStatus = "pending" | "confirmed" | "redeemed" | "expired";

// ─── Earning Rules ───────────────────────────────────────────

export type EcopointRule = {
  id: string;
  name: string;
  role: "customer" | "collector";
  triggerEvent: string;
  points: number;
  cooldownDays: number;
  maxPerMonth?: number;
  description: string;
};

export const CUSTOMER_EARNING_RULES: EcopointRule[] = [
  {
    id: "signup_kyc",
    name: "Signup + KYC Complete",
    role: "customer",
    triggerEvent: "kyc_completed",
    points: 500,
    cooldownDays: 0,
    description: "Complete your profile and KYC verification",
  },
  {
    id: "first_pickup",
    name: "First Successful Pickup",
    role: "customer",
    triggerEvent: "first_pickup_completed",
    points: 1000,
    cooldownDays: 0,
    description: "Complete your very first waste pickup",
  },
  {
    id: "clear_waste_photo",
    name: "Clear Waste Photo",
    role: "customer",
    triggerEvent: "clear_waste_photo",
    points: 100,
    cooldownDays: 0,
    maxPerMonth: 10,
    description: "Upload a clear photo of your sorted waste",
  },
  {
    id: "sorted_plastic",
    name: "Sorted Plastic Waste",
    role: "customer",
    triggerEvent: "waste_sorted_plastic",
    points: 300,
    cooldownDays: 0,
    maxPerMonth: 20,
    description: "Properly sorted plastic waste for recycling",
  },
  {
    id: "sorted_organic",
    name: "Sorted Organic Waste",
    role: "customer",
    triggerEvent: "waste_sorted_organic",
    points: 300,
    cooldownDays: 0,
    maxPerMonth: 20,
    description: "Properly sorted organic waste for composting/BSF",
  },
  {
    id: "pickup_5kg",
    name: "Verified Waste Above 5kg",
    role: "customer",
    triggerEvent: "pickup_verified_5kg",
    points: 200,
    cooldownDays: 0,
    description: "Completed pickup with 5kg+ verified waste",
  },
  {
    id: "pickup_10kg",
    name: "Verified Waste Above 10kg",
    role: "customer",
    triggerEvent: "pickup_verified_10kg",
    points: 500,
    cooldownDays: 0,
    description: "Completed pickup with 10kg+ verified waste",
  },
  {
    id: "pickup_25kg",
    name: "Verified Waste Above 25kg",
    role: "customer",
    triggerEvent: "pickup_verified_25kg",
    points: 1500,
    cooldownDays: 0,
    description: "Completed pickup with 25kg+ verified waste",
  },
  {
    id: "referral_verified",
    name: "Verified Referral",
    role: "customer",
    triggerEvent: "referral_verified",
    points: 1500,
    cooldownDays: 0,
    description: "Refer a friend who completes their first pickup",
  },
  {
    id: "illegal_dumping",
    name: "Illegal Dumping Report",
    role: "customer",
    triggerEvent: "illegal_dumping_report",
    points: 500,
    cooldownDays: 0,
    maxPerMonth: 4,
    description: "Report illegal dumping with photo evidence",
  },
];

export const COLLECTOR_EARNING_RULES: EcopointRule[] = [
  {
    id: "collector_kyc",
    name: "KYC Completed",
    role: "collector",
    triggerEvent: "kyc_completed",
    points: 1000,
    cooldownDays: 0,
    description: "Complete identity and vehicle verification",
  },
  {
    id: "collector_first_pickup",
    name: "First Pickup Completed",
    role: "collector",
    triggerEvent: "first_pickup_completed",
    points: 500,
    cooldownDays: 0,
    description: "Complete your first waste pickup as a collector",
  },
  {
    id: "five_star",
    name: "Five-Star Rating",
    role: "collector",
    triggerEvent: "five_star_rating",
    points: 200,
    cooldownDays: 0,
    maxPerMonth: 50,
    description: "Receive a five-star rating from a customer",
  },
  {
    id: "on_time",
    name: "On-Time Pickup",
    role: "collector",
    triggerEvent: "on_time_pickup",
    points: 150,
    cooldownDays: 0,
    maxPerMonth: 50,
    description: "Arrive within the scheduled pickup window",
  },
  {
    id: "no_complaint",
    name: "No Complaint Pickup",
    role: "collector",
    triggerEvent: "no_complaint",
    points: 100,
    cooldownDays: 0,
    maxPerMonth: 50,
    description: "Complete a pickup without any customer complaint",
  },
  {
    id: "plastic_to_recycler",
    name: "Plastic to Recycler",
    role: "collector",
    triggerEvent: "plastic_to_recycler",
    points: 300,
    cooldownDays: 0,
    maxPerMonth: 20,
    description: "Deliver plastic waste to an approved recycler",
  },
  {
    id: "organic_to_partner",
    name: "Organic to BSF/Compost Partner",
    role: "collector",
    triggerEvent: "organic_to_partner",
    points: 300,
    cooldownDays: 0,
    maxPerMonth: 20,
    description: "Deliver organic waste to BSF farm or compost partner",
  },
  {
    id: "twenty_pickups",
    name: "20 Pickups/Month",
    role: "collector",
    triggerEvent: "twenty_pickups_month",
    points: 3000,
    cooldownDays: 30,
    description: "Complete 20 or more pickups in a calendar month",
  },
  {
    id: "safety_training",
    name: "Safety Training Completed",
    role: "collector",
    triggerEvent: "safety_training_completed",
    points: 2000,
    cooldownDays: 0,
    description: "Complete the Tydigo safety training module",
  },
  {
    id: "high_rating_30d",
    name: "4.5+ Rating for 30 Days",
    role: "collector",
    triggerEvent: "high_rating_30_days",
    points: 5000,
    cooldownDays: 30,
    description: "Maintain a 4.5+ average rating for 30 consecutive days",
  },
];

export const ALL_EARNING_RULES = [
  ...CUSTOMER_EARNING_RULES,
  ...COLLECTOR_EARNING_RULES,
];

// ─── Conversion ──────────────────────────────────────────────

/**
 * Convert EcoPoints to Naira value.
 */
export function ecopointsToNaira(points: number): number {
  return points * ECOPOINT_VALUE_NGN;
}

/**
 * Convert Naira to minimum EcoPoints needed.
 */
export function nairaToEcopoints(naira: number): number {
  return Math.ceil(naira / ECOPOINT_VALUE_NGN);
}

// ─── Redemption ──────────────────────────────────────────────

export type RedemptionOption = {
  id: string;
  name: string;
  points: number;
  valueNgn: number;
  type: "discount" | "airtime" | "cashback" | "donation";
  description: string;
};

export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  {
    id: "discount_500",
    name: "₦500 Pickup Discount",
    points: 5000,
    valueNgn: 500,
    type: "discount",
    description: "Get ₦500 off your next waste pickup",
  },
  {
    id: "discount_1000",
    name: "₦1,000 Pickup Discount",
    points: 10000,
    valueNgn: 1000,
    type: "discount",
    description: "Get ₦1,000 off your next waste pickup",
  },
  {
    id: "airtime_500",
    name: "₦500 Airtime",
    points: 5000,
    valueNgn: 500,
    type: "airtime",
    description: "Convert to ₦500 mobile airtime",
  },
  {
    id: "airtime_1000",
    name: "₦1,000 Airtime",
    points: 10000,
    valueNgn: 1000,
    type: "airtime",
    description: "Convert to ₦1,000 mobile airtime",
  },
  {
    id: "cashback_2000",
    name: "₦2,000 Cashback",
    points: 20000,
    valueNgn: 2000,
    type: "cashback",
    description: "Transfer ₦2,000 to your bank account",
  },
  {
    id: "donation_1000",
    name: "Plant 10 Trees (₦1,000)",
    points: 10000,
    valueNgn: 1000,
    type: "donation",
    description: "Donate to plant 10 trees via our reforestation partner",
  },
];

// ─── Helper Functions ────────────────────────────────────────

/**
 * Find the rule for a given trigger event.
 */
export function findRule(triggerEvent: string, role?: "customer" | "collector"): EcopointRule | undefined {
  if (role) {
    return ALL_EARNING_RULES.find(
      (r) => r.triggerEvent === triggerEvent && r.role === role
    );
  }
  return ALL_EARNING_RULES.find((r) => r.triggerEvent === triggerEvent);
}

/**
 * Get all rules for a specific role.
 */
export function getRulesForRole(role: "customer" | "collector"): EcopointRule[] {
  return ALL_EARNING_RULES.filter((r) => r.role === role);
}

/**
 * Format EcoPoints for display.
 */
export function formatEcopoints(points: number): string {
  return new Intl.NumberFormat("en-NG").format(points);
}
