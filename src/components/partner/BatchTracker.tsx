import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyStateInline } from "@/components/ui/empty-state";
import {
  Package,
  CheckCircle2,
  Circle,
  Truck,
  Building,
  Clock,
} from "lucide-react";
import type { PartnerMaterialRequest } from "@/lib/api";
import { formatWeight } from "@/lib/api";

type BatchTrackerProps = {
  batches: PartnerMaterialRequest[];
};

const batchSteps = ["requested", "approved", "in_transit", "received"];

export function BatchTracker({ batches }: BatchTrackerProps) {
  if (batches.length === 0) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <EmptyStateInline
            icon={Package}
            title="No active batches"
            description="Request materials from the marketplace to track them here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const currentIdx = batchSteps.indexOf(batch.status);
        const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / batchSteps.length) * 100) : 0;

        return (
          <Card key={batch.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-purple-100 text-purple-600 rounded-full capitalize text-xs">
                  {batch.material.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm font-bold text-neutral-700">
                  {formatWeight(batch.quantity_kg)}
                </span>
              </div>

              {/* Mini stepper */}
              <div className="flex items-center gap-1 mb-3">
                {batchSteps.map((step, i) => {
                  const isComplete = currentIdx >= 0 && i <= currentIdx;
                  return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isComplete ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {isComplete ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-2 h-2" />}
                      </div>
                      {i < batchSteps.length - 1 && (
                        <div className={`flex-1 h-0.5 ${isComplete ? "bg-purple-600" : "bg-neutral-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Clock className="w-3 h-3" />
                <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                <span className="capitalize">• {batch.status.replace(/_/g, " ")}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
