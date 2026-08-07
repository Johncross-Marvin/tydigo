/**
 * Tydigo Username Service
 *
 * Auto-generates unique usernames from full names and validates
 * uniqueness against the profiles table.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

/**
 * Generate a username from a full name.
 *
 * Examples:
 *   "John Marvin"     → "johnmarvin"
 *   "Amina Bello"     → "aminabello"
 *   "Chukwuemeka O."  → "chukwuemekao"
 */
export function generateUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 30);
}

/**
 * Generate a unique username with numeric suffix if needed.
 *
 * Examples:
 *   "johnmarvin" (available) → "johnmarvin"
 *   "johnmarvin" (taken)     → "johnmarvin34"
 */
export async function generateUniqueUsername(fullName: string): Promise<string> {
  const base = generateUsername(fullName);

  if (!isSupabaseAvailable() || !supabase) {
    // Mock mode — just append a random suffix
    return `${base}${Math.floor(Math.random() * 1000)}`;
  }

  // Check if base is available
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", base)
    .maybeSingle();

  if (!data) return base;

  // Append random suffix
  const suffix = Math.floor(Math.random() * 900) + 10;
  return `${base}${suffix}`;
}

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false;

  if (!isSupabaseAvailable() || !supabase) {
    return true; // Mock mode — always available
  }

  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return !data;
}

/**
 * Reserved usernames that cannot be registered.
 */
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "support", "tydigo", "help",
  "security", "billing", "api", "system", "root",
  "official", "government", "moderator", "mod", "staff",
  "team", "info", "contact", "service", "mail", "email",
  "webmaster", "postmaster", "hostmaster", "abuse", "noc",
  "null", "undefined", "true", "false", "everyone", "all",
  "here", "there", "test", "testing", "demo", "guest",
  "anonymous", "anon", "nobody", "anyone", "someone",
]);

/**
 * Check if a username is reserved.
 */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/**
 * Validate username format and check reserved names.
 */
export function isValidUsername(username: string): boolean {
  if (!/^[a-z0-9]{3,30}$/.test(username)) return false;
  if (isReservedUsername(username)) return false;
  return true;
}
