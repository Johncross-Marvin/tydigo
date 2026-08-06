import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyStateInline } from "@/components/ui/empty-state";
import {
  MapPin,
  Clock,
  Truck,
  Navigation,
  Package,
  DollarSign,
  Search,
} from "lucide-react";
import type { CollectorJob } from "@/lib/api";
import { formatNaira, formatWeight } from "@/lib/api";

type AvailableJobsFeedProps = {
  jobs: CollectorJob[];
  onAccept: (jobId: string) => void;
  onNavigate: (job: CollectorJob) => void;
  loading?: boolean;
};

export function AvailableJobsFeed({ jobs, onAccept, onNavigate, loading }: AvailableJobsFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl animate-pulse">
            <CardContent className="p-5">
              <div className="h-4 bg-neutral-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-neutral-50 rounded w-2/3 mb-2" />
              <div className="h-3 bg-neutral-50 rounded w-1/2 mb-3" />
              <div className="h-8 bg-neutral-100 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <EmptyStateInline
            icon={Search}
            title="No available jobs nearby"
            description="New pickup requests in your area will appear here. Check back soon!"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card
          key={job.id}
          className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">
                  {job.pickup_code}
                </Badge>
                {job.distance_km !== undefined && (
                  <Badge className="bg-neutral-100 text-neutral-600 rounded-full text-xs">
                    {job.distance_km.toFixed(1)} km
                  </Badge>
                )}
              </div>
              <span className="text-lg font-extrabold text-[#145C25]">
                {formatNaira(job.price_ngn)}
              </span>
            </div>

            <div className="space-y-1.5 text-sm text-neutral-600 mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">{job.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="capitalize">{job.waste_type.replace(/_/g, " ")} — {formatWeight(job.weight_kg)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{job.schedule_window}</span>
              </div>
            </div>

            <Progress
              value={job.payment_status === "paid" ? 70 : 35}
              className="mb-3 h-1.5 rounded-full bg-neutral-100 [&>div]:bg-blue-600"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => onNavigate(job)}
                variant="outline"
                className="flex-1 rounded-xl text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Navigation className="w-4 h-4 mr-1.5" />
                Navigate
              </Button>
              <Button
                onClick={() => onAccept(job.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm"
              >
                <Truck className="w-4 h-4 mr-1.5" />
                Accept Job
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
