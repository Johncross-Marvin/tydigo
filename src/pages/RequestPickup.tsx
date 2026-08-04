import { useReducer, useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Recycle, Trash2, Camera, Scale, MapPin,
  Clock, CreditCard, CheckCircle2, ChevronRight, ChevronLeft,
  ShoppingBag, Leaf, Droplets, Award, Upload, X, Image,
  ShieldCheck, Banknote, Wallet, Sparkles, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { calculatePrice, formatNaira, type WasteType, type PriceBreakdown } from "@/services/pricing";
import { createPickup, uploadPickupPhoto } from "@/services/pickup";
import { initializePayment } from "@/services/payments";
import {
  draftReducer, createInitialDraft, canProceed, getStepError,
  STEP_LABELS, TOTAL_STEPS, type PickupDraft,
} from "@/stores/pickupDraftStore";

// ─── Waste Type Options ───────────────────────────────────────

const WASTE_OPTIONS: {
  type: WasteType;
  icon: typeof Recycle;
  label: string;
  desc: string;
  colors: string;
}[] = [
  { type: "plastic", icon: Recycle, label: "Plastic", desc: "Bottles, containers, bags", colors: "bg-blue-100 text-blue-600 border-blue-300" },
  { type: "organic", icon: Leaf, label: "Organic", desc: "Food waste, garden waste", colors: "bg-green-100 text-[#145C25] border-green-300" },
  { type: "paper_cardboard", icon: ShoppingBag, label: "Paper/Cardboard", desc: "Cardboard, newspapers", colors: "bg-amber-100 text-amber-600 border-amber-300" },
  { type: "metal_cans", icon: Trash2, label: "Metal/Cans", desc: "Cans, foil, scrap", colors: "bg-purple-100 text-purple-600 border-purple-300" },
  { type: "glass", icon: Droplets, label: "Glass", desc: "Bottles, jars, windows", colors: "bg-teal-100 text-teal-600 border-teal-300" },
  { type: "e_waste", icon: Sparkles, label: "E-Waste", desc: "Electronics, batteries", colors: "bg-red-100 text-red-600 border-red-300" },
  { type: "general_waste", icon: Trash2, label: "General Waste", desc: "Household trash", colors: "bg-gray-100 text-gray-600 border-gray-300" },
  { type: "mixed_waste", icon: AlertCircle, label: "Mixed Waste", desc: "Unsorted mixed waste", colors: "bg-orange-100 text-orange-600 border-orange-300" },
];

const WEIGHT_PRESETS = [
  { kg: 3, label: "1–5 kg" },
  { kg: 8, label: "6–10 kg" },
  { kg: 15, label: "11–20 kg" },
  { kg: 30, label: "21–40 kg" },
  { kg: 50, label: "40kg+" },
];

const SCHEDULE_OPTIONS = [
  { label: "Today", sub: "Within 2 hours", value: "today" as const },
  { label: "Tomorrow", sub: "Morning slot", value: "tomorrow" as const },
  { label: "This Week", sub: "Choose a day", value: "week" as const },
  { label: "Custom", sub: "Pick date & time", value: "custom" as const },
];

const SORTING_OPTIONS = [
  { value: "properly_sorted" as const, label: "Properly Sorted", desc: "Waste is clean and separated by type", icon: ShieldCheck, badge: "EcoPoints Eligible" },
  { value: "partially_sorted" as const, label: "Partially Sorted", desc: "Some separation done, but not perfect", icon: CheckCircle2, badge: "Partial Points" },
  { value: "not_sorted" as const, label: "Not Sorted / Mixed", desc: "Mixed waste, no separation", icon: AlertCircle, badge: "+15% surcharge may apply" },
];

// ─── Component ────────────────────────────────────────────────

const RequestPickupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, dispatch] = useReducer(draftReducer, createInitialDraft(user?.address || ""));
  const [error, setError] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [createdPickup, setCreatedPickup] = useState<{
    pickupCode: string;
    finalTotalNgn: number;
    wasteType: string;
    estimatedWeightKg: number;
    address: string;
  } | null>(null);

  // Auto-calculate pricing whenever relevant fields change
  useEffect(() => {
    if (draft.wasteType && draft.estimatedWeightKg > 0) {
      const breakdown = calculatePrice({
        weightKg: draft.estimatedWeightKg,
        wasteType: draft.wasteType,
        ecopointsToApply: draft.ecopointsToApply,
      });
      dispatch({ type: "SET_PRICE_BREAKDOWN", value: breakdown });
    }
  }, [draft.wasteType, draft.estimatedWeightKg, draft.ecopointsToApply]);

  // ── Mutations ────────────────────────────────────────────

  const pickupMutation = useMutation({
    mutationFn: async () => {
      if (!draft.wasteType || !user) throw new Error("Missing required fields");

      // Upload photo first if available
      let photoPath: string | undefined;
      if (draft.photoFile) {
        const tempPickupId = `draft-${Date.now()}`;
        const result = await uploadPickupPhoto(user.id, tempPickupId, draft.photoFile);
        photoPath = result;
      }

      // Create pickup
      const pickup = await createPickup(user, {
        wasteType: draft.wasteType,
        estimatedWeightKg: draft.estimatedWeightKg,
        sortingStatus: draft.sortingStatus,
        photoPath,
        address: draft.address,
        addressLabel: draft.addressLabel || undefined,
        pickupInstructions: draft.pickupInstructions || undefined,
        scheduleWindow: draft.scheduleWindow,
        ecopointsToApply: draft.ecopointsToApply,
        paymentMethod: draft.paymentMethod,
      });

      // If paying by card, initialize payment
      if (draft.paymentMethod === "card") {
        const payment = await initializePayment({
          userId: user.id,
          pickupId: pickup.id,
          amountNgn: pickup.finalTotalNgn,
          email: user.phone ? `${user.phone}@tydigo.com` : undefined,
        });

        if (payment.status === "paid") {
          pickup.paymentStatus = "paid";
        }
      }

      return pickup;
    },
    onSuccess: (pickup) => {
      setCreatedPickup({
        pickupCode: pickup.pickupCode,
        finalTotalNgn: pickup.finalTotalNgn,
        wasteType: pickup.wasteType,
        estimatedWeightKg: pickup.estimatedWeightKg,
        address: pickup.address,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pickups"] });
      dispatch({ type: "GO_TO_STEP", step: TOTAL_STEPS }); // Show confirmation
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to create pickup. Please try again.");
    },
  });

  // ── Navigation ───────────────────────────────────────────

  const nextStep = useCallback(() => {
    setError("");
    if (!canProceed(draft, draft.currentStep)) {
      setError(getStepError(draft, draft.currentStep));
      return;
    }
    if (draft.currentStep === TOTAL_STEPS - 1) {
      pickupMutation.mutate();
      return;
    }
    dispatch({ type: "NEXT_STEP" });
  }, [draft, pickupMutation]);

  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);

  // ── Photo Handling ───────────────────────────────────────

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    dispatch({ type: "SET_PHOTO", file, preview });
  }, []);

  const handleRemovePhoto = useCallback(() => {
    if (draft.photoPreview) URL.revokeObjectURL(draft.photoPreview);
    dispatch({ type: "REMOVE_PHOTO" });
  }, [draft.photoPreview]);

  // ── Tracking Navigation ──────────────────────────────────

  const handleGoToTracking = useCallback(() => {
    navigate("/household/tracking");
  }, [navigate]);

  // ── Render ───────────────────────────────────────────────

  const { currentStep, priceBreakdown } = draft;
  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100;
  const isSubmitting = pickupMutation.isPending;
  const isConfirmed = createdPickup !== null;
  const stepLabel = currentStep < TOTAL_STEPS ? STEP_LABELS[currentStep] : "Done";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-neutral-900 text-sm">Request Pickup</h1>
          {!isConfirmed && (
            <p className="text-xs text-neutral-500">{stepLabel} — Step {Math.min(currentStep + 1, TOTAL_STEPS)} of {TOTAL_STEPS}</p>
          )}
        </div>
        {!isConfirmed && (
          <Badge className="bg-brand-100 text-brand-700 text-xs">
            {Math.round(progressPct)}%
          </Badge>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Progress bar */}
        {!isConfirmed && (
          <Progress value={progressPct} className="h-2 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]" />
        )}

        {/* Step Content */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {!isConfirmed && (
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} className="rounded-xl" disabled={isSubmitting}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={isSubmitting}
              className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand disabled:opacity-50"
            >
              {isSubmitting
                ? "Processing..."
                : currentStep === TOTAL_STEPS - 1
                  ? `Confirm — ${priceBreakdown ? formatNaira(priceBreakdown.finalTotalNgn) : ""}`
                  : "Continue"}
              {!isSubmitting && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </main>
    </div>
  );

  // ── Step Renderer ────────────────────────────────────────

  function renderStep() {
    if (isConfirmed && createdPickup) {
      return renderConfirmation();
    }

    switch (currentStep) {
      case 0: return renderWasteCategory();
      case 1: return renderPhotoUpload();
      case 2: return renderWeightEstimation();
      case 3: return renderSortingVerification();
      case 4: return renderAddressConfirmation();
      case 5: return renderSchedule();
      case 6: return renderPricingBreakdown();
      case 7: return renderEcoPointsDiscount();
      case 8: return renderPaymentMethod();
      default: return null;
    }
  }

  // ── Step 0: Waste Category ──────────────────────────────

  function renderWasteCategory() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Select Waste Category</h2>
        <p className="text-sm text-neutral-500">Choose the type of waste for pickup</p>
        <div className="grid gap-3">
          {WASTE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => dispatch({ type: "SET_WASTE_TYPE", value: opt.type })}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                draft.wasteType === opt.type
                  ? `${opt.colors} border-2 shadow-brand`
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${opt.colors.split(" ")[0]} ${opt.colors.split(" ")[1]} flex items-center justify-center`}>
                <opt.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900">{opt.label}</p>
                <p className="text-sm text-neutral-500">{opt.desc}</p>
              </div>
              {draft.wasteType === opt.type && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 1: Photo Upload ────────────────────────────────

  function renderPhotoUpload() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Upload Waste Photo</h2>
        <p className="text-sm text-neutral-500">Take a clear photo of your waste for verification</p>

        {draft.photoPreview ? (
          <div className="relative rounded-2xl overflow-hidden bg-neutral-100">
            <img src={draft.photoPreview} alt="Waste preview" className="w-full h-64 object-cover" />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-3 right-3 flex gap-2">
              <Badge className="bg-green-500/90 text-white border-0">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Photo ready
              </Badge>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-48 rounded-2xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-3 hover:border-[#145C25] hover:bg-green-50/50 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
              <Camera className="w-8 h-8 text-neutral-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-neutral-700">Take or upload a photo</p>
              <p className="text-sm text-neutral-500 mt-1">Clear photos help with weight estimation</p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
          <Image className="w-4 h-4 flex-shrink-0" />
          Photos help collectors verify your waste type and earn EcoPoints.
        </div>
      </div>
    );
  }

  // ── Step 2: Weight Estimation ───────────────────────────

  function renderWeightEstimation() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Estimated Weight</h2>
        <p className="text-sm text-neutral-500">Approximately how much waste do you have?</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WEIGHT_PRESETS.map((preset) => (
            <button
              key={preset.kg}
              onClick={() => dispatch({ type: "SET_WEIGHT_KG", kg: preset.kg })}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                draft.estimatedWeightKg === preset.kg
                  ? "border-[#145C25] bg-green-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Scale className={`w-6 h-6 mx-auto mb-2 ${draft.estimatedWeightKg === preset.kg ? "text-[#145C25]" : "text-neutral-400"}`} />
              <p className="font-bold text-neutral-900 text-lg">{preset.kg} kg</p>
              <p className="text-xs text-neutral-500">{preset.label}</p>
            </button>
          ))}
        </div>

        {/* Custom weight */}
        <div className="p-4 rounded-2xl bg-neutral-50 space-y-2">
          <p className="text-sm font-semibold text-neutral-700">Or enter custom weight</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={500}
              placeholder="Custom kg"
              value={customWeight}
              onChange={(e) => {
                setCustomWeight(e.target.value);
                const kg = Number(e.target.value);
                if (kg >= 1 && kg <= 500) {
                  dispatch({ type: "SET_WEIGHT_KG", kg });
                }
              }}
              className="rounded-xl"
            />
            <span className="text-sm text-neutral-500 font-medium">kg</span>
          </div>
        </div>

        {draft.wasteType && (
          <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Estimated price: <strong>{formatNaira(calculatePrice({ weightKg: draft.estimatedWeightKg, wasteType: draft.wasteType }).finalTotalNgn)}</strong>
            <span className="text-green-500">(approx.)</span>
          </div>
        )}
      </div>
    );
  }

  // ── Step 3: Sorting Verification ────────────────────────

  function renderSortingVerification() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Sorting Status</h2>
        <p className="text-sm text-neutral-500">How well is your waste sorted?</p>

        <div className="space-y-3">
          {SORTING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => dispatch({ type: "SET_SORTING_STATUS", value: opt.value })}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                draft.sortingStatus === opt.value
                  ? "border-[#145C25] bg-green-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                draft.sortingStatus === opt.value ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-500"
              }`}>
                <opt.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900">{opt.label}</p>
                <p className="text-sm text-neutral-500">{opt.desc}</p>
              </div>
              <Badge className={
                opt.value === "properly_sorted" ? "bg-green-100 text-green-700" :
                opt.value === "partially_sorted" ? "bg-amber-100 text-amber-700" :
                "bg-orange-100 text-orange-700"
              }>
                {opt.badge}
              </Badge>
            </button>
          ))}
        </div>

        {draft.sortingStatus === "not_sorted" && (
          <div className="p-3 bg-orange-50 rounded-xl text-sm text-orange-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Mixed waste may incur a 15% surcharge. Sort your waste to save money and earn EcoPoints!
          </div>
        )}
      </div>
    );
  }

  // ── Step 4: Address Confirmation ────────────────────────

  function renderAddressConfirmation() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Pickup Address</h2>
        <p className="text-sm text-neutral-500">Where should the collector come?</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Address Label</label>
            <Input
              placeholder="Home, Office, etc."
              value={draft.addressLabel}
              onChange={(e) => dispatch({ type: "SET_ADDRESS", address: draft.address, label: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Full Address</label>
            <Textarea
              placeholder="15A Awolowo Road, Wuse Zone 2, Abuja"
              value={draft.address}
              onChange={(e) => dispatch({ type: "SET_ADDRESS", address: e.target.value })}
              className="rounded-xl min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Pickup Instructions (optional)</label>
            <Textarea
              placeholder="Gate code, floor number, landmarks..."
              value={draft.pickupInstructions}
              onChange={(e) => dispatch({ type: "SET_INSTRUCTIONS", value: e.target.value })}
              className="rounded-xl"
              maxLength={300}
            />
            <p className="text-xs text-neutral-400 mt-1">{draft.pickupInstructions.length}/300</p>
          </div>
        </div>

        <div className="p-3 bg-neutral-100 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-[#145C25] mx-auto mb-1" />
            <p className="text-sm text-neutral-600">Current city: Abuja, FCT</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 5: Schedule ────────────────────────────────────

  function renderSchedule() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Schedule Pickup</h2>
        <p className="text-sm text-neutral-500">When should we come?</p>
        <div className="grid grid-cols-2 gap-3">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => dispatch({ type: "SET_SCHEDULE", value: opt.value })}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                draft.scheduleWindow === opt.value
                  ? "border-[#145C25] bg-green-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Clock className={`w-5 h-5 mb-2 ${draft.scheduleWindow === opt.value ? "text-[#145C25]" : "text-neutral-400"}`} />
              <p className="font-bold text-neutral-900 text-sm">{opt.label}</p>
              <p className="text-xs text-neutral-500">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 6: Pricing Breakdown ───────────────────────────

  function renderPricingBreakdown() {
    if (!priceBreakdown) {
      return (
        <div className="text-center py-8">
          <p className="text-neutral-500">Calculating price...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Price Breakdown</h2>
        <p className="text-sm text-neutral-500">Based on {draft.estimatedWeightKg}kg of {draft.wasteType?.replace(/_/g, " ")}</p>

        <div className="space-y-2 p-4 bg-neutral-50 rounded-2xl">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Base price</span>
            <span className="font-semibold">{formatNaira(priceBreakdown.basePriceNgn)}</span>
          </div>
          {priceBreakdown.wasteModifierNgn !== 0 && (
            <div className="flex justify-between text-sm">
              <span className={priceBreakdown.wasteModifierPercent < 0 ? "text-green-600" : "text-orange-600"}>
                Waste modifier ({priceBreakdown.wasteModifierPercent > 0 ? "+" : ""}{priceBreakdown.wasteModifierPercent}%)
              </span>
              <span className={`font-semibold ${priceBreakdown.wasteModifierPercent < 0 ? "text-green-600" : "text-orange-600"}`}>
                {priceBreakdown.wasteModifierPercent < 0 ? "-" : "+"}{formatNaira(Math.abs(priceBreakdown.wasteModifierNgn))}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Platform fee (10%)</span>
            <span className="font-semibold">{formatNaira(priceBreakdown.platformFeeNgn)}</span>
          </div>
          {priceBreakdown.ecopointsDiscountNgn > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">EcoPoints discount</span>
              <span className="font-semibold text-green-600">-{formatNaira(priceBreakdown.ecopointsDiscountNgn)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-200">
            <span>Total</span>
            <span className="text-[#145C25] text-lg">{formatNaira(priceBreakdown.finalTotalNgn)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 7: EcoPoints Discount ──────────────────────────

  function renderEcoPointsDiscount() {
    const availablePoints = user?.ecopoints ?? 0;
    const maxDiscount = priceBreakdown
      ? Math.min(
          availablePoints,
          Math.floor(priceBreakdown.subtotalNgn * 0.5 / 0.10) // Max 50% of subtotal
        )
      : 0;

    const presets = [0, 500, 1000, 2000, 5000].filter((p) => p <= availablePoints);

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Apply EcoPoints</h2>
        <p className="text-sm text-neutral-500">
          Available: <strong className="text-[#145C25]">{availablePoints.toLocaleString()} pts</strong> (₦{(availablePoints * 0.10).toFixed(0)} value)
        </p>

        <div className="flex flex-wrap gap-2">
          {presets.map((pts) => (
            <button
              key={pts}
              onClick={() => dispatch({ type: "SET_ECOPOINTS_TO_APPLY", points: pts })}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                draft.ecopointsToApply === pts
                  ? "border-[#145C25] bg-green-50 text-[#145C25]"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {pts === 0 ? "None" : `${pts.toLocaleString()} pts`}
              {pts > 0 && <span className="block text-xs text-neutral-400">₦{(pts * 0.10).toFixed(0)} off</span>}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="p-3 rounded-xl bg-neutral-50">
          <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Or enter custom amount</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={availablePoints}
              placeholder="0"
              value={draft.ecopointsToApply || ""}
              onChange={(e) => {
                const val = Math.min(Number(e.target.value) || 0, availablePoints);
                dispatch({ type: "SET_ECOPOINTS_TO_APPLY", points: val });
              }}
              className="rounded-xl"
            />
            <span className="text-sm text-neutral-500">pts</span>
          </div>
        </div>

        {draft.ecopointsToApply > 0 && priceBreakdown && (
          <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            You'll save <strong>{formatNaira(draft.ecopointsToApply * 0.10)}</strong> using {draft.ecopointsToApply.toLocaleString()} EcoPoints
          </div>
        )}
      </div>
    );
  }

  // ── Step 8: Payment Method ──────────────────────────────

  function renderPaymentMethod() {
    const paymentTotal = priceBreakdown?.finalTotalNgn ?? 0;
    const ecoPointsDiscount = priceBreakdown?.ecopointsDiscountNgn ?? 0;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Payment Method</h2>

        <div className="space-y-3">
          <button
            onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", value: "card" })}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              draft.paymentMethod === "card"
                ? "border-[#145C25] bg-green-50"
                : "border-neutral-200 hover:border-[#145C25]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-neutral-900 text-sm">Pay with Card</p>
              <p className="text-xs text-neutral-500">Visa, Mastercard, Verve • Instant</p>
            </div>
            {draft.paymentMethod === "card" && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
          </button>

          <button
            onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", value: "ecopoints" })}
            disabled={ecoPointsDiscount <= 0}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              draft.paymentMethod === "ecopoints"
                ? "border-[#145C25] bg-green-50"
                : "border-neutral-200 hover:border-[#145C25]"
            } ${ecoPointsDiscount <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-neutral-900 text-sm">Pay with EcoPoints</p>
              <p className="text-xs text-neutral-500">
                {ecoPointsDiscount > 0
                  ? `Save ${formatNaira(ecoPointsDiscount)} with your points`
                  : "Apply EcoPoints discount first"}
              </p>
            </div>
            {draft.paymentMethod === "ecopoints" && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
          </button>

          <button
            onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", value: "transfer" })}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              draft.paymentMethod === "transfer"
                ? "border-[#145C25] bg-green-50"
                : "border-neutral-200 hover:border-[#145C25]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-neutral-900 text-sm">Pay on Pickup</p>
              <p className="text-xs text-neutral-500">Cash or transfer when collector arrives</p>
            </div>
            {draft.paymentMethod === "transfer" && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
          </button>
        </div>

        {/* Payment summary */}
        <div className="p-4 bg-neutral-50 rounded-2xl space-y-2">
          <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-200">
            <span>Amount to pay</span>
            <span className="text-[#145C25] text-lg">{formatNaira(paymentTotal)}</span>
          </div>
          {draft.paymentMethod === "ecopoints" && (
            <p className="text-xs text-amber-600">Paid entirely with EcoPoints</p>
          )}
        </div>
      </div>
    );
  }

  // ── Confirmation Screen ─────────────────────────────────

  function renderConfirmation() {
    if (!createdPickup) return null;

    return (
      <div className="text-center py-6 space-y-5">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900">Pickup Confirmed!</h2>
          <p className="text-neutral-500 mt-1">Your collector will be assigned shortly</p>
        </div>

        {/* Pickup code card */}
        <div className="bg-gradient-to-br from-[#0A2F14] to-[#145C25] rounded-2xl p-5 text-white">
          <p className="text-xs text-white/60 uppercase tracking-wider">Pickup Code</p>
          <p className="text-3xl font-black tracking-widest mt-1">{createdPickup.pickupCode}</p>
          <p className="text-xs text-white/60 mt-3">Share this code with your collector</p>
        </div>

        {/* Details */}
        <div className="bg-neutral-50 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Waste Type</span>
            <span className="font-semibold capitalize">{createdPickup.wasteType.replace(/_/g, " ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Weight</span>
            <span className="font-semibold">{createdPickup.estimatedWeightKg} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Address</span>
            <span className="font-semibold text-right max-w-[180px] truncate">{createdPickup.address}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Payment</span>
            <span className="font-semibold capitalize">{draft.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-neutral-200">
            <span className="text-neutral-500">Total</span>
            <span className="font-semibold text-[#145C25] text-lg">{formatNaira(createdPickup.finalTotalNgn)}</span>
          </div>
        </div>

        {/* EcoPoints earned */}
        <div className="p-4 bg-amber-50 rounded-2xl flex items-center gap-3">
          <Award className="w-6 h-6 text-amber-500" />
          <div className="text-left">
            <p className="font-bold text-amber-700">+{Math.max(100, Math.round(createdPickup.finalTotalNgn * 0.1))} EcoPoints earned!</p>
            <p className="text-xs text-amber-600">Points will be confirmed after pickup completion</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => {
              dispatch({ type: "RESET" });
              setCreatedPickup(null);
              setError("");
            }}
          >
            New Pickup
          </Button>
          <Button
            onClick={handleGoToTracking}
            className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand"
          >
            Track Collector
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }
};

export default RequestPickupPage;
