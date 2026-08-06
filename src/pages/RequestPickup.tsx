/**
 * Tydigo Request Pickup — Multi-Step Marketplace Flow
 *
 * Step 1: Address → Step 2: Waste Categories → Step 3: Details
 * → Step 4: Photos → Step 5: Schedule → Step 6: Pricing → Step 7: Confirm
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, MapPin, Camera, Clock, CreditCard,
  CheckCircle2, ChevronRight, Plus, X, Upload, Award, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { createPickup, uploadPickupPhoto, type PickupDraftInput } from "@/services/pickup";
import { calculatePrice, formatNaira, type WasteType } from "@/services/pricing";
import { getAddresses, type Address } from "@/services/address";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

const STEPS = ["Address", "Waste", "Details", "Photos", "Schedule", "Pricing", "Confirm"];

type WasteCategory = { id: string; name: string; icon: string | null; description: string | null; is_recyclable: boolean; eco_points_per_kg: number };

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
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [estimatedWeight, setEstimatedWeight] = useState(5);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scheduleType, setScheduleType] = useState<"asap" | "later">("asap");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [ecopointsToApply, setEcopointsToApply] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAddresses(user.id),
      isSupabaseAvailable() && supabase
        ? supabase.from("waste_categories").select("*").eq("is_recyclable", true).then(({ data }) => data as WasteCategory[])
        : Promise.resolve([]),
    ]).then(([addrs, cats]) => {
      setAddresses(addrs);
      setCategories(cats || []);
      if (addrs.length > 0) setSelectedAddress(addrs.find((a) => a.is_default) || addrs[0]);
      setLoading(false);
    });
  }, [user]);

  const wasteType: WasteType = selectedCategories.length > 1 ? "mixed_waste"
    : selectedCategories[0]?.toLowerCase().includes("plastic") ? "plastic"
    : selectedCategories[0]?.toLowerCase().includes("organic") ? "organic"
    : selectedCategories[0]?.toLowerCase().includes("paper") ? "paper_cardboard"
    : selectedCategories[0]?.toLowerCase().includes("metal") ? "metal_cans"
    : selectedCategories[0]?.toLowerCase().includes("glass") ? "glass"
    : selectedCategories[0]?.toLowerCase().includes("electronic") ? "e_waste"
    : "general_waste";

  const pricing = calculatePrice({ weightKg: estimatedWeight, wasteType, ecopointsToApply });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    const tempId = "temp-" + Date.now();
    const url = await uploadPickupPhoto(user.id, tempId, file);
    setPhotos((prev) => [...prev, url]);
    setUploadingPhoto(false);
  };

  const handleSubmit = async () => {
    if (!user || !selectedAddress) return;
    setSubmitting(true);

    const draft: PickupDraftInput = {
      wasteType,
      estimatedWeightKg: estimatedWeight,
      sortingStatus: "properly_sorted",
      address: [selectedAddress.street, selectedAddress.city, selectedAddress.state].filter(Boolean).join(", "),
      pickupInstructions: notes || undefined,
      scheduleWindow: scheduleType === "asap" ? "ASAP" : `${scheduledDate} ${scheduledTime}`,
      ecopointsToApply: ecopointsToApply,
      paymentMethod,
    };

    try {
      const result = await createPickup(user, draft);
      navigate(`/household/tracking?id=${result.id}`, { replace: true });
    } catch (err) {
      console.error("Failed to create pickup:", err);
    }
    setSubmitting(false);
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
            <span key={s} className={`text-xs font-semibold ${i <= step ? "text-[#145C25]" : "text-neutral-300"}`}>{s}</span>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4 pb-24">
        {/* Step 1: Address */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Pickup Address</h2>
            {addresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => setSelectedAddress(addr)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedAddress?.id === addr.id ? "border-[#145C25] bg-green-50" : "border-neutral-200 hover:border-neutral-300"
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
                {selectedAddress?.id === addr.id && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
              </button>
            ))}
            <Link to="/household/profile/addresses" className="flex items-center gap-2 text-sm font-semibold text-[#145C25]">
              <Plus className="w-4 h-4" /> Add New Address
            </Link>
          </div>
        )}

        {/* Step 2: Waste Categories */}
        {step === 1 && (
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
                      isSelected ? "border-[#145C25] bg-green-50" : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon || "🗑️"}</div>
                    <p className="font-bold text-neutral-900 text-sm">{cat.name}</p>
                    {cat.is_recyclable && <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">+{cat.eco_points_per_kg} pts/kg</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Waste Details</h2>
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Estimated Weight (kg)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setEstimatedWeight(Math.max(1, estimatedWeight - 1))} className="w-12 h-12 rounded-xl bg-neutral-100 font-bold text-lg">−</button>
                <Input
                  type="number"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(Number(e.target.value) || 1)}
                  className="text-center text-xl font-bold rounded-xl flex-1"
                  min={1}
                />
                <button onClick={() => setEstimatedWeight(estimatedWeight + 1)} className="w-12 h-12 rounded-xl bg-neutral-100 font-bold text-lg">+</button>
              </div>
              <div className="flex gap-2 mt-2">
                {[1, 5, 10, 20, 40].map((w) => (
                  <button key={w} onClick={() => setEstimatedWeight(w)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${estimatedWeight === w ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600"}`}>{w}kg</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" placeholder="E.g., fragile items, gate code..." />
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Upload Photos</h2>
            <p className="text-neutral-500 text-sm">Help the collector identify your waste. Photos improve pricing accuracy.</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                  <img src={url} alt={`Waste ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
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
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
        )}

        {/* Step 5: Schedule */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Pickup Time</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScheduleType("asap")}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${scheduleType === "asap" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}
              >
                <Clock className="w-8 h-8 text-[#145C25] mx-auto mb-2" />
                <p className="font-bold text-neutral-900">ASAP</p>
                <p className="text-xs text-neutral-500">Within 30–60 min</p>
              </button>
              <button
                onClick={() => setScheduleType("later")}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${scheduleType === "later" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}
              >
                <Clock className="w-8 h-8 text-[#145C25] mx-auto mb-2" />
                <p className="font-bold text-neutral-900">Schedule</p>
                <p className="text-xs text-neutral-500">Pick a date & time</p>
              </button>
            </div>
            {scheduleType === "later" && (
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="rounded-xl" />
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="rounded-xl" />
              </div>
            )}
          </div>
        )}

        {/* Step 6: Pricing */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900">Price Breakdown</h2>
            <Card className="border-0 shadow-brand-lg rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Base price ({estimatedWeight}kg)</span><span className="font-semibold">{formatNaira(pricing.basePriceNgn)}</span></div>
                {pricing.wasteModifierNgn !== 0 && (
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Waste modifier ({pricing.wasteModifierPercent > 0 ? "+" : ""}{pricing.wasteModifierPercent}%)</span><span className="font-semibold">{formatNaira(pricing.wasteModifierNgn)}</span></div>
                )}
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Platform fee ({pricing.platformFeePercent}%)</span><span className="font-semibold">{formatNaira(pricing.platformFeeNgn)}</span></div>
                {ecopointsToApply > 0 && (
                  <div className="flex justify-between text-sm text-green-600"><span>EcoPoints discount ({pricing.ecopointsApplied} pts)</span><span className="font-semibold">−{formatNaira(pricing.ecopointsDiscountNgn)}</span></div>
                )}
                <hr className="border-neutral-200" />
                <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="text-[#145C25]">{formatNaira(pricing.finalTotalNgn)}</span></div>
              </CardContent>
            </Card>

            {/* EcoPoints discount */}
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Apply EcoPoints
              </label>
              <div className="flex items-center gap-2">
                <Input type="number" value={ecopointsToApply} onChange={(e) => setEcopointsToApply(Number(e.target.value) || 0)} className="rounded-xl flex-1" placeholder="0" />
                <span className="text-sm text-neutral-500">pts</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">You have {(user?.ecopoints || 0).toLocaleString()} EcoPoints</p>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("card")} className={`p-3 rounded-xl border-2 text-sm font-semibold ${paymentMethod === "card" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}>
                  <CreditCard className="w-5 h-5 mx-auto mb-1" /> Card
                </button>
                <button onClick={() => setPaymentMethod("transfer")} className={`p-3 rounded-xl border-2 text-sm font-semibold ${paymentMethod === "transfer" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}>
                  <CreditCard className="w-5 h-5 mx-auto mb-1" /> Pay on Pickup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Confirm */}
        {step === 6 && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">Confirm Pickup</h2>
            <Card className="border-0 shadow-brand-lg rounded-2xl text-left">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Address</span><span className="font-semibold text-right max-w-[60%]">{selectedAddress?.label}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Waste</span><span className="font-semibold">{selectedCategories.length} categories, ~{estimatedWeight}kg</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Schedule</span><span className="font-semibold">{scheduleType === "asap" ? "ASAP" : `${scheduledDate} ${scheduledTime}`}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Photos</span><span className="font-semibold">{photos.length} uploaded</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Payment</span><span className="font-semibold">{paymentMethod === "card" ? "Card" : "Pay on Pickup"}</span></div>
                <hr className="border-neutral-200" />
                <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="text-[#145C25]">{formatNaira(pricing.finalTotalNgn)}</span></div>
              </CardContent>
            </Card>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-14 text-lg"
            >
              {submitting ? "Creating Pickup..." : `Confirm — ${formatNaira(pricing.finalTotalNgn)}`}
            </Button>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      {step < 6 && (
        <footer className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-xl">Back</Button>
            )}
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 0 && !selectedAddress) || (step === 1 && selectedCategories.length === 0)}
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
