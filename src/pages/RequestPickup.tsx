import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Recycle,
  Trash2,
  Camera,
  Scale,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Leaf,
  Droplets,
  Award,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api, formatNaira, type Pickup } from "@/lib/api";

const steps = ["Category", "Weight", "Location", "Schedule", "Payment", "Confirm"];
const wasteTypes = [
  { icon: Recycle, label: "Plastic", desc: "Bottles, containers, bags", color: "bg-blue-100 text-blue-600 border-blue-300" },
  { icon: Leaf, label: "Organic", desc: "Food waste, garden waste", color: "bg-green-100 text-[#145C25] border-green-300" },
  { icon: ShoppingBag, label: "Paper", desc: "Cardboard, newspapers", color: "bg-amber-100 text-amber-600 border-amber-300" },
  { icon: Trash2, label: "Metal", desc: "Cans, foil, scrap metal", color: "bg-purple-100 text-purple-600 border-purple-300" },
  { icon: Droplets, label: "E-Waste", desc: "Electronics, batteries", color: "bg-red-100 text-red-600 border-red-300" },
];

const RequestPickupPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWaste, setSelectedWaste] = useState<string | null>(null);
  const [weight, setWeight] = useState("5");
  const [address, setAddress] = useState("15A Awolowo Road, Wuse Zone 2, Abuja");
  const [schedule, setSchedule] = useState("today");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [createdPickup, setCreatedPickup] = useState<Pickup | null>(null);
  const [error, setError] = useState("");
  const weightKg = Number(weight);
  const weightSurcharge = Math.max(0, Math.round(weightKg * 50));
  const estimatedPrice = 500 + weightSurcharge;

  const pickupMutation = useMutation({
    mutationFn: api.createPickup,
    onSuccess: async ({ pickup }) => {
      setCreatedPickup(pickup);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["pickups"] });
      setCurrentStep(5);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to save pickup.");
    },
  });

  const nextStep = () => {
    setError("");
    if (currentStep === 4) {
      if (!selectedWaste) return;
      pickupMutation.mutate({
        wasteType: selectedWaste,
        weightKg: Number(weight),
        address,
        scheduleWindow: schedule,
        paymentMethod,
      });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Request Pickup</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-500">
            {steps.map((step, i) => (
              <span key={i} className={i <= currentStep ? "text-[#145C25] font-semibold" : ""}>
                {step}
              </span>
            ))}
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]" />
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Select Waste Category</h2>
                <p className="text-sm text-neutral-500">Choose the type of waste for pickup</p>
                <div className="grid gap-3">
                  {wasteTypes.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => setSelectedWaste(type.label)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedWaste === type.label
                          ? `${type.color} border-2 shadow-brand`
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl ${type.color.split(" ")[0]} ${type.color.split(" ")[1]} flex items-center justify-center`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{type.label}</p>
                        <p className="text-sm text-neutral-500">{type.desc}</p>
                      </div>
                      {selectedWaste === type.label && <CheckCircle2 className="w-5 h-5 text-[#145C25] ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Estimated Weight</h2>
                <p className="text-sm text-neutral-500">How much waste do you have?</p>
                <div className="flex items-center gap-4">
                  <Scale className="w-8 h-8 text-neutral-400" />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full accent-[#145C25]"
                    />
                    <div className="flex justify-between text-sm text-neutral-500 mt-1">
                      <span>1 kg</span>
                      <span className="text-lg font-bold text-[#145C25]">{weight} kg</span>
                      <span>50 kg</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
                  <Camera className="w-4 h-4" />
                  Take a photo of your waste for accurate pricing
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Confirm Location</h2>
                <p className="text-sm text-neutral-500">Your pickup address</p>
                <div className="bg-neutral-100 rounded-2xl p-5 flex items-center justify-center">
                  <div className="text-center w-full max-w-md">
                    <MapPin className="w-10 h-10 text-[#145C25] mx-auto mb-2" />
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Pickup Address</label>
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-[#145C25]"
                      placeholder="Enter pickup address"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Schedule Pickup</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Today", sub: "Within 2 hours", value: "today" },
                    { label: "Tomorrow", sub: "Morning slot", value: "tomorrow" },
                    { label: "This Week", sub: "Choose a day", value: "week" },
                    { label: "Custom", sub: "Pick date & time", value: "custom" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSchedule(opt.value)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        schedule === opt.value
                          ? "border-[#145C25] bg-green-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <Clock className={`w-5 h-5 mb-2 ${schedule === opt.value ? "text-[#145C25]" : "text-neutral-400"}`} />
                      <p className="font-bold text-neutral-900 text-sm">{opt.label}</p>
                      <p className="text-xs text-neutral-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Payment Method</h2>
                <div className="space-y-3">
                  {[
                    { id: "card", icon: CreditCard, label: "Pay with Card", desc: "Visa, Mastercard, Verve" },
                    { id: "points", icon: Award, label: "Use EcoPoints", desc: `Balance: ${(user?.ecopoints ?? 0).toLocaleString()} pts` },
                    { id: "transfer", icon: CreditCard, label: "Bank Transfer", desc: "Pay after pickup" },
                  ].map((method, i) => (
                    <button
                      key={i}
                      onClick={() => setPaymentMethod(method.id)}
                      aria-pressed={paymentMethod === method.id}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === method.id
                          ? "border-[#145C25] bg-green-50"
                          : "border-neutral-200 hover:border-[#145C25]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <method.icon className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">{method.label}</p>
                        <p className="text-xs text-neutral-500">{method.desc}</p>
                      </div>
                      {paymentMethod === method.id && <CheckCircle2 className="w-5 h-5 text-[#145C25] ml-auto" />}
                    </button>
                  ))}
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Pickup fee</span>
                    <span className="font-semibold">{formatNaira(500)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Weight surcharge (est.)</span>
                    <span className="font-semibold">{formatNaira(weightSurcharge)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                    <span>Total</span>
                    <span className="text-[#145C25]">{formatNaira(estimatedPrice)}</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
                </div>
                <h2 className="text-xl font-extrabold text-neutral-900">Pickup Confirmed!</h2>
                <p className="text-neutral-500">Your request was saved and is ready for payment/tracking.</p>
                <div className="bg-neutral-50 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Pickup Code</span><span className="font-semibold">{createdPickup?.pickup_code}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Waste Type</span><span className="font-semibold">{selectedWaste}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Weight</span><span className="font-semibold">{weight} kg</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Schedule</span><span className="font-semibold capitalize">{schedule}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Payment</span><span className="font-semibold capitalize">{paymentMethod}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Total</span><span className="font-semibold text-[#145C25]">{formatNaira(createdPickup?.price_ngn ?? estimatedPrice)}</span></div>
                </div>
                <Link to="/household/tracking">
                  <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand">
                    Track Collector
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep} className="rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={(currentStep === 0 && !selectedWaste) || (currentStep === 2 && !address.trim()) || pickupMutation.isPending}
              className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand disabled:opacity-50"
            >
              {pickupMutation.isPending ? "Saving..." : currentStep === steps.length - 2 ? "Confirm Pickup" : "Continue"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      </main>
    </div>
  );
};

export default RequestPickupPage;
