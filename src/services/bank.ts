/**
 * Tydigo Bank Service
 *
 * Bank account CRUD, verification, and Paystack recipient management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type BankAccount = {
  id: string;
  profile_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_code: string | null;
  paystack_recipient_code: string | null;
  is_verified: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type BankAccountInput = {
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_code?: string;
  is_default?: boolean;
};

// Nigerian banks list
export const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank", code: "023" },
  { name: "Ecobank", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Opay", code: "100004" },
  { name: "PalmPay", code: "100033" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "Standard Chartered", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "SunTrust Bank", code: "100" },
  { name: "Titan Trust Bank", code: "102" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

export async function getBankAccounts(profileId: string): Promise<BankAccount[]> {
  if (!isSupabaseAvailable() || !supabase) return [];
  const { data } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("profile_id", profileId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as BankAccount[]) || [];
}

export async function addBankAccount(profileId: string, input: BankAccountInput): Promise<BankAccount | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  if (input.is_default) {
    await supabase.from("bank_accounts").update({ is_default: false }).eq("profile_id", profileId);
  }

  const { data } = await supabase
    .from("bank_accounts")
    .insert({
      profile_id: profileId,
      bank_name: input.bank_name,
      account_name: input.account_name,
      account_number: input.account_number,
      bank_code: input.bank_code || null,
      is_default: input.is_default || false,
    })
    .select()
    .maybeSingle();

  return data as BankAccount | null;
}

export async function updateBankAccount(accountId: string, input: Partial<BankAccountInput>): Promise<BankAccount | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data: existing } = await supabase.from("bank_accounts").select("profile_id").eq("id", accountId).maybeSingle();
  if (!existing) return null;

  if (input.is_default) {
    await supabase.from("bank_accounts").update({ is_default: false }).eq("profile_id", existing.profile_id);
  }

  const { data } = await supabase
    .from("bank_accounts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .select()
    .maybeSingle();

  return data as BankAccount | null;
}

export async function deleteBankAccount(accountId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("bank_accounts").delete().eq("id", accountId);
}

export async function setDefaultBankAccount(profileId: string, accountId: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;
  await supabase.from("bank_accounts").update({ is_default: false }).eq("profile_id", profileId);
  await supabase.from("bank_accounts").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", accountId);
}

export async function verifyBankAccount(accountId: string): Promise<BankAccount | null> {
  if (!isSupabaseAvailable() || !supabase) return null;
  const { data } = await supabase
    .from("bank_accounts")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .select()
    .maybeSingle();
  return data as BankAccount | null;
}
