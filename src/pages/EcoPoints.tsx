import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Award,
  TrendingUp,
  History,
  Gift,
  Star,
  Target,
  ChevronRight,
  Zap,
  Trophy,
  Flame,
} from "lucide-react";

const GOOGLE_DRIVE_IDS = {
  ecopoints: "1Yi-vG8rjWtUQK6fo_2VSijujwU9wJQCc",
};

const gd = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const EcoPointsPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">EcoPoints</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Balance Card */}
        <Card className="border-0 shadow-brand-lg rounded-2xl bg-gradient-to-br from-[#145C25] via-[#1A7A30] to-[#0D3B1A] text-white overflow-hidden relative">
          <CardContent className="p-6 relative z-10">
            <div className="absolute top-0 right-0 opacity-10">
              <Award className="w-32 h-32" />
            </div>
            <p className="text-green-200 text-sm">Your Balance</p>
            <p className="text-4xl font-black tracking-tight mt-1">12,450</p>
            <p className="text-green-200 text-sm mt-1">≈ ₦6,225.00</p>
            <div className="flex gap-2 mt-4">
              <Link to="/household/redeem">
                <Button className="bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold rounded-xl">
                  <Gift className="w-4 h-4 mr-2" /> Redeem
                </Button>
              </Link>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl">
                <History className="w-4 h-4 mr-2" /> History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Earn More */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-bold text-neutral-900 mb-4">How to Earn</h3>
            <div className="space-y-3">
              {[
                { icon: Award, title: "Complete a Pickup", pts: "+500 pts", desc: "Every completed pickup earns base points" },
                { icon: Star, title: "Sort Your Waste", pts: "+300 pts/kg", desc: "Bonus for pre-sorted recyclables" },
                { icon: Target, title: "Monthly Challenge", pts: "+1,000 pts", desc: "Complete 5 pickups in a month" },
                { icon: Flame, title: "Streak Bonus", pts: "+200 pts", desc: "7-day pickup streak reward" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900 text-sm">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 rounded-full text-xs">{item.pts}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-bold text-neutral-900 mb-4">Your Badges</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Trophy, label: "First Pickup", earned: true },
                { icon: Flame, label: "7-Day Streak", earned: true },
                { icon: Zap, label: "Super Sorter", earned: true },
                { icon: Star, label: "50 Pickups", earned: false },
                { icon: Award, label: "Eco Champion", earned: false },
                { icon: Target, label: "Referral King", earned: false },
              ].map((badge, i) => (
                <div key={i} className={`text-center p-3 rounded-2xl ${badge.earned ? "bg-green-50" : "bg-neutral-100 opacity-50"}`}>
                  <badge.icon className={`w-8 h-8 mx-auto mb-1 ${badge.earned ? "text-[#145C25]" : "text-neutral-400"}`} />
                  <p className="text-xs font-semibold text-neutral-700">{badge.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EcoPointsPage;
