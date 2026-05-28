import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Truck, MapPin, Clock, Star, DollarSign, TrendingUp,
  CheckCircle2, Navigation, Award, Bell, Menu,
} from "lucide-react";

const CollectorDashboardPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/role-selection" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Collector Dashboard</h1>
        <Button variant="ghost" size="icon" className="ml-auto rounded-xl">
          <Bell className="w-5 h-5 text-neutral-500" />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Earnings Card */}
        <Card className="border-0 shadow-brand-lg rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <CardContent className="p-6">
            <p className="text-blue-200 text-sm">Today's Earnings</p>
            <p className="text-4xl font-black tracking-tight mt-1">₦8,500</p>
            <div className="flex gap-4 mt-3 text-sm text-blue-200">
              <span>4 pickups completed</span>
              <span>•</span>
              <span>2 remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Star, label: "Rating", value: "4.9" },
            { icon: CheckCircle2, label: "Completed", value: "234" },
            { icon: Award, label: "Bonus", value: "₦1,200" },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 text-center">
                <stat.icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Jobs */}
        <div>
          <h2 className="font-bold text-neutral-900 mb-3">Active Jobs</h2>
          <div className="space-y-3">
            {[
              { id: "WST-4829", address: "15A Awolowo Road, Wuse Zone 2", waste: "Plastic — 5 kg", eta: "12 min", price: "₦750" },
              { id: "WST-4830", address: "22B Adetokunbo Crescent, Wuse 2", waste: "Paper — 3 kg", eta: "25 min", price: "₦500" },
            ].map((job, i) => (
              <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">{job.id}</Badge>
                    <span className="text-sm font-bold text-[#145C25]">{job.price}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-neutral-600 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.address}</div>
                    <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />{job.waste}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />ETA: {job.eta}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">
                      <Navigation className="w-4 h-4 mr-1.5" /> Navigate
                    </Button>
                    <Button variant="outline" className="rounded-xl text-sm">Complete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CollectorDashboardPage;
