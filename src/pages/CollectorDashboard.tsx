import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Truck, Star, Bell, LogOut, Home, ClipboardList,
  DollarSign, MapPin, Wifi, WifiOff, Settings, Award,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AvailableJobsFeed } from "@/components/collector/AvailableJobsFeed";
import { ActiveJobWorkflow } from "@/components/collector/ActiveJobWorkflow";
import { CollectorWalletCard, type WalletData } from "@/components/collector/CollectorWalletCard";
import { CollectorPerformancePanel, type PerformanceData } from "@/components/collector/CollectorPerformancePanel";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

const CollectorDashboardPage = () => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("jobs");

  // Fetch collector profile
  const { data: profile } = useQuery({
    queryKey: ["collector-profile", user?.id],
    queryFn: async () => {
      if (!isSupabaseAvailable() || !supabase || !user) return null;
      const { data } = await supabase.from("collector_profiles").select("*").eq("profile_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch wallet
  const { data: wallet } = useQuery<WalletData | null>({
    queryKey: ["collector-wallet", user?.id],
    queryFn: async () => {
      if (!isSupabaseAvailable() || !supabase || !user) return null;
      const { data } = await supabase.from("collector_wallets").select("*").eq("collector_id", user.id).maybeSingle();
      if (!data) return null;
      return {
        availableBalanceNgn: data.available_balance_ngn || 0,
        pendingBalanceNgn: data.pending_balance_ngn || 0,
        withdrawableBalanceNgn: data.withdrawable_balance_ngn || 0,
        lifetimeEarningsNgn: data.lifetime_earnings_ngn || 0,
        recentTransactions: [],
      };
    },
    enabled: !!user,
  });

  // Fetch performance
  const { data: performance } = useQuery<PerformanceData | null>({
    queryKey: ["collector-performance", user?.id],
    queryFn: async () => {
      if (!isSupabaseAvailable() || !supabase || !user) return {
        totalPickups: 0, completedJobs: 0, cancelledJobs: 0, averageRating: 5.0,
        acceptanceRate: 100, completionRate: 100, onTimeRate: 100,
        averageResponseTimeSeconds: 30, totalDistanceKm: 0, totalEcoPoints: 0,
        currentLevel: { name: "Bronze", badge: "🥉", pointsToNextLevel: 100, progressPercent: 0 },
        recentAchievements: [],
      };
      const { data } = await supabase.from("collector_performance").select("*").eq("collector_id", user.id).maybeSingle();
      return {
        totalPickups: data?.total_pickups || 0,
        completedJobs: data?.completed_jobs || 0,
        cancelledJobs: data?.cancelled_jobs || 0,
        averageRating: data?.average_rating || 5.0,
        acceptanceRate: data?.acceptance_rate || 100,
        completionRate: data?.completion_rate || 100,
        onTimeRate: data?.on_time_rate || 100,
        averageResponseTimeSeconds: data?.average_response_time || 30,
        totalDistanceKm: data?.total_distance_km || 0,
        totalEcoPoints: data?.total_ecopoints || 0,
        currentLevel: { name: "Bronze", badge: "🥉", pointsToNextLevel: 100, progressPercent: 15 },
        recentAchievements: [
          { name: "First Pickup", icon: "🎯", earnedAt: new Date().toISOString() },
          { name: "10 Jobs", icon: "⭐", earnedAt: new Date().toISOString() },
        ],
      };
    },
    enabled: !!user,
  });

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    if (isSupabaseAvailable() && supabase && user) {
      await supabase.from("collector_profiles").update({ is_online: next, updated_at: new Date().toISOString() }).eq("profile_id", user.id);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-600" /></Link>
          <h1 className="font-bold text-neutral-900">Collector</h1>
          <Badge className={`text-xs ${isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggleOnline} className="text-xs">
            {isOnline ? <WifiOff className="w-4 h-4 mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
            {isOnline ? "Go Offline" : "Go Online"}
          </Button>
          <Link to="/collector/settings" className="p-2 rounded-lg hover:bg-neutral-100"><Settings className="w-5 h-5 text-neutral-500" /></Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xs text-neutral-500">Today</p>
            <p className="text-lg font-extrabold text-[#145C25]">₦{(wallet?.availableBalanceNgn || 0).toLocaleString()}</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xs text-neutral-500">Rating</p>
            <p className="text-lg font-extrabold flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {performance?.averageRating.toFixed(1) || "5.0"}
            </p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xs text-neutral-500">Level</p>
            <p className="text-lg font-extrabold">{performance?.currentLevel.name || "Bronze"}</p>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="jobs" className="rounded-xl text-xs">Jobs</TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl text-xs">Active</TabsTrigger>
            <TabsTrigger value="wallet" className="rounded-xl text-xs">Wallet</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl text-xs">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            <AvailableJobsFeed jobs={[]} loading={false} onAccept={(id) => console.log("Accept", id)} onNavigate={(job) => window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, "_blank")} />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <ActiveJobWorkflow job={null} onUpdateStatus={(id, status) => console.log("Update", id, status)} />
          </TabsContent>
          <TabsContent value="wallet" className="mt-4">
            {wallet && <CollectorWalletCard wallet={wallet} onWithdraw={() => alert("Withdrawal coming soon")} />}
          </TabsContent>
          <TabsContent value="stats" className="mt-4">
            {performance && <CollectorPerformancePanel performance={performance} />}
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-neutral-200 px-4 py-2">
        <div className="flex justify-around max-w-2xl mx-auto">
          {[{ icon: Home, label: "Home", to: "/collector/dashboard" }, { icon: ClipboardList, label: "Jobs", to: "/collector/jobs" }, { icon: DollarSign, label: "Earnings", to: "#" }, { icon: Award, label: "Rewards", to: "#" }].map((item) => (
            <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1 p-2 text-neutral-500 hover:text-[#145C25]">
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CollectorDashboardPage;
