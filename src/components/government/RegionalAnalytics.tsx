import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Recycle, Truck, TrendingUp } from "lucide-react";
import { formatWeight } from "@/lib/api";

type RegionalAnalyticsProps = {
  regions: Array<{
    name: string;
    wasteCollectedKg: number;
    recyclingRate: number;
    activeCollectors: number;
  }>;
};

export function RegionalAnalytics({ regions }: RegionalAnalyticsProps) {
  const maxWaste = Math.max(...regions.map((r) => r.wasteCollectedKg), 1);

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Regional Waste Analytics</h3>
        </div>

        <div className="space-y-4">
          {regions.map((region) => (
            <div key={region.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-700">{region.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Recycle className="w-3 h-3" />
                    {region.recyclingRate}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {region.activeCollectors}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.round((region.wasteCollectedKg / maxWaste) * 100)}
                  className="h-2 rounded-full bg-neutral-100 flex-1 [&>div]:bg-[#145C25]"
                />
                <span className="text-xs font-medium text-neutral-600 w-20 text-right">
                  {formatWeight(region.wasteCollectedKg)}
                </span>
              </div>
            </div>
          ))}
          {regions.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">
              No regional data available yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
