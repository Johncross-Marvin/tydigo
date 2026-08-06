import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  CreditCard,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { Pickup } from "@/lib/api";
import { getStatusLabel, getStatusColor, type PickupStatus } from "@/services/pickup-status";

type ActivePickupCardProps = {
  pickup: Pickup | null | undefined;
};

const statusSteps: PickupStatus[] = [
  "requested",
  "collector_assigned",
  "collector_en_route",
  "collector_arrived",
  "waste_picked",
  "completed",
];

export function ActivePickupCard({ pickup }: ActivePickupCardProps) {
  if (!pickup) {
    return (
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Active Pickup</h3>
          <div className="rounded-2xl bg-neutral-50 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-7 h-7 text-[#145C25]" />
            </div>
            <p className="font-semibold text-neutral-700">No active pickup</p>
            <p className="text-sm text-neutral-500 mt-1">
              Request a pickup to start tracking your waste collection.
            </p>
            <Link to="/household/request-pickup">
              <Button className="mt-4 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                Request Pickup
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStatusIdx = statusSteps.indexOf(pickup.status as PickupStatus);
  const progress = currentStatusIdx >= 0
    ? Math.round(((currentStatusIdx + 1) / statusSteps.length) * 100)
    : 35;

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-900">Active Pickup</h3>
          <Badge className={`${getStatusColor(pickup.status as PickupStatus)} rounded-full`}>
            {getStatusLabel(pickup.status as PickupStatus)}
          </Badge>
        </div>

        {/* Collector info */}
        <div className="flex items-center gap-4 mb-5">
          <Avatar className="w-12 h-12 ring-2 ring-green-100">
            <AvatarFallback className="bg-green-100 text-[#145C25] font-bold">
              {pickup.collector_name?.charAt(0) ?? "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-neutral-900">{pickup.collector_name}</p>
            <p className="text-sm text-neutral-500">
              {pickup.eta_minutes ? `ETA: ${pickup.eta_minutes} min` : "Awaiting assignment"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-neutral-400">{pickup.pickup_code}</p>
            <p className="text-sm font-bold text-[#145C25]">
              ₦{pickup.price_ngn?.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            {statusSteps.map((step, i) => {
              const isComplete = currentStatusIdx >= 0 && i <= currentStatusIdx;
              const isCurrent = i === currentStatusIdx;
              return (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      isComplete
                        ? "bg-[#145C25] text-white"
                        : isCurrent
                          ? "bg-green-100 text-[#145C25] ring-2 ring-[#145C25]"
                          : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] text-neutral-400 hidden sm:block">
                    {getStatusLabel(step).split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress
            value={progress}
            className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]"
          />
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="truncate">{pickup.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>{pickup.schedule_window}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to="/household/tracking" className="flex-1">
            <Button variant="outline" className="w-full rounded-xl border-[#145C25] text-[#145C25]">
              <Navigation className="w-4 h-4 mr-2" />
              Track Live
            </Button>
          </Link>
          {pickup.payment_status !== "paid" && (
            <Link to="/household/payment" className="flex-1">
              <Button className="w-full rounded-xl bg-[#145C25] hover:bg-[#0F4A1E] text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
