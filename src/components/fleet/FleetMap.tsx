import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Circle } from "lucide-react";
import type { FleetCollector } from "@/lib/api";

type FleetMapProps = {
  collectors: FleetCollector[];
};

export function FleetMap({ collectors }: FleetMapProps) {
  const onlineCollectors = collectors.filter((c) => c.is_online);
  const activeCollectors = collectors.filter((c) => c.active_job_id);

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
      <div className="relative bg-neutral-100 h-64 sm:h-80">
        {/* Map grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Collector markers */}
        {collectors.map((collector, i) => (
          <div
            key={collector.id}
            className="absolute z-10 transition-all duration-500"
            style={{
              top: `${15 + (i * 20) % 60}%`,
              left: `${10 + (i * 25) % 70}%`,
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ${
                collector.is_online
                  ? collector.active_job_id
                    ? "bg-blue-600"
                    : "bg-green-500"
                  : "bg-neutral-400"
              }`}
            >
              <Truck className="w-4 h-4 text-white" />
            </div>
            <p className="text-[10px] font-medium text-neutral-700 mt-1 text-center">
              {collector.full_name.split(" ")[0]}
            </p>
          </div>
        ))}

        {/* Overlay stats */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <Badge className="bg-white/90 text-neutral-700 shadow-sm rounded-full">
            <Circle className="w-2 h-2 fill-green-500 text-green-500 mr-1" />
            {onlineCollectors.length} Online
          </Badge>
          <Badge className="bg-white/90 text-neutral-700 shadow-sm rounded-full">
            <Truck className="w-3 h-3 mr-1" />
            {activeCollectors.length} Active
          </Badge>
        </div>
      </div>
    </Card>
  );
}
