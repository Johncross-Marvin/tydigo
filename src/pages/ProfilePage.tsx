import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, User, Phone, MapPin, Settings, Shield, LogOut,
  ChevronRight, Award, Mail, Monitor, Clock, KeyRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const accountItems = [
    { icon: User, label: "Personal Information", desc: "Name, phone, address", path: "/household/profile" },
    { icon: Mail, label: "Change Email", desc: "Update your email address", path: "/household/change-email" },
    { icon: Phone, label: "Change Phone", desc: "Update your phone number", path: "/household/change-phone" },
    { icon: KeyRound, label: "Change Password", desc: "Update your password", path: "/forgot-password" },
  ];

  const securityItems = [
    { icon: Shield, label: "KYC Verification", desc: "Verify your identity", path: "/household/profile" },
    { icon: Monitor, label: "Device Sessions", desc: "Manage active devices", path: "/household/devices" },
    { icon: Clock, label: "Security Logs", desc: "View account activity", path: "/household/security" },
  ];

  const otherItems = [
    { icon: Award, label: "EcoPoints Tier", desc: `${(user?.ecopoints ?? 0).toLocaleString()} pts saved`, path: "/household/ecopoints" },
    { icon: Settings, label: "App Settings", desc: "Notifications, language", path: "/household/profile" },
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
              <AvatarFallback className="bg-green-100 text-[#145C25] font-bold text-xl">
                {(user?.name ?? "WG").split(" ").map((name) => name[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900">{user?.name ?? "Tydigo User"}</h2>
              <div className="flex items-center gap-1 text-sm text-neutral-500 mt-0.5">
                <Phone className="w-3.5 h-3.5" /> {user?.phone || "No phone"}
              </div>
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="w-3.5 h-3.5" /> {user?.address || `${user?.city ?? "Abuja"}, ${user?.state ?? "FCT"}`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Section */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Account</h3>
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
            {accountItems.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
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
        </div>

        {/* Security Section */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Security</h3>
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
            {securityItems.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
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
        </div>

        {/* Other Section */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Other</h3>
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden">
            {otherItems.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
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
        </div>

        <Button
          variant="outline"
          onClick={() => void logout().then(() => navigate("/login"))}
          className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </main>
    </div>
  );
};

export default ProfilePage;
