import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Recycle,
  Truck,
  MapPin,
  Award,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/api";

type OnboardingStep = {
  icon: typeof Recycle;
  title: string;
  description: string;
  image?: string;
};

type RoleOnboardingProps = {
  role: UserRole;
  onComplete: () => void;
  onDismiss: () => void;
};

const householdSteps: OnboardingStep[] = [
  {
    icon: MapPin,
    title: "Request Your First Pickup",
    description: "Select your waste type, set a pickup time, and confirm your location. It takes less than 60 seconds!",
  },
  {
    icon: Truck,
    title: "Track Your Collector",
    description: "Watch your collector approach in real-time on the live map. You'll know exactly when they arrive.",
  },
  {
    icon: CreditCard,
    title: "Pay Securely",
    description: "Pay with card, bank transfer, or use your EcoPoints. All payments are encrypted and secure.",
  },
  {
    icon: Award,
    title: "Earn EcoPoints",
    description: "Earn points for every pickup. Redeem them for discounts, airtime, or cash rewards!",
  },
];

const collectorSteps: OnboardingStep[] = [
  {
    icon: MapPin,
    title: "Find Nearby Jobs",
    description: "Browse available pickup requests in your area. Sort by distance, price, or schedule.",
  },
  {
    icon: Truck,
    title: "Accept & Navigate",
    description: "Accept jobs with one tap. Get turn-by-turn directions to the pickup location.",
  },
  {
    icon: CheckCircle2,
    title: "Complete Pickups",
    description: "Follow the step-by-step workflow: Navigate → Arrive → Verify → Pick Up → Complete.",
  },
  {
    icon: Award,
    title: "Track Your Earnings",
    description: "See your daily and weekly earnings. Build your rating and unlock bonus rewards!",
  },
];

const businessSteps: OnboardingStep[] = [
  {
    icon: MapPin,
    title: "Add Your Locations",
    description: "Add all your business locations for centralized waste management.",
  },
  {
    icon: Truck,
    title: "Schedule Bulk Pickups",
    description: "Schedule pickups for multiple locations at once. Set recurring schedules for regular service.",
  },
  {
    icon: Award,
    title: "Track Impact",
    description: "Monitor your environmental impact with detailed reports. Track recycling rates and carbon offset.",
  },
];

export function RoleOnboarding({ role, onComplete, onDismiss }: RoleOnboardingProps) {
  const [step, setStep] = useState(0);

  const steps: OnboardingStep[] =
    role === "collector" || role === "fleet_owner"
      ? collectorSteps
      : role === "business" || role === "estate" || role === "corporate_partner"
        ? businessSteps
        : householdSteps;

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#145C25] to-[#0A2F14] p-6 text-white text-center relative">
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Icon className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-extrabold">Welcome to Tydigo!</h2>
            <p className="text-green-200 text-sm mt-1">
              Let's get you started in just a few steps.
            </p>
          </div>

          {/* Step content */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Progress value={progress} className="h-1.5 rounded-full flex-1 bg-neutral-100 [&>div]:bg-[#145C25]" />
              <span className="text-xs font-medium text-neutral-500">
                {step + 1}/{steps.length}
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-[#145C25]" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {currentStep.title}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === step ? "bg-[#145C25] w-6" : i < step ? "bg-green-300" : "bg-neutral-200",
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
              >
                {isLast ? (
                  <>
                    Get Started
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <button
              onClick={onDismiss}
              className="w-full text-center text-sm text-neutral-400 mt-4 hover:text-neutral-600 transition-colors"
            >
              Skip tour
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
