/**
 * Tydigo Collector Wallet Service
 *
 * Wallet balance, transactions, and withdrawals.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type CollectorWallet = {
  id: string;
  collector_id: string;
  available_balance_ngn: number;
  pending_balance_ngn: number;
  withdrawable_balance_ngn: number;
  lifetime_earnings_ngn: number;
};

export type CollectorTransaction = {
  id: string;
  wallet_id: string;
  transaction_type: "earning" | "bonus" | "withdrawal" | "adjustment" | "ecopoints_conversion";
  amount_ngn: number;
  reference: string | null;
  status: "pending" | "completed" | "failed" | "reversed";
  description: string | null;
  created_at: string;
};

export type CollectorWithdrawal = {
  id: string;
  collector_id: string;
  amount_ngn: number;
  bank_account_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "reversed";
  reference: string | null;
  requested_at: string;
  processed_at: string | null;
};

export async function getWallet(profileId: string): Promise<CollectorWallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase.from("collector_wallets").select("*").eq("collector_id", profileId).maybeSingle();
  return data as CollectorWallet | null;
}

export async function ensureWallet(profileId: string): Promise<CollectorWallet> {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Supabase not available");
  const existing = await getWallet(profileId);
  if (existing) return existing;
  const { data } = await supabase.from("collector_wallets").insert({ collector_id: profileId }).select().maybeSingle();
  if (!data) throw new Error("Failed to create wallet");
  return data as CollectorWallet;
}

export async function getTransactions(walletId: string, limit = 30): Promise<CollectorTransaction[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false }).limit(limit);
  return (data || []) as CollectorTransaction[];
}

export async function getWithdrawals(profileId: string, limit = 20): Promise<CollectorWithdrawal[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase.from("collector_withdrawals").select("*").eq("collector_id", profileId).order("requested_at", { ascending: false }).limit(limit);
  return (data || []) as CollectorWithdrawal[];
}

export async function requestWithdrawal(profileId: string, amountNgn: number, bankAccountId?: string): Promise<CollectorWithdrawal> {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Supabase not available");

  const wallet = await getWallet(profileId);
  if (!wallet || wallet.withdrawable_balance_ngn < amountNgn) {
    throw new Error("Insufficient withdrawable balance");
  }

  const reference = `WTH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data } = await supabase.from("collector_withdrawals").insert({
    collector_id: profileId,
    amount_ngn: amountNgn,
    bank_account_id: bankAccountId || null,
    status: "pending",
    reference,
  }).select().maybeSingle();

  if (!data) throw new Error("Failed to create withdrawal");

  // Update wallet balances
  await supabase.from("collector_wallets").update({
    withdrawable_balance_ngn: wallet.withdrawable_balance_ngn - amountNgn,
    available_balance_ngn: wallet.available_balance_ngn - amountNgn,
    updated_at: new Date().toISOString(),
  }).eq("id", wallet.id);

  // Record transaction
  await supabase.from("collector_transactions").insert({
    wallet_id: wallet.id,
    transaction_type: "withdrawal",
    amount_ngn: -amountNgn,
    reference,
    status: "pending",
    description: `Withdrawal request: ₦${amountNgn.toLocaleString()}`,
  });

  return data as CollectorWithdrawal;
}
