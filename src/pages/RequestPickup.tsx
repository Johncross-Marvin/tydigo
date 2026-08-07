/**
 * Tydigo Request Pickup — Full Multi-Step Flow
 *
 * Step 1: Waste Type → Step 2: Photo → Step 3: Weight
 * → Step 4: Sorting → Step 5: Address → Step 6: Schedule
 * → Step 7: Pricing → Step 8: EcoPoints → Step 9: Payment & Confirm
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, MapPin, Camera, Clock, CreditCard,
  CheckCircle2, Plus, X, Award, Trash2, Info, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { createPickup, type PickupDraftInput } from "@/services/pickup";
import { uploadDraftPhoto, associateDraftPhotos } from "@/services/storage";
import { calculatePrice, formatNaira, type WasteType } from "@/services/pricing";
import { getAddresses, type Address } from "@/services/address";
import { initializePayment } from "@/services/payments";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { toast } from "sonner";

const STEPS = [
  "Waste", "Photo", "Weight", "Sorting", "Address",
  "Schedule", "Pricing", "EcoPoints", "Confirm",
];

type WasteCategory = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  is_recyclable: boolean;
  eco_points_per_kg: number;
  type: string;
};

const WEIGHT_PRESETS = [1, 5, 10, 20, 40];

const RequestPickupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [categories, setCategories] = useState<WasteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [draftId] = useState(() => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [estimatedWeight, setEstimatedWeight] = useState(5);
  const [customWeight, setCustomWeight] = useState("");
  const [sortingStatus, setSortingStatus] = useState<"properly_sorted" | "partially_sorted" | "not_sorted">("properly_sorted");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [scheduleType, setScheduleType] = useState<"asap" | "later">("asap");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [ecopointsToApply, setEcopointsToApply] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Load data
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAddresses(user.id),
      isSupabaseAvailable() && supabase
        ? supabase.from("waste_categories").select("*").order("name").then(({ data }) => data as WasteCategory[])
        : Promise.resolve([]),
    ]).then(([addrs, cats]) => {
      setAddresses(addrs);
      setCategories(cats || []);
      if (addrs.length > 0) setSelectedAddress(addrs.find((a) => a.is_default) || addrs[0]);
      setLoading(false);
    });
  }, [user]);

  // Derive waste type from selected categories
  const wasteType: WasteType = selectedCategories.length === 0
    ? "general_waste"
    : selectedCategories.length > 1
      ? "mixed_waste"
      : (categories.find((c) => c.id === selectedCategories[0])?.type as WasteType) || "general_waste";

  // Calculate pricing
  const pricing = calculatePrice({
    weightKg: estimatedWeight,
    wasteType,
    ecopointsToApply,
  });

  // Available EcoPoints
  const availableEcopoints = user?.ecopoints || 0;
  const maxEcopointsDiscount = Math.round(
    pricing.subtotalNgn * 0.5 / 0.1
  ); // 50% max discount

  // Photo upload handler — uses draft storage (no pickup record needed yet)
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const { url } = await uploadDraftPhoto(user.id, draftId, file);
      setPhotos((prev) => [...prev, url]);
    } catch (err) {
      toast.error("Failed to upload photo. Please try again.");
    }
    setUploadingPhoto(false);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  }, [user, draftId]);

  // Submit handler
  const handleSubmit = async () => {
    if (!user || !selectedAddress) return;
    setSubmitting(true);

    const addressStr = [
      selectedAddress.street,
      selectedAddress.city,
      selectedAddress.state,
    ].filter(Boolean).join(", ");

    const draft: PickupDraftInput = {
      wasteType,
      estimatedWeightKg: estimatedWeight,
      sortingStatus,
      photoPath: photos[0] || undefined,
      address: addressStr,
      addressLabel: selectedAddress.label,
      pickupInstructions: pickupInstructions || undefined,
      scheduleWindow: scheduleType === "asap" ? "ASAP" : `${scheduledDate} ${scheduledTime}`,
      ecopointsToApply,
      paymentMethod,
    };

    try {
      // Step 1: Create pickup
      const result = await createPickup(user, draft);

      // Step 2: Associate draft photos with the real pickup
      if (photos.length > 0) {
        try {
          await associateDraftPhotos(user.id, draftId, result.id);
        } catch (photoErr) {
          console.warn("Failed to associate photos:", photoErr);
          // Non-blocking — pickup is created, photos can be re-uploaded
        }
      }

      // Step 3: Process payment if card
      if (paymentMethod === "card") {
        setPaymentProcessing(true);
        const payment = await initializePayment({
          userId: user.id,
          pickupId: result.id,
          amountNgn: result.finalTotalNgn,
          email: (user as Record<string, unknown>).email as string,
        });

        if (payment.status === "paid") {
          toast.success("Payment successful! Pickup confirmed.");
          navigate(`/household/tracking?id=${result.id}`, { replace: true });
        } else if (payment.authorizationUrl) {
          // Redirect to Paystack
          window.location.href = payment.authorizationUrl;
        } else {
          toast.success("Pickup created! Proceed to payment.");
          navigate(`/household/payment?pickupId=${result.id}`, { replace: true });
        }
      } else {
        // Pay on pickup
        toast.success("Pickup scheduled! Pay on arrival.");
        navigate(`/household/tracking?id=${result.id}`, { replace: true });
      }
    } catch (err) {
      console.error("Failed to create pickup:", err);
      toast.error("Failed to create pickup. Please try again.");
    }
    setSubmitting(false);
    setPaymentProcessing(false);
  };

  // Step validation
  const canContinue = (): boolean => {
    switch (step) {
      case 0: return selectedCategories.length > 0;
      case 1: return true; // Photo is optional
      case 2: return estimatedWeight >= 1 && estimatedWeight <= 500;
      case 3: return true;
      case 4: return selectedAddress !== null;
      case 5: return scheduleType === "asap" || (!!scheduledDate && !!scheduledTime);
      case 6: return true;
      case 7: return true;
      case 8: return true;
      default: return true;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900 flex-1">Request Pickup</h1>
        <span className="text-sm font-semibold text-[#145C25]">Step {step + 1}/{STEPS.length}</span>
      </header>

      {/* Progress */}
      <div className="px-4 py-3 bg-white border-b border-neutral-100">
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-[10px] font-semibold hidden sm:block ${i <= step ? "text-[#145C25]" : "text-neutral-300"}`}>
              {s}
            </span>
          ))}
          <span className="text-[10px] font-semibold sm:hidden text-[#145C25]">{STEPS[step]}</span>
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4 pb-24">
        {/* Step 1: Waste Type Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">What are you disposing?</h2>
            <p className="text-neutral-500 text-sm">Select all that apply. Proper sorting earns more EcoPoints!</p>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategories((prev) =>
                      prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                    )}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      isSelected ? "border-[#145C25] bg-green-50 shadow-sm" : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon || "🗑️"}</div>
                    <p className="font-bold text-neutral-900 text-sm">{cat.name}</p>
                    {cat.is_recyclable && (
                      <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">+{cat.eco_points_per_kg} pts/kg</Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {categories.length === 0 && (
              <div className="text-center py-8 text-neutral-400">
                <p>Waste categories not loaded.</p>
                <p className="text-xs mt-1">Using default categories.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Photo Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Upload Photos</h2>
            <p className="text-neutral-500 text-sm">
              Help the collector identify your waste. Photos improve pricing accuracy and earn bonus EcoPoints.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                  <img src={url} alt={`Waste ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-2 hover:border-[#145C25] transition-colors"
              >
                {uploadingPhoto ? (
                  <div className="h-8 w-8 rounded-full border-2 border-green-100 border-t-[#145C25] animate-spin" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-neutral-400" />
                    <span className="text-xs text-neutral-500 font-semibold">Add Photo</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            {photos.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-xs">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Photos are optional but recommended. Clear photos help collectors prepare and may earn you bonus EcoPoints.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Weight Estimation */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Estimated Weight</h2>
            <p className="text-neutral-500 text-sm">How much waste do you have? This helps us price your pickup accurately.</p>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {WEIGHT_PRESETS.map((w) => (
                <button
                  key={w}
                  onClick={() => { setEstimatedWeight(w); setCustomWeight(""); }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    estimatedWeight === w && !customWeight
                      ? "bg-[#145C25] text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {w === 40 ? "40kg+" : `${w}kg`}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-neutral-50 px-3 text-xs text-neutral-400 font-medium">or enter custom</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setEstimatedWeight(Math.max(1, estimatedWeight - 1))}
                className="w-12 h-12 rounded-xl bg-neutral-100 font-bold text-lg hover:bg-neutral-200"
              >
                −
              </button>
              <Input
                type="number"
                value={customWeight || estimatedWeight}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setCustomWeight(e.target.value);
                  if (val >= 1 && val <= 500) setEstimatedWeight(val);
                }}
                className="text-center text-xl font-bold rounded-xl flex-1"
                min={1}
                max={500}
                placeholder="kg"
              />
              <button
                onClick={() => setEstimatedWeight(Math.min(500, estimatedWeight + 1))}
                className="w-12 h-12 rounded-xl bg-neutral-100 font-bold text-lg hover:bg-neutral-200"
              >
                +
              </button>
            </div>
            <p className="text-xs text-neutral-400 text-center">
              {estimatedWeight}kg estimated • Max 500kg per pickup
            </p>
          </div>
        )}

        {/* Step 4: Sorting Verification */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Sorting Status</h2>
            <p className="text-neutral-500 text-sm">
              Properly sorted waste earns EcoPoints and may qualify for discounts. Mixed waste incurs a surcharge.
            </p>

            <div className="space-y-3">
              {([
                {
                  value: "properly_sorted" as const,
                  title: "Properly Sorted",
                  desc: "Waste is separated by type (plastic, organic, etc.)",
                  icon: "✅",
                  badge: "EcoPoints eligible",
                  badgeColor: "bg-green-100 text-green-700",
                },
                {
                  value: "partially_sorted" as const,
                  title: "Partially Sorted",
                  desc: "Some separation done but not complete",
                  icon: "⚠️",
                  badge: "Reduced EcoPoints",
                  badgeColor: "bg-amber-100 text-amber-700",
                },
                {
                  value: "not_sorted" as const,
                  title: "Not Sorted / Mixed",
                  desc: "All waste mixed together",
                  icon: "❌",
                  badge: "15% surcharge applies",
                  badgeColor: "bg-red-100 text-red-700",
                },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortingStatus(opt.value)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    sortingStatus === opt.value
                      ? "border-[#145C25] bg-green-50 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-neutral-900">{opt.title}</p>
                      <Badge className={`text-xs ${opt.badgeColor}`}>{opt.badge}</Badge>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{opt.desc}</p>
                  </div>
                  {sortingStatus === opt.value && (
                    <CheckCircle2 className="w-5 h-5 text-[#145C25] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Address Confirmation */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Pickup Address</h2>
            {addresses.length > 0 ? (
              <>
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedAddress?.id === addr.id
                        ? "border-[#145C25] bg-green-50 shadow-sm"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#145C25]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 text-sm">{addr.label}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {[addr.street, addr.city, addr.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    {selectedAddress?.id === addr.id && (
                      <CheckCircle2 className="w-5 h-5 text-[#145C25] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No saved addresses</p>
              </div>
            )}
            <Link
              to="/household/profile/addresses"
              className="flex items-center gap-2 text-sm font-semibold text-[#145C25] hover:underline"
            >
              <Plus className="w-4 h-4" /> Add New Address
            </Link>

            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">
                Pickup Instructions (optional)
              </label>
              <Input
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                className="rounded-xl"
                placeholder="E.g., gate code, landmark, floor number..."
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* Step 6: Schedule */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Pickup Time</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScheduleType("asap")}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  scheduleType === "asap"
                    ? "border-[#145C25] bg-green-50 shadow-sm"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <Clock className="w-8 h-8 text-[#145C25] mx-auto mb-2" />
                <p className="font-bold text-neutral-900">ASAP</p>
                <p className="text-xs text-neutral-500">Within 30–60 min</p>
              </button>
              <button
                onClick={() => setScheduleType("later")}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  scheduleType === "later"
                    ? "border-[#145C25] bg-green-50 shadow-sm"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <Clock className="w-8 h-8 text-[#145C25] mx-auto mb-2" />
                <p className="font-bold text-neutral-900">Schedule</p>
                <p className="text-xs text-neutral-500">Pick a date & time</p>
              </button>
            </div>
            {scheduleType === "later" && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-xl"
                  min={new Date().toISOString().split("T")[0]}
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 7: Pricing Breakdown */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Price Breakdown</h2>
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Base price ({estimatedWeight}kg)</span>
                  <span className="font-semibold">{formatNaira(pricing.basePriceNgn)}</span>
                </div>
                {pricing.wasteModifierNgn !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">
                      Waste modifier ({pricing.wasteModifierPercent > 0 ? "+" : ""}{pricing.wasteModifierPercent}%)
                    </span>
                    <span className={`font-semibold ${pricing.wasteModifierNgn > 0 ? "text-red-600" : "text-green-600"}`}>
                      {pricing.wasteModifierNgn > 0 ? "+" : ""}{formatNaira(pricing.wasteModifierNgn)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Platform fee ({pricing.platformFeePercent}%)</span>
                  <span className="font-semibold">{formatNaira(pricing.platformFeeNgn)}</span>
                </div>
                {ecopointsToApply > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>EcoPoints discount ({pricing.ecopointsApplied} pts)</span>
                    <span className="font-semibold">−{formatNaira(pricing.ecopointsDiscountNgn)}</span>
                  </div>
                )}
                <hr className="border-neutral-200" />
                <div className="flex justify-between text-lg font-extrabold">
                  <span>Total</span>
                  <span className="text-[#145C25]">{formatNaira(pricing.finalTotalNgn)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-xs">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>All payments are secure. You can apply EcoPoints in the next step for a discount.</span>
            </div>
          </div>
        )}

        {/* Step 8: EcoPoints Discount */}
        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Apply EcoPoints</h2>
            <p className="text-neutral-500 text-sm">
              Use your EcoPoints to reduce the pickup cost. 100 EcoPoints = ₦10 discount.
            </p>

            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-neutral-900">Your Balance</span>
                  </div>
                  <span className="font-extrabold text-lg text-amber-600">
                    {availableEcopoints.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Value</span>
                  <span className="font-semibold">{formatNaira(availableEcopoints * 0.1)}</span>
                </div>
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">
                EcoPoints to apply
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={ecopointsToApply || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setEcopointsToApply(Math.min(val, availableEcopoints, maxEcopointsDiscount));
                  }}
                  className="rounded-xl flex-1"
                  placeholder="0"
                  min={0}
                  max={Math.min(availableEcopoints, maxEcopointsDiscount)}
                />
                <span className="text-sm text-neutral-500 font-semibold">pts</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[0, 100, 500, 1000].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => setEcopointsToApply(Math.min(pts, availableEcopoints, maxEcopointsDiscount))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      ecopointsToApply === pts
                        ? "bg-amber-500 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {pts === 0 ? "None" : `${pts} pts`}
                  </button>
                ))}
              </div>
            </div>

            {ecopointsToApply > 0 && (
              <Card className="border-0 shadow-sm rounded-2xl bg-green-50">
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Discount applied</span>
                    <span className="font-extrabold text-green-700">
                      −{formatNaira(pricing.ecopointsDiscountNgn)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-neutral-600">New total</span>
                    <span className="font-extrabold text-[#145C25]">
                      {formatNaira(pricing.finalTotalNgn)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-100 text-neutral-600 text-xs">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Max 50% discount with EcoPoints. Remaining points stay in your wallet for future use.</span>
            </div>
          </div>
        )}

        {/* Step 9: Confirm & Pay */}
        {step === 9 && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">Confirm Pickup</h2>

            <Card className="border-0 shadow-sm rounded-2xl text-left">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Waste</span>
                  <span className="font-semibold">
                    {selectedCategories.length > 0
                      ? categories.filter((c) => selectedCategories.includes(c.id)).map((c) => c.name).join(", ")
                      : "General Waste"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Weight</span>
                  <span className="font-semibold">~{estimatedWeight}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Sorting</span>
                  <span className="font-semibold">
                    {sortingStatus === "properly_sorted" ? "Properly Sorted" :
                     sortingStatus === "partially_sorted" ? "Partially Sorted" : "Not Sorted"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Address</span>
                  <span className="font-semibold text-right max-w-[60%]">{selectedAddress?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Schedule</span>
                  <span className="font-semibold">
                    {scheduleType === "asap" ? "ASAP" : `${scheduledDate} ${scheduledTime}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Photos</span>
                  <span className="font-semibold">{photos.length} uploaded</span>
                </div>
                {ecopointsToApply > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>EcoPoints</span>
                    <span className="font-semibold">−{formatNaira(pricing.ecopointsDiscountNgn)}</span>
                  </div>
                )}
                <hr className="border-neutral-200" />
                <div className="flex justify-between text-lg font-extrabold">
                  <span>Total</span>
                  <span className="text-[#145C25]">{formatNaira(pricing.finalTotalNgn)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <div className="text-left">
              <label className="text-sm font-semibold text-neutral-700 mb-2 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === "card"
                      ? "border-[#145C25] bg-green-50 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1" />
                  Pay Now (Card)
                </button>
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === "transfer"
                      ? "border-[#145C25] bg-green-50 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1" />
                  Pay on Pickup
                </button>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || paymentProcessing}
              className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-14 text-lg"
            >
              {submitting || paymentProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {paymentProcessing ? "Processing Payment..." : "Creating Pickup..."}
                </span>
              ) : (
                `Confirm — ${formatNaira(pricing.finalTotalNgn)}`
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      {step < 9 && (
        <footer className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-xl">
                Back
              </Button>
            )}
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-12"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default RequestPickupPage;
