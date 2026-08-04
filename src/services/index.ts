/**
 * Tydigo Services
 *
 * Barrel export for all shared service modules.
 * Business logic lives here, separated from UI components.
 */

export {
  calculatePrice,
  estimatePrice,
  formatNaira,
  findPricingTier,
  findWasteModifier,
  DEFAULT_PRICING_TIERS,
  WASTE_MODIFIERS,
  PLATFORM_FEE_PERCENT,
  MIN_PICKUP_PRICE_NGN,
  MAX_ECOPOINTS_DISCOUNT_PERCENT,
} from "./pricing";
export type { WasteType, PricingTier, WasteModifier, PriceBreakdown } from "./pricing";

export {
  ecopointsToNaira,
  nairaToEcopoints,
  formatEcopoints,
  findRule,
  getRulesForRole,
  CUSTOMER_EARNING_RULES,
  COLLECTOR_EARNING_RULES,
  ALL_EARNING_RULES,
  REDEMPTION_OPTIONS,
  ECOPOINTS_PER_NAIRA,
} from "./ecopoints";
export type { EcopointStatus, EcopointRule, RedemptionOption } from "./ecopoints";

export { ECOPOINT_VALUE_NGN } from "./ecopoints";

export {
  canTransition,
  getNextStatuses,
  getStatusLabel,
  getStatusColor,
  isActivePickup,
  isTerminalStatus,
  VALID_TRANSITIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ICONS,
} from "./pickup-status";
export type { PickupStatus } from "./pickup-status";

export {
  signInWithPhone,
  verifyOtp,
  signOut,
  getCurrentUser,
  getUserProfile,
  updateProfile,
  setUserRole,
  refreshSession,
} from "./auth";
export type { AuthUser, UserRole } from "./auth";

export { createPickup, getCustomerPickups, getActivePickup, uploadPickupPhoto } from "./pickup";
export type { PickupDraftInput, CreatedPickup } from "./pickup";

export { initializePayment, verifyPayment } from "./payments";
export type { PaymentResult } from "./payments";

export {
  uploadFile,
  uploadWastePhoto,
  uploadPickupProof,
  uploadAvatar,
  deleteFile,
  getSignedUrl,
  BUCKETS,
} from "./storage";
