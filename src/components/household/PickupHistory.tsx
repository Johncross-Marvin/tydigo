import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateInline } from "@/components/ui/empty-state";
import {
  Truck,
  ChevronRight,
  History,
  MapPin,
  Clock,
} from "lucide-react";
import type { Pickup } from "@/lib/api";
import { getStatusLabel, getStatusColor, type PickupStatus } from "@/services/pickup-status";
import { formatWeight } from "@/lib/api";

type PickupHistoryProps = {
  pickups: Pickup[];
};

export function PickupHistory({ pickups }: PickupHistoryProps) {
  if (pickups.length === 0) {
    return (
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
        <CardContent className="p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Recent Activity</h3>
          <EmptyStateInline
            icon={History}
            title="No pickups yet"
            description="Your completed and in-progress pickups will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-900">Recent Activity</h3>
          <Link to="/household/history">
            <Button variant="ghost" size="sm" className="text-[#145C25] text-xs">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {pickups.slice(0, 5).map((pickup) => (
            <Link
              key={pickup.id}
              to={`/household/tracking?id=${pickup.id}`}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                <Truck className="w-5 h-5 text-[#145C25]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 text-sm">
                    {pickup.pickup_code}
                  </p>
                  <Badge
                    className={`${getStatusColor(pickup.status as PickupStatus)} rounded-full text-[10px] px-2 py-0`}
                  >
                    {getStatusLabel(pickup.status as PickupStatus)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {pickup.address?.slice(0, 25)}...
                  </span>
                  <span>{formatWeight(Number(pickup.weight_kg))}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-neutral-700">
                  ₦{pickup.price_ngn?.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {new Date(pickup.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
