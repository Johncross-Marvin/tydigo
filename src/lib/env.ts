/**
 * Tydigo Environment Variables Helper
 *
 * Central place for accessing environment variables with
 * mock fallbacks when keys are not configured.
 */

// ─── Supabase ─────────────────────────────────────────────────

// Vite statically replaces import.meta.env.VITE_* at build time.
// Direct property access is REQUIRED for Vite to work correctly.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// ─── Paystack ─────────────────────────────────────────────────

export const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string || "";

export function hasPaystack(): boolean {
  return Boolean(PAYSTACK_PUBLIC_KEY);
}

// ─── Maps ─────────────────────────────────────────────────────

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string || "";

export const MAP_PROVIDER =
  (import.meta.env.VITE_MAP_PROVIDER as string) || "placeholder";

export function hasMapKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

// ─── Feature Flags ────────────────────────────────────────────

export const ENABLE_PWA =
  import.meta.env.VITE_ENABLE_PWA !== "false";

export const ENABLE_PUSH_NOTIFICATIONS =
  import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== "false";

export const ENABLE_MOCK_AUTH =
  import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

export const ENABLE_MOCK_PAYMENTS =
  import.meta.env.VITE_ENABLE_MOCK_PAYMENTS === "true";

export const ENABLE_MOCK_MAPS =
  import.meta.env.VITE_ENABLE_MOCK_MAPS === "true";

// ─── App ──────────────────────────────────────────────────────

export const APP_NAME = (import.meta.env.VITE_APP_NAME as string) || "Tydigo";
export const APP_ENV = (import.meta.env.VITE_APP_ENV as string) || "development";
export const DEFAULT_CITY = (import.meta.env.VITE_DEFAULT_CITY as string) || "Abuja";
export const CURRENCY = (import.meta.env.VITE_CURRENCY as string) || "NGN";
export const TIMEZONE = (import.meta.env.VITE_TIMEZONE as string) || "Africa/Lagos";
export const DEFAULT_COUNTRY_CODE = (import.meta.env.VITE_DEFAULT_COUNTRY_CODE as string) || "+234";

// ─── VAPID (Push Notifications) ───────────────────────────────

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY as string || "";

export function hasVapidKey(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

// ─── API ──────────────────────────────────────────────────────

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, "") || "";
