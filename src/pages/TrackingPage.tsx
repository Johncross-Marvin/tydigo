import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Star,
  Truck,
  Navigation,
  Shield,
} from "lucide-react";
import { IMAGE_IDS, gdUrl } from "@/lib/images";
import { api, formatWeight } from "@/lib/api";

const TrackingPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });
  const activePickup = data?.activePickup ?? data?.recentPickups?.[0] ?? null;
  const [eta, setEta] = useState(activePickup?.eta_minutes ?? 12);

  useEffect(() => {
    setEta(activePickup?.eta_minutes ?? 12);
  }, [activePickup?.eta_minutes]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => Math.max(1, prev - 1));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Live Tracking</h1>
        {activePickup && (
          <Badge className="ml-auto bg-green-100 text-[#145C25] rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#145C25] animate-pulse mr-1.5 inline-block" />
            Live
          </Badge>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {isLoading && <div className="rounded-2xl bg-white p-6 text-center text-neutral-500">Loading tracking details...</div>}

        {!isLoading && !activePickup && (
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-6 text-center">
              <Truck className="w-12 h-12 mx-auto text-neutral-400" />
              <h2 className="mt-3 text-xl font-extrabold text-neutral-900">No pickup is being tracked</h2>
              <p className="mt-1 text-sm text-neutral-500">Create a pickup request and it will appear here automatically.</p>
              <Link to="/household/request-pickup">
                <Button className="mt-4 rounded-xl bg-[#145C25] hover:bg-[#0F4A1E]">Request Pickup</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {activePickup && (
          <>
            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
              <div className="relative h-64 sm:h-80 bg-neutral-100">
                <img
                  src={gdUrl(IMAGE_IDS.tracking)}
                  alt="Live Tracking Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <Badge className="bg-white text-neutral-700 shadow-lg rounded-full px-3 py-1.5">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-[#145C25]" />
                    Pickup Address
                  </Badge>
                  <Badge className="bg-white text-neutral-700 shadow-lg rounded-full px-3 py-1.5">
                    <Truck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Assigned Collector
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl bg-gradient-to-r from-[#145C25] to-[#1A7A30] text-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Estimated Arrival</p>
                    <p className="text-3xl font-extrabold">{eta} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-200 text-sm">Status</p>
                    <p className="text-xl font-bold capitalize">{activePickup.status.replace("_", " ")}</p>
                  </div>
                </div>
                <Progress value={Math.min(95, Math.max(10, 100 - eta * 5))} className="h-1.5 mt-3 rounded-full bg-white/20 [&>div]:bg-amber-400" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-14 h-14 ring-2 ring-green-100">
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                      {activePickup.collector_name.split(" ").map((name) => name[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900">{activePickup.collector_name}</h3>
                      <Badge className="bg-green-100 text-[#145C25] text-xs rounded-full">
                        <Shield className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="font-semibold">{data?.stats?.rating?.toFixed(1) ?? "4.8"}</span>
                      <span className="text-neutral-400">collector rating</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Phone className="w-4 h-4 mr-2" /> Call
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl border-green-200 text-[#145C25] hover:bg-green-50">
                    <MessageCircle className="w-4 h-4 mr-2" /> Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-neutral-900">Pickup Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    {activePickup.address}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Navigation className="w-4 h-4 text-neutral-400" />
                    {activePickup.waste_type} - {formatWeight(Number(activePickup.weight_kg))}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    Scheduled: {activePickup.schedule_window}
                  </div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <p className="text-xs text-neutral-500">Pickup Code</p>
                  <p className="text-2xl font-black text-[#145C25] tracking-widest">{activePickup.pickup_code}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default TrackingPage;
