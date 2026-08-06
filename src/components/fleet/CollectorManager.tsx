import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Phone, UserPlus, Circle } from "lucide-react";
import type { FleetCollector } from "@/lib/api";

type CollectorManagerProps = {
  collectors: FleetCollector[];
  onAddCollector: () => void;
};

export function CollectorManager({ collectors, onAddCollector }: CollectorManagerProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-900">Collectors ({collectors.length})</h3>
          <Button
            onClick={onAddCollector}
            size="sm"
            className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {collectors.map((collector) => (
            <div
              key={collector.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-neutral-100">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                    {collector.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Circle
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                    collector.is_online ? "fill-green-500 text-green-500" : "fill-neutral-300 text-neutral-300"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{collector.full_name}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{collector.total_pickups} pickups</span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {collector.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {collector.active_job_id && (
                  <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">On Job</Badge>
                )}
                <a href={`tel:${collector.phone}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Phone className="w-4 h-4 text-neutral-400" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
          {collectors.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">
              No collectors in your fleet yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
