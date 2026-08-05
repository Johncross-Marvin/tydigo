/**
 * Tydigo Phone Number Utilities
 *
 * Nigerian phone number normalization to E.164 format.
 */

/**
 * Normalize a Nigerian phone number to E.164 (+234XXXXXXXXXX).
 *
 * Examples:
 *   "08000000000"   → "+2348000000000"
 *   "8000000000"    → "+2348000000000"
 *   "+2348000000000" → "+2348000000000"
 *   "2348000000000"  → "+2348000000000"
 *   "0800 000 0000" → "+2348000000000"
 *   "0800-000-0000" → "+2348000000000"
 */
export function normalizeNigerianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // Already full international with 234 prefix → just add +
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;

  // Standard Nigerian mobile (11 digits starting with 0) → replace 0 with +234
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;

  // 10 digits without leading 0 (common mistake) → prepend +234
  if (digits.length === 10) return `+234${digits}`;

  // Other international format (already has country code)
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  // Fallback — prepend +234 (best effort)
  return `+234${digits}`;
}

/**
 * Check if a string looks like a valid Nigerian phone number.
 */
export function isValidNigerianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");

  // Nigerian format: 13 digits with 234 prefix
  if (digits.startsWith("234") && digits.length === 13) return true;

  // Nigerian format: 11 digits with leading 0
  if (digits.startsWith("0") && digits.length === 11) return true;

  // Nigerian format: 10 digits (mobile number without country code)
  if (digits.length === 10) return true;

  // Other international (allow up to 15 digits per E.164)
  if (digits.length >= 11 && digits.length <= 15) return true;

  return false;
}

/**
 * Format a phone number for display (mask middle digits).
 * "+2348000000000" → "+234 800 **** 000"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return phone;

  const cc = digits.startsWith("234") ? "+234" : `+${digits.slice(0, 2)}`;
  const rest = digits.startsWith("234") ? digits.slice(3) : digits.slice(2);
  const masked = rest.slice(0, 3) + " **** " + rest.slice(-3);

  return `${cc} ${masked}`;
}
