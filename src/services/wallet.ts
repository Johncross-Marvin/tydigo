/**
 * Tydigo Wallet Service
 *
 * Wallet balance, transactions, and EcoPoints wallet management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type Wallet = {
  id: string;
  profile_id: string;
  balance_ngn: number;
  total_earned_ngn: number;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  amount_ngn: number;
  type: string;
  reference: string;
  description: string | null;
  created_at: string;
};

export type EcoPointsWallet = {
  id: string;
  profile_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  created_at: string;
  updated_at: string;
};

export async function getWallet(profileId: string): Promise<Wallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("wallets")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data as Wallet | null;
}

export async function createWallet(profileId: string): Promise<Wallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("wallets")
    .insert({
      profile_id: profileId,
      balance_ngn: 0,
      total_earned_ngn: 0,
    })
    .select()
    .maybeSingle();

  return data as Wallet | null;
}

export async function getWalletTransactions(walletId: string, limit = 20): Promise<WalletTransaction[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as WalletTransaction[]) || [];
}

export async function getEcoPointsWallet(profileId: string): Promise<EcoPointsWallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("eco_points_wallets")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data as EcoPointsWallet | null;
}

export async function createEcoPointsWallet(profileId: string): Promise<EcoPointsWallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("eco_points_wallets")
    .insert({
      profile_id: profileId,
      balance: 500,
      lifetime_earned: 500,
      lifetime_redeemed: 0,
    })
    .select()
    .maybeSingle();

  return data as EcoPointsWallet | null;
}
