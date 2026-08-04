/**
 * Tydigo Supabase Client
 *
 * Creates a Supabase client for frontend use.
 * Falls back to mock mode if Supabase is not configured.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabase } from "./env";

// Permissive schema type — avoids strict table typing until
// full types are generated via `npx supabase gen types`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = any;

let _client: SupabaseClient<Schema> | null = null;

function getClient(): SupabaseClient<Schema> {
  if (!_client && hasSupabase()) {
    _client = createClient<Schema>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return _client!;
}

export const supabase: SupabaseClient<Schema> | null = hasSupabase() ? getClient() : null;

export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

// ─── Helpers ────────────────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

export function generatePickupCode(): string {
  return `TYD-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function normalizePhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length >= 11) return `+${digits}`;
  return `+234${digits}`;
}

// ─── Re-export for convenience ──────────────────────────────

export type { SupabaseClient };
