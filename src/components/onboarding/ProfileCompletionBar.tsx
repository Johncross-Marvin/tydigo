/**
 * Tydigo Profile Completion Bar
 *
 * Shows profile completion percentage with recommendations.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Award, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import { calculateProfileCompletion } from "@/services/onboarding";

export function ProfileCompletionBar() {
  const { user } = useAuth();

  const completionPct = useMemo(() => {
    if (!user) return 0;
    return calculateProfileCompletion(user as unknown as Record<string, unknown>);
  }, [user]);

  if (completionPct >= 100) return null;

  const recommendations: string[] = [];
  if (!user?.phone) recommendations.push("Add your phone number");
  if (!user?.address) recommendations.push("Set your pickup address");
  if (completionPct < 50) recommendations.push("Complete your profile");

  return (
    <Link
      to="/household/profile"
      className="block mx-4 mb-4 p-4 bg-white rounded-2xl border border-neutral-200 hover:border-[#145C25] transition-colors shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-neutral-900 text-sm">Profile Completion</span>
        </div>
        <span className="text-sm font-bold text-[#145C25]">{completionPct}%</span>
      </div>
      <Progress value={completionPct} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
      {recommendations.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-neutral-500">
          <span>{recommendations[0]}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </Link>
  );
}
