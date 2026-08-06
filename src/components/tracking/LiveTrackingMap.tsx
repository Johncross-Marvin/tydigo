import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Truck,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CollectorLocation = {
  lat: number;
  lng: number;
  heading?: number;
  updated_at: string;
};

type LiveTrackingMapProps = {
  pickupAddress: string;
  collectorName: string;
  collectorPhone?: string;
  collectorLocation?: CollectorLocation | null;
  etaMinutes?: number | null;
  status: string;
  className?: string;
};

export function LiveTrackingMap({
  pickupAddress,
  collectorName,
  collectorPhone,
  collectorLocation,
  etaMinutes,
  status,
  className,
}: LiveTrackingMapProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((p) => p + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isActive = !["completed", "cancelled"].includes(status);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Map placeholder */}
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
        <div className="relative bg-neutral-100 h-64 sm:h-80 flex items-center justify-center">
          {/* Simulated map grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {/* Pickup marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#145C25] flex items-center justify-center shadow-lg animate-bounce">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#145C25] rounded-full animate-ping" />
            </div>
          </div>

          {/* Collector marker (if location available) */}
          {collectorLocation && isActive && (
            <div
              className="absolute z-20 transition-all duration-1000"
              style={{
                top: `${30 + Math.random() * 20}%`,
                left: `${25 + Math.random() * 20}%`,
              }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg ring-4 ring-white">
                <Truck className="w-5 h-5 text-white" />
              </div>
            </div>
          )}

          {/* Map overlay info */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <Badge className="bg-white/90 text-neutral-700 shadow-sm rounded-full">
              <Clock className="w-3 h-3 mr-1" />
              {etaMinutes ? `${etaMinutes} min ETA` : "Calculating..."}
            </Badge>
            <Button variant="ghost" size="icon" className="bg-white/90 rounded-xl shadow-sm h-8 w-8">
              <Maximize2 className="w-4 h-4 text-neutral-600" />
            </Button>
          </div>

          {/* Map attribution */}
          <div className="absolute bottom-2 right-3 text-[10px] text-neutral-400 z-10">
            Live tracking • Updated {elapsed > 0 ? `${elapsed}m ago` : "just now"}
          </div>
        </div>
      </Card>

      {/* Collector info card */}
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 ring-2 ring-blue-100">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                {collectorName?.charAt(0) ?? "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neutral-900">{collectorName}</p>
              <p className="text-sm text-neutral-500 truncate">{pickupAddress}</p>
            </div>
            {collectorPhone && (
              <a href={`tel:${collectorPhone}`}>
                <Button variant="outline" size="icon" className="rounded-xl border-green-200 text-[#145C25]">
                  <Phone className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>

          {isActive && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 rounded-xl border-blue-200 text-blue-600">
                <Navigation className="w-4 h-4 mr-2" />
                Directions
              </Button>
              <Button className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                <Phone className="w-4 h-4 mr-2" />
                Call Collector
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
