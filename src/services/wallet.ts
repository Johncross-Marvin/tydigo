/**
 * Tydigo Wallet Service
 *
 * Manages wallet creation, balance queries, and transaction history.
 * Wallets are created automatically on profile creation.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────

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
  type: "credit" | "debit" | "withdrawal" | "payment" | "refund";
  reference: string;
  description: string | null;
  created_at: string;
};

// ─── Get Wallet ───────────────────────────────────────────────

export async function getWallet(profileId: string): Promise<Wallet | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Wallet;
}

// ─── Get Balance ──────────────────────────────────────────────

export async function getBalance(profileId: string): Promise<number> {
  const wallet = await getWallet(profileId);
  return wallet?.balance_ngn ?? 0;
}

// ─── Get Transactions ─────────────────────────────────────────

export async function getTransactions(
  walletId: string,
  limit = 20,
): Promise<WalletTransaction[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as WalletTransaction[];
}

// ─── Create Wallet (if not exists) ────────────────────────────

export async function ensureWallet(profileId: string): Promise<Wallet> {
  if (!isSupabaseAvailable() || !supabase) {
    return {
      id: "mock-wallet",
      profile_id: profileId,
      balance_ngn: 0,
      total_earned_ngn: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Check if wallet exists
  const existing = await getWallet(profileId);
  if (existing) return existing;

  // Create wallet
  const { data, error } = await supabase
    .from("wallets")
    .insert({
      profile_id: profileId,
      balance_ngn: 0,
      total_earned_ngn: 0,
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Wallet creation failed: ${error.message}`);
  if (!data) throw new Error("Wallet creation returned no data.");
  return data as Wallet;
}

// ─── Format for Display ───────────────────────────────────────

export function formatWalletBalance(ngn: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(ngn);
}
