/**
 * Tydigo Profile Dashboard
 *
 * Premium profile overview with completion %, KYC status,
 * wallet balance, EcoPoints, quick actions, and activity.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, MapPin, Shield, Wallet, Award, Settings,
  ChevronRight, Camera, CreditCard, PhoneCall, Clock, LogOut,
  CheckCircle2, AlertTriangle, Clock3, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getProfile, syncProfileCompletion, type Profile } from "@/services/profile";
import { getWallet } from "@/services/wallet";
import { getEcoPointsWallet } from "@/services/wallet";
import { getKycStatus } from "@/services/kyc";
import { getAddresses } from "@/services/address";
import { getBankAccounts } from "@/services/bank";
import { getEmergencyContacts } from "@/services/emergency";
import { getActivityLogs } from "@/services/activity";
import { getRoleLabel } from "@/services/role";

const ProfileDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [addressCount, setAddressCount] = useState(0);
  const [bankCount, setBankCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProfile(user.id),
      getWallet(user.id),
      getEcoPointsWallet(user.id),
      getKycStatus(user.id),
      getAddresses(user.id),
      getBankAccounts(user.id),
      getEmergencyContacts(user.id),
      getActivityLogs(user.id, 3),
    ]).then(([p, w, ep, kyc, addrs, banks, emerg, activity]) => {
      setProfile(p);
      if (p) {
        const pct = p.profile_completion || 0;
        setCompletionPct(pct);
        if (pct < 100) syncProfileCompletion(p.id).then(setCompletionPct);
      }
      setWalletBalance(w?.balance_ngn || 0);
      setEcoPoints(ep?.balance || 0);
      setKycStatus(kyc.is_verified ? "approved" : kyc.documents.length > 0 ? "pending" : "not_started");
      setAddressCount(addrs.length);
      setBankCount(banks.length);
      setEmergencyCount(emerg.length);
      setRecentActivity(activity.map((a) => a.description));
      setLoading(false);
    });
  }, [user]);

  const initials = (profile?.full_name || user?.name || "TU")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const kycBadge = kycStatus === "approved"
    ? { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Verified" }
    : kycStatus === "pending"
      ? { icon: Clock3, color: "bg-amber-100 text-amber-700", label: "Pending" }
      : { icon: AlertTriangle, color: "bg-red-100 text-red-700", label: "Not Started" };

  const KycIcon = kycBadge.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">My Profile</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-24">
        {/* Profile Card */}
        <Card className="border-0 shadow-brand-lg rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#145C25] to-green-700 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 ring-4 ring-white/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-white/20 text-white font-bold text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => navigate("/household/profile/edit")}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-[#145C25] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-extrabold">{profile?.full_name || user?.name || "Tydigo User"}</h2>
                <p className="text-white/70 text-sm">{getRoleLabel(user?.role || "household")}</p>
                <p className="text-white/50 text-xs mt-0.5">@{profile?.username || "user"}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-3">
            {/* Completion */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-neutral-700">Profile Completion</span>
                <span className="text-sm font-bold text-[#145C25]">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-50 rounded-2xl p-3 text-center">
                <Wallet className="w-5 h-5 text-[#145C25] mx-auto mb-1" />
                <p className="text-lg font-extrabold text-neutral-900">₦{walletBalance.toLocaleString()}</p>
                <p className="text-xs text-neutral-500">Wallet</p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-3 text-center">
                <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-neutral-900">{ecoPoints.toLocaleString()}</p>
                <p className="text-xs text-neutral-500">EcoPoints</p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-3 text-center">
                <KycIcon className={`w-5 h-5 mx-auto mb-1 ${kycStatus === "approved" ? "text-green-600" : kycStatus === "pending" ? "text-amber-600" : "text-red-500"}`} />
                <Badge className={`text-xs ${kycBadge.color}`}>{kycBadge.label}</Badge>
                <p className="text-xs text-neutral-500 mt-0.5">KYC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Quick Actions</h3>
          <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
            {[
              { icon: User, label: "Edit Profile", desc: "Name, bio, photo", path: "/household/profile/edit" },
              { icon: MapPin, label: "Addresses", desc: `${addressCount} saved`, path: "/household/profile/addresses" },
              { icon: CreditCard, label: "Bank Accounts", desc: `${bankCount} linked`, path: "/household/profile/bank" },
              { icon: PhoneCall, label: "Emergency Contacts", desc: `${emergencyCount} added`, path: "/household/profile/emergency" },
              { icon: Shield, label: "KYC Verification", desc: kycStatus === "approved" ? "Verified" : "Complete now", path: "/household/profile/kyc" },
              { icon: Settings, label: "Privacy & Settings", desc: "Notifications, language", path: "/household/profile/settings" },
              { icon: Clock, label: "Activity History", desc: "Recent actions", path: "/household/profile/activity" },
            ].map((item, i) => (
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

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Recent Activity</h3>
            <Card className="border-0 shadow-brand-lg rounded-2xl overflow-hidden">
              {recentActivity.map((desc, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-neutral-100 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#145C25] flex-shrink-0" />
                  <p className="text-sm text-neutral-700">{desc}</p>
                </div>
              ))}
            </Card>
          </div>
        )}

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

export default ProfileDashboardPage;
