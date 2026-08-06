import { CheckCircle2, Circle, Truck, MapPin, Camera, PackageCheck, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PickupStatus } from "@/services/pickup-status";
import { getStatusLabel } from "@/services/pickup-status";

type StatusStepperProps = {
  currentStatus: PickupStatus;
  className?: string;
};

const steps: { status: PickupStatus; icon: typeof Circle }[] = [
  { status: "requested", icon: Circle },
  { status: "collector_assigned", icon: Truck },
  { status: "collector_en_route", icon: Truck },
  { status: "collector_arrived", icon: MapPin },
  { status: "pickup_verified", icon: Camera },
  { status: "waste_picked", icon: PackageCheck },
  { status: "completed", icon: Award },
];

const statusOrder: PickupStatus[] = steps.map((s) => s.status);

export function StatusStepper({ currentStatus, className }: StatusStepperProps) {
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => {
        const isComplete = currentIdx >= 0 && i <= currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === steps.length - 1;
        const Icon = step.icon;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500",
                  isComplete && "bg-[#145C25] text-white scale-100",
                  isCurrent && "bg-green-100 text-[#145C25] ring-2 ring-[#145C25] scale-110",
                  !isComplete && !isCurrent && "bg-neutral-100 text-neutral-400",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium hidden sm:block",
                  isComplete || isCurrent ? "text-[#145C25]" : "text-neutral-400",
                )}
              >
                {getStatusLabel(step.status)}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 mt-[-16px] transition-colors duration-500",
                  isComplete ? "bg-[#145C25]" : "bg-neutral-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
