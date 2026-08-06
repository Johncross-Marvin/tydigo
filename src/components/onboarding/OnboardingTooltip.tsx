/**
 * Tydigo Onboarding Tooltip
 *
 * Contextual first-time guidance. Dismissible, remembers seen state.
 */

import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getTooltipsSeen, markTooltipSeen } from "@/services/onboarding";

type Props = {
  tooltipKey: string;
  title: string;
  description: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
};

export function OnboardingTooltip({ tooltipKey, title, description, children, position = "bottom" }: Props) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTooltipsSeen(user.id).then((seen) => {
      if (!seen.has(tooltipKey)) {
        setVisible(true);
      }
    });
  }, [user, tooltipKey]);

  const handleDismiss = async () => {
    setVisible(false);
    setDismissed(true);
    if (user) {
      await markTooltipSeen(user.id, tooltipKey);
    }
  };

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div className="relative inline-block">
      {children}
      {visible && !dismissed && (
        <div className={`absolute z-50 ${positionClasses[position]} w-64`}>
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-900 text-sm">{title}</p>
                <p className="text-xs text-neutral-500 mt-1">{description}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-neutral-100 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
