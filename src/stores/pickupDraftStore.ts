/**
 * Tydigo Pickup Draft Store
 *
 * Manages the multi-step pickup creation draft state.
 * Uses React state pattern — the store is used via useReducer or
 * passed as a prop through the pickup flow component.
 */

import type { WasteType } from "@/services/pricing";
import type { PriceBreakdown } from "@/services/pricing";

// ─── Draft Shape ──────────────────────────────────────────────

export type PickupDraft = {
  /** Step 1: Waste type */
  wasteType: WasteType | null;
  /** Step 2: Photo file (for upload) */
  photoFile: File | null;
  photoPreview: string | null;
  /** Step 3: Estimated weight in kg */
  estimatedWeightKg: number;
  /** Step 4: Sorting status */
  sortingStatus: "properly_sorted" | "partially_sorted" | "not_sorted";
  /** Step 5: Pickup address */
  address: string;
  addressLabel: string;
  pickupInstructions: string;
  /** Step 6: Schedule */
  scheduleWindow: "today" | "tomorrow" | "week" | "custom";
  /** Step 7: Pricing (calculated automatically) */
  priceBreakdown: PriceBreakdown | null;
  /** Step 8: EcoPoints discount */
  ecopointsToApply: number;
  /** Step 9: Payment method */
  paymentMethod: "card" | "ecopoints" | "transfer";
  /** Current step index (0-8) */
  currentStep: number;
};

// ─── Constants ────────────────────────────────────────────────

export const TOTAL_STEPS = 9;

export const STEP_LABELS = [
  "Category",
  "Photo",
  "Weight",
  "Sorting",
  "Address",
  "Schedule",
  "Pricing",
  "EcoPoints",
  "Payment",
];

// ─── Initial State ────────────────────────────────────────────

export function createInitialDraft(defaultAddress = ""): PickupDraft {
  return {
    wasteType: null,
    photoFile: null,
    photoPreview: null,
    estimatedWeightKg: 5,
    sortingStatus: "properly_sorted",
    address: defaultAddress || "15A Awolowo Road, Wuse Zone 2, Abuja",
    addressLabel: "",
    pickupInstructions: "",
    scheduleWindow: "today",
    priceBreakdown: null,
    ecopointsToApply: 0,
    paymentMethod: "card",
    currentStep: 0,
  };
}

// ─── Draft Actions ────────────────────────────────────────────

export type DraftAction =
  | { type: "SET_WASTE_TYPE"; value: WasteType }
  | { type: "SET_PHOTO"; file: File; preview: string }
  | { type: "REMOVE_PHOTO" }
  | { type: "SET_WEIGHT_KG"; kg: number }
  | { type: "SET_SORTING_STATUS"; value: "properly_sorted" | "partially_sorted" | "not_sorted" }
  | { type: "SET_ADDRESS"; address: string; label?: string }
  | { type: "SET_INSTRUCTIONS"; value: string }
  | { type: "SET_SCHEDULE"; value: "today" | "tomorrow" | "week" | "custom" }
  | { type: "SET_PRICE_BREAKDOWN"; value: PriceBreakdown }
  | { type: "SET_ECOPOINTS_TO_APPLY"; points: number }
  | { type: "SET_PAYMENT_METHOD"; value: "card" | "ecopoints" | "transfer" }
  | { type: "GO_TO_STEP"; step: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

export function draftReducer(state: PickupDraft, action: DraftAction): PickupDraft {
  switch (action.type) {
    case "SET_WASTE_TYPE":
      return { ...state, wasteType: action.value };
    case "SET_PHOTO":
      return { ...state, photoFile: action.file, photoPreview: action.preview };
    case "REMOVE_PHOTO":
      return { ...state, photoFile: null, photoPreview: null };
    case "SET_WEIGHT_KG":
      return { ...state, estimatedWeightKg: action.kg };
    case "SET_SORTING_STATUS":
      return { ...state, sortingStatus: action.value };
    case "SET_ADDRESS":
      return { ...state, address: action.address, addressLabel: action.label || state.addressLabel };
    case "SET_INSTRUCTIONS":
      return { ...state, pickupInstructions: action.value };
    case "SET_SCHEDULE":
      return { ...state, scheduleWindow: action.value };
    case "SET_PRICE_BREAKDOWN":
      return { ...state, priceBreakdown: action.value };
    case "SET_ECOPOINTS_TO_APPLY":
      return { ...state, ecopointsToApply: action.points };
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.value };
    case "GO_TO_STEP":
      return { ...state, currentStep: Math.max(0, Math.min(action.step, TOTAL_STEPS - 1)) };
    case "NEXT_STEP":
      return { ...state, currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1) };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case "RESET":
      return createInitialDraft(state.address);
    default:
      return state;
  }
}

// ─── Validation ───────────────────────────────────────────────

export function canProceed(state: PickupDraft, step: number): boolean {
  switch (step) {
    case 0: // Category
      return state.wasteType !== null;
    case 1: // Photo — optional, can skip
      return true;
    case 2: // Weight
      return state.estimatedWeightKg >= 1 && state.estimatedWeightKg <= 500;
    case 3: // Sorting
      return true;
    case 4: // Address
      return state.address.trim().length >= 5;
    case 5: // Schedule
      return true;
    case 6: // Pricing — auto-calculated
      return state.priceBreakdown !== null;
    case 7: // EcoPoints
      return true;
    case 8: // Payment
      return true;
    default:
      return true;
  }
}

export function getStepError(state: PickupDraft, step: number): string {
  if (canProceed(state, step)) return "";
  switch (step) {
    case 0: return "Select a waste category";
    case 2: return "Enter a valid weight (1-500 kg)";
    case 4: return "Enter a valid pickup address";
    default: return "";
  }
}
