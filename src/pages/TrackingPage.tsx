/**
 * Tydigo Live Tracking Page
 *
 * Real-time collector tracking with map, ETA, status updates,
 * and pickup verification.
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Clock, Truck, Phone, MessageCircle,
  CheckCircle2, Navigation, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import { getPickupById, updatePickupStatus } from "@/services/pickup";
import { getLatestTrackingPoint, subscribeToTracking, subscribeToPickupStatus, type TrackingPoint } from "@/services/tracking";
import { getStatusLabel, getStatusColor, isActivePickup, type PickupStatus } from "@/services/pickup-status";
import { formatNaira } from "@/services/pricing";

const STATUS_STEPS: PickupStatus[] = [
  "requested", "matching_collector", "collector_assigned",
  "collector_en_route", "collector_arrived", "pickup_verified",
  "waste_picked", "completed",
];

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const pickupId = searchParams.get("id");
  const { user } = useAuth();
  const [pickup, setPickup] = useState<Record<string, unknown> | null>(null);
  const [trackingPoint, setTrackingPoint] = useState<TrackingPoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pickupId || !user) return;

    getPickupById(pickupId).then((data) => {
      setPickup(data);
      setLoading(false);
    });

    getLatestTrackingPoint(pickupId).then(setTrackingPoint);

    // Subscribe to real-time tracking
    const unsubTracking = subscribeToTracking(pickupId, (point) => {
      setTrackingPoint(point);
    });

    // Subscribe to status changes
    const unsubStatus = subscribeToPickupStatus(pickupId, (status, data) => {
      setPickup((prev) => prev ? { ...prev, status, ...data } : prev);
    });

    return () => {
      unsubTracking();
      unsubStatus();
    };
  }, [pickupId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  if (!pickup) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <p className="text-neutral-500 font-semibold">Pickup not found</p>
          <Link to="/household/dashboard" className="text-sm text-[#145C25] font-semibold mt-2 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const status = (pickup.status as string) || "requested";
  const statusIdx = STATUS_STEPS.indexOf(status as PickupStatus);
  const isActive = isActivePickup(status as PickupStatus);
  const assignment = pickup.assignment as Record<string, unknown> | null;
  const etaMinutes = (assignment?.estimated_arrival_minutes as number) || null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900 flex-1">Live Tracking</h1>
        <Badge className={getStatusColor(status as PickupStatus)}>{getStatusLabel(status as PickupStatus)}</Badge>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        {/* Map Placeholder */}
        <Card className="border-0 shadow-brand-lg rounded-3xl overflow-hidden">
          <div className="bg-neutral-200 h-64 flex items-center justify-center relative">
            <div className="text-center">
              <Navigation className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
              <p className="text-neutral-500 font-semibold text-sm">Live Map</p>
              {trackingPoint && (
                <p className="text-xs text-neutral-400 mt-1">
                  Collector at {trackingPoint.latitude.toFixed(4)}, {trackingPoint.longitude.toFixed(4)}
                </p>
              )}
            </div>
            {isActive && (
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-neutral-900">Live</span>
                  </div>
                  {etaMinutes && <span className="text-sm font-bold text-[#145C25]">ETA: {etaMinutes} min</span>}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Status Timeline */}
        <Card className="border-0 shadow-brand-lg rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-bold text-neutral-900 mb-3">Status</h3>
            <div className="space-y-0">
              {STATUS_STEPS.map((s, i) => {
                const done = i <= statusIdx;
                const current = i === statusIdx;
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? "bg-[#145C25]" : "bg-neutral-200"}`}>
                        {done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-neutral-400" />}
                      </div>
                      {i < STATUS_STEPS.length - 1 && <div className={`w-0.5 h-6 ${done ? "bg-[#145C25]" : "bg-neutral-200"}`} />}
                    </div>
                    <div className={`pb-4 ${current ? "" : ""}`}>
                      <p className={`text-sm font-semibold ${done ? "text-neutral-900" : "text-neutral-400"}`}>{getStatusLabel(s)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pickup Details */}
        <Card className="border-0 shadow-brand-lg rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-neutral-900">Pickup Details</h3>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Code</span><span className="font-bold font-mono">{pickup.pickup_code as string}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Address</span><span className="font-semibold text-right max-w-[60%]">{pickup.pickup_address as string}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Weight</span><span className="font-semibold">{pickup.estimated_weight_kg as number}kg</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Total</span><span className="font-bold text-[#145C25]">{formatNaira((pickup.final_total_ngn as number) || 0)}</span></div>
          </CardContent>
        </Card>

        {/* Collector Info */}
        {assignment && (
          <Card className="border-0 shadow-brand-lg rounded-2xl">
            <CardContent className="p-4">
              <h3 className="font-bold text-neutral-900 mb-3">Collector</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-[#145C25]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-neutral-900">{(pickup.collector as Record<string, unknown>)?.full_name as string || "Assigned Collector"}</p>
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    <Star className="w-3 h-3 fill-current" /> 4.8
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#145C25]" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-[#145C25]" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TrackingPage;
