/**
 * Tydigo Onboarding Page
 *
 * Entry point for the onboarding journey. Detects user role
 * and renders the appropriate onboarding engine.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingEngine } from "@/components/onboarding/OnboardingEngine";
import { useAuth } from "@/components/auth-provider";
import { getOnboardingState } from "@/services/onboarding";
import { getRoleDashboardPath } from "@/services/role";
import type { UserRole } from "@/lib/api";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // Check if onboarding is already complete
    getOnboardingState(user.id, user.role).then((state) => {
      if (state.isComplete) {
        setNeedsOnboarding(false);
        navigate(getRoleDashboardPath(user.role), { replace: true });
      }
      setChecking(false);
    });
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
          <p className="text-sm text-neutral-500">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  if (!user || !needsOnboarding) return null;

  return (
    <OnboardingEngine
      role={user.role}
      onComplete={() => {
        navigate(getRoleDashboardPath(user.role), { replace: true });
      }}
    />
  );
};

export default OnboardingPage;
