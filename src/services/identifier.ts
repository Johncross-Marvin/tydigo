/**
 * Tydigo Identifier Detection Service
 *
 * Intelligently detects whether a login input is an email,
 * phone number, or username.
 */

export type IdentifierType = "email" | "phone" | "username";

export type IdentifierResult = {
  type: IdentifierType;
  value: string;
  normalized: string;
};

/**
 * Detect the type of identifier from user input.
 *
 * Rules:
 *   - Contains "@" → email
 *   - Starts with "+" or mostly digits → phone
 *   - Otherwise → username
 */
export function detectIdentifier(input: string): IdentifierResult {
  const trimmed = input.trim();

  // Email detection
  if (trimmed.includes("@")) {
    return {
      type: "email",
      value: trimmed,
      normalized: trimmed.toLowerCase(),
    };
  }

  // Phone detection: starts with + or has 10+ digits
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") || (digits.length >= 10 && digits.length <= 15)) {
    return {
      type: "phone",
      value: trimmed,
      normalized: normalizePhoneForLookup(trimmed),
    };
  }

  // Default to username
  return {
    type: "username",
    value: trimmed,
    normalized: trimmed.toLowerCase(),
  };
}

/**
 * Normalize a phone number for database lookup.
 * Tries multiple formats to match stored E.164.
 */
function normalizePhoneForLookup(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return `+${digits}`;
}

/**
 * Check if a string looks like a valid email.
 */
export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

/**
 * Check if a string looks like a valid phone number.
 */
export function isPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
