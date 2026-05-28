import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

const GOOGLE_DRIVE_IDS = {
  tracking: "1wDKGZLthGyQW9jCcPOf3PyHzFqoji7gq",
};

const gd = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const TrackingPage = () => {
  const [eta, setEta] = useState(12);

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
        <Badge className="ml-auto bg-green-100 text-[#145C25] rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#145C25] animate-pulse mr-1.5 inline-block" />
          Live
        </Badge>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Map */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
          <div className="relative h-64 sm:h-80 bg-neutral-100">
            <img
              src={gd(GOOGLE_DRIVE_IDS.tracking)}
              alt="Live Tracking Map"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <Badge className="bg-white text-neutral-700 shadow-lg rounded-full px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-[#145C25]" />
                Your Location
              </Badge>
              <Badge className="bg-white text-neutral-700 shadow-lg rounded-full px-3 py-1.5">
                <Truck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Collector
              </Badge>
            </div>
          </div>
        </Card>

        {/* ETA Card */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl bg-gradient-to-r from-[#145C25] to-[#1A7A30] text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Estimated Arrival</p>
                <p className="text-3xl font-extrabold">{eta} min</p>
              </div>
              <div className="text-right">
                <p className="text-green-200 text-sm">Distance</p>
                <p className="text-xl font-bold">2.4 km</p>
              </div>
            </div>
            <Progress value={100 - eta * 5} className="h-1.5 mt-3 rounded-full bg-white/20 [&>div]:bg-amber-400" />
          </CardContent>
        </Card>

        {/* Collector Info */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-14 h-14 ring-2 ring-green-100">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">IM</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-neutral-900">Ibrahim Musa</h3>
                  <Badge className="bg-green-100 text-[#145C25] text-xs rounded-full">
                    <Shield className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="font-semibold">4.9</span>
                  <span className="text-neutral-400">(234 pickups)</span>
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

        {/* Pickup Details */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-neutral-900">Pickup Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-neutral-600">
                <MapPin className="w-4 h-4 text-neutral-400" />
                15A Awolowo Road, Wuse Zone 2, Abuja
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Navigation className="w-4 h-4 text-neutral-400" />
                Plastic Waste — 5 kg
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Clock className="w-4 h-4 text-neutral-400" />
                Scheduled: Today, within 2 hours
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl text-center">
              <p className="text-xs text-neutral-500">Pickup Code</p>
              <p className="text-2xl font-black text-[#145C25] tracking-widest">WST-4829</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrackingPage;
