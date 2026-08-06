/**
 * Tydigo Onboarding Checklist
 *
 * Interactive checklist showing onboarding progress with
 * completed/pending items. Used on dashboards.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import { getOnboardingState, type OnboardingProgress } from "@/services/onboarding";

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress[]>([]);
  const [completionPct, setCompletionPct] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getOnboardingState(user.id, user.role).then((state) => {
      setProgress(state.progress);
      setCompletionPct(state.completionPct);
      setLoading(false);
    });
  }, [user]);

  if (loading || completionPct >= 100) return null;

  const pending = progress.filter((p) => !p.completed);
  const completed = progress.filter((p) => p.completed);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 text-sm">Getting Started</h3>
        <span className="text-xs font-bold text-[#145C25]">{completionPct}%</span>
      </div>
      <Progress value={completionPct} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25] mb-3" />

      <div className="space-y-1">
        {completed.slice(0, 3).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm text-neutral-400 line-through">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            {p.step?.title || "Completed"}
          </div>
        ))}
        {pending.slice(0, 3).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm text-neutral-700">
            <Circle className="w-4 h-4 text-neutral-300 flex-shrink-0" />
            {p.step?.title || "Pending"}
          </div>
        ))}
      </div>

      <Link
        to="/onboarding"
        className="flex items-center justify-center gap-1 mt-3 text-sm font-semibold text-[#145C25] hover:text-[#0F4A1E] transition-colors"
      >
        Continue Setup
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
