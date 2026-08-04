/**
 * Tydigo Validation Schemas (Zod)
 *
 * All form and API payload validation schemas for the Tydigo platform.
 */

import { z } from "zod";

// ─── Waste Types ──────────────────────────────────────────────

export const wasteTypeSchema = z.enum([
  "plastic",
  "organic",
  "general_waste",
  "paper_cardboard",
  "metal_cans",
  "glass",
  "e_waste",
  "mixed_waste",
]);

export type WasteType = z.infer<typeof wasteTypeSchema>;

// ─── Sorting Status ───────────────────────────────────────────

export const sortingStatusSchema = z.enum([
  "properly_sorted",
  "partially_sorted",
  "not_sorted",
]);

export type SortingStatus = z.infer<typeof sortingStatusSchema>;

// ─── Pickup Draft ─────────────────────────────────────────────

export const pickupDraftSchema = z.object({
  wasteType: wasteTypeSchema,
  estimatedWeightKg: z.number().min(1, "Weight must be at least 1kg").max(500, "Too heavy — contact support"),
  sortingStatus: sortingStatusSchema.default("properly_sorted"),
  photoPath: z.string().optional(),
  photoFile: z.instanceof(File).optional(),
  address: z.string().min(5, "Enter a valid pickup address"),
  addressLabel: z.string().optional(),
  pickupInstructions: z.string().max(300, "Instructions too long").optional(),
  scheduleWindow: z.enum(["today", "tomorrow", "week", "custom"]).default("today"),
  scheduledDate: z.string().optional(),
  paymentMethod: z.enum(["card", "ecopoints", "transfer"]).default("card"),
  ecopointsToApply: z.number().min(0).default(0),
});

export type PickupDraft = z.infer<typeof pickupDraftSchema>;

// ─── Weight Input ─────────────────────────────────────────────

export const weightInputSchema = z.object({
  weightKg: z.number().min(1).max(500),
  isCustom: z.boolean().default(false),
});

// ─── Address Form ─────────────────────────────────────────────

export const addressFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  address: z.string().min(5, "Enter a valid address"),
  instructions: z.string().max(300).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().default(false),
});

export type AddressForm = z.infer<typeof addressFormSchema>;

// ─── Payment Request ──────────────────────────────────────────

export const paymentRequestSchema = z.object({
  pickupId: z.string().min(1),
  amountNgn: z.number().positive(),
  method: z.enum(["card", "transfer", "ecopoints"]),
  ecopointsToUse: z.number().min(0).optional(),
});

export type PaymentRequest = z.infer<typeof paymentRequestSchema>;

// ─── EcoPoints Redemption ─────────────────────────────────────

export const ecopointsRedemptionSchema = z.object({
  points: z.number().min(100, "Minimum 100 EcoPoints to redeem"),
  redemptionType: z.enum(["discount", "airtime", "cashback", "donation"]),
});

export type EcopointsRedemption = z.infer<typeof ecopointsRedemptionSchema>;

// ─── Auth ─────────────────────────────────────────────────────

export const phoneSignInSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number").max(15),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6, "Enter the 6-digit code"),
});

export const profileSetupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  role: z.enum(["customer", "business", "collector", "partner"]),
  city: z.string().optional(),
  address: z.string().optional(),
});

export type ProfileSetup = z.infer<typeof profileSetupSchema>;

// ─── Collector ────────────────────────────────────────────────

export const collectorKycSchema = z.object({
  vehicleType: z.string().min(1),
  vehiclePlateNumber: z.string().min(1),
  documentType: z.enum(["national_id", "drivers_license", "voters_card", "passport"]),
  documentUrl: z.string().min(1),
});

// ─── Partner ──────────────────────────────────────────────────

export const partnerMaterialRequestSchema = z.object({
  materialType: z.string().min(1),
  quantityKg: z.number().positive(),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]).optional(),
  qualityRules: z.string().optional(),
  contaminationMaxPct: z.number().min(0).max(100).default(5),
  preferredZones: z.array(z.string()).optional(),
  pricePerKgNgn: z.number().optional(),
});

export type PartnerMaterialRequest = z.infer<typeof partnerMaterialRequestSchema>;

// ─── Complaint ────────────────────────────────────────────────

export const complaintSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(10, "Please describe the issue"),
  evidenceUrls: z.array(z.string()).optional(),
  pickupId: z.string().optional(),
});

// ─── Rating ───────────────────────────────────────────────────

export const ratingSchema = z.object({
  pickupId: z.string().min(1),
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});
