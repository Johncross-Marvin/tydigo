/**
 * Tydigo EcoPoints Reward Engine
 *
 * Production EcoPoints service: wallet, transactions, redemption,
 * tiers, badges, challenges, referrals, and conversion.
 *
 * All reward rules are now database-driven via reward_rules table.
 * Atomic operations use PostgreSQL functions (award_ecopoints, redeem_ecopoints).
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Constants ───────────────────────────────────────────────

export const ECOPOINT_VALUE_NGN = 0.10; // 1 EcoPoint = ₦0.10 (default, overridden by DB)
export const ECOPOINTS_PER_NAIRA = 10;

// ─── Types ───────────────────────────────────────────────────

export type EcopointStatus = "pending" | "confirmed" | "redeemed" | "expired" | "reversed";

export type EcopointTransaction = {
  id: string;
  profile_id: string;
  wallet_id: string;
  points: number;
  transaction_type: string;
  source_type: string | null;
  source_id: string | null;
  reward_rule_id: string | null;
  campaign_id: string | null;
  challenge_id: string | null;
  referral_id: string | null;
  balance_before: number | null;
  balance_after: number | null;
  idempotency_key: string | null;
  description: string | null;
  status: EcopointStatus;
  confirmed_at: string | null;
  created_at: string;
};

export type EcoWallet = {
  id: string;
  profile_id: string;
  balance: number;
  pending_points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  lifetime_expired: number;
  lifetime_reversed: number;
  status: string;
};

export type EcoTier = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  minimum_lifetime_points: number;
  reward_multiplier: number;
  benefits: Record<string, unknown>;
  sort_order: number;
};

export type EcoBadge = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  reward_points: number;
  rarity: string;
};

export type UserEcoBadge = {
  id: string;
  profile_id: string;
  badge_id: string;
  earned_at: string;
  badge?: EcoBadge;
};

export type EcoChallenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_metric: string;
  target_value: number;
  reward_points: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export type EcoChallengeParticipant = {
  id: string;
  challenge_id: string;
  profile_id: string;
  current_progress: number;
  status: string;
  joined_at: string;
  completed_at: string | null;
};

export type ReferralCode = {
  id: string;
  profile_id: string;
  code: string;
};

export type Referral = {
  id: string;
  referrer_profile_id: string;
  referred_profile_id: string | null;
  status: string;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
};

export type EcoRedemption = {
  id: string;
  profile_id: string;
  redemption_type: string;
  points_used: number;
  monetary_value_ngn: number;
  status: string;
  created_at: string;
};

export type RedemptionOption = {
  id: string;
  name: string;
  points: number;
  valueNgn: number;
  type: "discount" | "airtime" | "cashback" | "donation";
  description: string;
};

// ─── Conversion ──────────────────────────────────────────────

export function ecopointsToNaira(points: number): number {
  return points * ECOPOINT_VALUE_NGN;
}

export function nairaToEcopoints(naira: number): number {
  return Math.ceil(naira / ECOPOINT_VALUE_NGN);
}

export function formatEcopoints(points: number): string {
  return new Intl.NumberFormat("en-NG").format(points);
}

// ─── Wallet Service ──────────────────────────────────────────

export async function getEcoWallet(profileId: string): Promise<EcoWallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("eco_points_wallets")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data as EcoWallet | null;
}

// ─── Transaction Service ─────────────────────────────────────

export async function getEcoTransactions(
  profileId: string,
  limit = 20,
  offset = 0,
  status?: EcopointStatus
): Promise<EcopointTransaction[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  let query = supabase!
    .from("ecopoint_transactions")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data as EcopointTransaction[]) || [];
}

// ─── Award Points (server-side via RPC) ──────────────────────

export async function awardEcoPoints(params: {
  profileId: string;
  points: number;
  transactionType?: string;
  sourceType?: string;
  sourceId?: string;
  rewardRuleId?: string;
  idempotencyKey: string;
  description?: string;
  status?: string;
}): Promise<string | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data, error } = await supabase.rpc("award_ecopoints", {
    p_profile_id: params.profileId,
    p_points: params.points,
    p_transaction_type: params.transactionType || "earn",
    p_source_type: params.sourceType,
    p_source_id: params.sourceId,
    p_reward_rule_id: params.rewardRuleId,
    p_idempotency_key: params.idempotencyKey,
    p_description: params.description,
    p_status: params.status || "confirmed",
  });
  if (error) throw error;
  return data as string;
}

// ─── Redeem Points (server-side via RPC) ─────────────────────

export async function redeemEcoPoints(params: {
  profileId: string;
  points: number;
  redemptionType?: string;
  relatedOrderType?: string;
  relatedOrderId?: string;
  idempotencyKey: string;
  description?: string;
}): Promise<{
  redemption_id: string;
  transaction_id: string;
  points_used: number;
  monetary_value_ngn: number;
  balance_after: number;
  status: string;
  error?: string;
  available?: number;
  requested?: number;
} | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data, error } = await supabase.rpc("redeem_ecopoints", {
    p_profile_id: params.profileId,
    p_points: params.points,
    p_redemption_type: params.redemptionType || "pickup_discount",
    p_related_order_type: params.relatedOrderType,
    p_related_order_id: params.relatedOrderId,
    p_idempotency_key: params.idempotencyKey,
    p_description: params.description,
  });
  if (error) throw error;
  return data as Record<string, unknown> as ReturnType<typeof redeemEcoPoints> extends Promise<infer T> ? T : never;
}

// ─── Tiers ───────────────────────────────────────────────────

export async function getEcoTiers(): Promise<EcoTier[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("eco_tiers")
    .select("*")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  return (data as EcoTier[]) || [];
}

export function getCurrentTier(tiers: EcoTier[], lifetimePoints: number): EcoTier {
  return tiers.filter((t) => lifetimePoints >= t.minimum_lifetime_points).pop() || tiers[0];
}

// ─── Badges ──────────────────────────────────────────────────

export async function getEcoBadges(): Promise<EcoBadge[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!.from("eco_badges").select("*").eq("status", "active");
  return (data as EcoBadge[]) || [];
}

export async function getUserBadges(profileId: string): Promise<UserEcoBadge[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("user_eco_badges")
    .select("*, badge:eco_badges(*)")
    .eq("profile_id", profileId);
  return (data as UserEcoBadge[]) || [];
}

// ─── Challenges ──────────────────────────────────────────────

export async function getActiveChallenges(): Promise<EcoChallenge[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("eco_challenges")
    .select("*")
    .eq("status", "active")
    .order("starts_at", { ascending: false });
  return (data as EcoChallenge[]) || [];
}

export async function joinChallenge(
  challengeId: string,
  profileId: string
): Promise<EcoChallengeParticipant | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!
    .from("eco_challenge_participants")
    .insert({ challenge_id: challengeId, profile_id: profileId, status: "active" })
    .select()
    .single();
  return data as EcoChallengeParticipant | null;
}

export async function getChallengeParticipants(
  challengeId: string,
  profileId: string
): Promise<EcoChallengeParticipant | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase!
    .from("eco_challenge_participants")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return data as EcoChallengeParticipant | null;
}

// ─── Referrals ───────────────────────────────────────────────

export async function getReferralCode(profileId: string): Promise<ReferralCode | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  // Try to get existing, generate if not exists
  const { data } = await supabase!
    .from("referral_codes")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (data) return data as ReferralCode;
  // Generate via RPC
  const { data: code } = await supabase!.rpc("generate_referral_code", {
    p_profile_id: profileId,
  });
  if (code) {
    const { data: newCode } = await supabase!
      .from("referral_codes")
      .select("*")
      .eq("profile_id", profileId)
      .single();
    return newCode as ReferralCode;
  }
  return null;
}

export async function getReferrals(profileId: string): Promise<Referral[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase!
    .from("referrals")
    .select("*")
    .eq("referrer_profile_id", profileId)
    .order("created_at", { ascending: false });
  return (data as Referral[]) || [];
}

// ─── Redemption Options ──────────────────────────────────────

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
