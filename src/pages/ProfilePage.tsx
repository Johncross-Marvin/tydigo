import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Phone, MapPin, Settings, Shield, LogOut, ChevronRight, Award } from "lucide-react";

const ProfilePage = () => {
  const menuItems = [
    { icon: User, label: "Personal Information", desc: "Name, phone, address" },
    { icon: Shield, label: "KYC Verification", desc: "Verify your identity" },
    { icon: MapPin, label: "Saved Addresses", desc: "Home, work, other" },
    { icon: Award, label: "EcoPoints Tier", desc: "Gold Tier — 12,450 pts" },
    { icon: Settings, label: "App Settings", desc: "Notifications, language" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Profile</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Profile Card */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-4 ring-green-100">
              <AvatarFallback className="bg-green-100 text-[#145C25] font-bold text-xl">AB</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900">Amina Bello</h2>
              <div className="flex items-center gap-1 text-sm text-neutral-500 mt-0.5">
                <Phone className="w-3.5 h-3.5" /> +234 800 000 0000
              </div>
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="w-3.5 h-3.5" /> Wuse Zone 2, Abuja
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu */}
        <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors text-left border-b border-neutral-100 last:border-0"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-neutral-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 text-sm">{item.label}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          ))}
        </Card>

        <Link to="/login">
          <Button variant="outline" className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </Link>
      </main>
    </div>
  );
};

export default ProfilePage;
