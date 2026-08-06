import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Navigation,
  MapPin,
  CheckCircle2,
  Camera,
  Scale,
  ClipboardCheck,
  Circle,
  Clock,
  Truck,
} from "lucide-react";
import type { CollectorJob } from "@/lib/api";
import { getStatusLabel, getStatusColor, type PickupStatus } from "@/services/pickup-status";
import { formatNaira, formatWeight } from "@/lib/api";

type ActiveJobWorkflowProps = {
  job: CollectorJob;
  onUpdateStatus: (jobId: string, status: string, data?: Record<string, unknown>) => void;
};

const workflowSteps: { status: PickupStatus; label: string; icon: typeof Navigation; actionLabel: string }[] = [
  { status: "collector_assigned", label: "Navigate", icon: Navigation, actionLabel: "Start Navigation" },
  { status: "collector_en_route", label: "En Route", icon: Truck, actionLabel: "I've Arrived" },
  { status: "collector_arrived", label: "Verify Waste", icon: Camera, actionLabel: "Verify & Weigh" },
  { status: "pickup_verified", label: "Pick Up", icon: Scale, actionLabel: "Confirm Pickup" },
  { status: "waste_picked", label: "Complete", icon: ClipboardCheck, actionLabel: "Mark Complete" },
];

export function ActiveJobWorkflow({ job, onUpdateStatus }: ActiveJobWorkflowProps) {
  const [loading, setLoading] = useState(false);

  const currentStepIdx = workflowSteps.findIndex((s) => s.status === job.status);
  const progress = currentStepIdx >= 0
    ? Math.round(((currentStepIdx + 1) / workflowSteps.length) * 100)
    : 20;

  const handleAction = async () => {
    if (currentStepIdx < 0 || currentStepIdx >= workflowSteps.length - 1) return;

    setLoading(true);
    const nextStep = workflowSteps[currentStepIdx + 1];
    await onUpdateStatus(job.id, nextStep.status);
    setLoading(false);
  };

  const currentStep = workflowSteps[currentStepIdx];
  const isTerminal = job.status === "completed" || job.status === "cancelled";

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <Badge className="bg-white/20 text-white rounded-full text-xs">
            {job.pickup_code}
          </Badge>
          <span className="text-lg font-extrabold">{formatNaira(job.price_ngn)}</span>
        </div>
        <p className="text-blue-100 text-sm">{job.address}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-blue-200">
          <span className="flex items-center gap-1">
            <PackageIcon className="w-3 h-3" />
            {job.waste_type.replace(/_/g, " ")}
          </span>
          <span>{formatWeight(job.weight_kg)}</span>
          <span>{job.schedule_window}</span>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Status stepper */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            {workflowSteps.map((step, i) => {
              const isComplete = currentStepIdx >= 0 && i <= currentStepIdx;
              const isCurrent = i === currentStepIdx;
              const StepIcon = step.icon;
              return (
                <div key={step.status} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-[#145C25] text-white"
                        : isCurrent
                          ? "bg-blue-100 text-blue-600 ring-2 ring-blue-600"
                          : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <StepIcon className="w-4 h-4" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 hidden sm:block">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress
            value={progress}
            className="h-2 rounded-full bg-neutral-100 [&>div]:bg-blue-600"
          />
        </div>

        {/* Current status */}
        <div className="rounded-xl bg-blue-50 p-4 mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(job.status as PickupStatus)} rounded-full`}>
              {getStatusLabel(job.status as PickupStatus)}
            </Badge>
            <span className="text-sm text-blue-700 font-medium">
              {job.status === "collector_assigned" && "Head to the pickup location"}
              {job.status === "collector_en_route" && "You're on the way — tap when you arrive"}
              {job.status === "collector_arrived" && "Verify the waste type and weight"}
              {job.status === "pickup_verified" && "Load the waste and confirm pickup"}
              {job.status === "waste_picked" && "All done! Mark as complete"}
              {job.status === "completed" && "Job completed successfully! 🎉"}
            </span>
          </div>
        </div>

        {/* Action button */}
        {!isTerminal && currentStep && (
          <Button
            onClick={handleAction}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            {loading ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
            ) : (
              <currentStep.icon className="w-4 h-4 mr-2" />
            )}
            {currentStep.actionLabel}
          </Button>
        )}

        {job.status === "completed" && (
          <div className="text-center py-2">
            <CheckCircle2 className="w-10 h-10 text-[#145C25] mx-auto mb-2" />
            <p className="font-bold text-[#145C25]">Job Complete!</p>
            <p className="text-sm text-neutral-500">Earnings: {formatNaira(job.price_ngn)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}
