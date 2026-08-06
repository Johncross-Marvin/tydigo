/**
 * EcoPoints Economy — Enhanced Dashboard
 * 
 * Full EcoPoints experience: wallet, tiers, badges, leaderboard,
 * challenges, referrals, and redemption.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import {
  ArrowLeft, Award, Wallet, TrendingUp, Gift, Users,
  Trophy, Target, Zap, Star, Shield, Leaf, Crown, Medal,
  Flame, TreePine, Recycle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

const formatNgn = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

const TIERS = [
  { name: "Seed", icon: "🌱", min: 0, color: "bg-stone-100 text-stone-700", multiplier: 1.0 },
  { name: "Sprout", icon: "🌿", min: 500, color: "bg-green-100 text-green-700", multiplier: 1.1 },
  { name: "Green", icon: "🌳", min: 2000, color: "bg-emerald-100 text-emerald-700", multiplier: 1.2 },
  { name: "Forest", icon: "🌲", min: 5000, color: "bg-teal-100 text-teal-700", multiplier: 1.3 },
  { name: "Earth Guardian", icon: "🌍", min: 10000, color: "bg-blue-100 text-blue-700", multiplier: 1.5 },
  { name: "Eco Champion", icon: "🏆", min: 25000, color: "bg-purple-100 text-purple-700", multiplier: 1.7 },
  { name: "Climate Leader", icon: "👑", min: 50000, color: "bg-amber-100 text-amber-700", multiplier: 2.0 },
  { name: "Planet Hero", icon: "🌟", min: 100000, color: "bg-rose-100 text-rose-700", multiplier: 2.5 },
];

const DEMO_LEADERBOARD = [
  { rank: 1, name: "Amina Bello", city: "Abuja", points: 12500, badge: "🏆" },
  { rank: 2, name: "Chidi Okafor", city: "Lagos", points: 10200, badge: "🥈" },
  { rank: 3, name: "Fatima Ibrahim", city: "Kano", points: 8900, badge: "🥉" },
  { rank: 4, name: "Emeka Nnamdi", city: "Abuja", points: 7500, badge: "⭐" },
  { rank: 5, name: "Grace Okonkwo", city: "Port Harcourt", points: 6200, badge: "⭐" },
];

const DEMO_BADGES = [
  { name: "First Pickup", icon: "🎯", desc: "Complete your first waste pickup", earned: true },
  { name: "10 Pickups", icon: "⭐", desc: "Complete 10 pickups", earned: true },
  { name: "100kg Recycled", icon: "♻️", desc: "Recycle 100kg of waste", earned: false, progress: 45 },
  { name: "Perfect Sorter", icon: "✨", desc: "5 pickups with zero contamination", earned: false, progress: 60 },
  { name: "Community Hero", icon: "🦸", desc: "Refer 5 neighbors", earned: false, progress: 20 },
  { name: "Waste Warrior", icon: "⚔️", desc: "Complete 50 pickups", earned: false, progress: 8 },
];

const DEMO_CHALLENGES = [
  { title: "Plastic-Free Week", desc: "Sort all plastic waste for 7 days", reward: 500, participants: 234, daysLeft: 5, icon: "🚫" },
  { title: "Clean City Challenge", desc: "Report 5 illegal dumping sites", reward: 1000, participants: 156, daysLeft: 12, icon: "🏙️" },
  { title: "Organic Waste Champion", desc: "Compost 20kg of organic waste", reward: 800, participants: 89, daysLeft: 20, icon: "🌿" },
];

const EcoPointsPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("wallet");

  const { data: wallet } = useQuery({
    queryKey: ["eco-wallet", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return { balance: user?.ecopoints || 0, lifetime: 0, spent: 0 };
      const { data } = await supabase.from("profiles").select("ecopoints").eq("auth_user_id", user.id).maybeSingle();
      const { data: txns } = await supabase.from("ecopoint_transactions").select("points").eq("profile_id", user.id);
      const earned = txns?.filter((t: Record<string,unknown>) => (t.points as number) > 0).reduce((s: number, t: Record<string,unknown>) => s + Number(t.points), 0) || 0;
      const spent = txns?.filter((t: Record<string,unknown>) => (t.points as number) < 0).reduce((s: number, t: Record<string,unknown>) => s + Math.abs(Number(t.points)), 0) || 0;
      return { balance: data?.ecopoints || 0, lifetime: earned, spent };
    },
    enabled: !!user,
  });

  const currentPoints = wallet?.balance || 0;
  const currentTier = TIERS.filter(t => currentPoints >= t.min).pop() || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-3">
        <Link to="/household/dashboard" className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-600" /></Link>
        <h1 className="font-bold text-neutral-900">EcoPoints</h1>
        <Badge className={`ml-auto ${currentTier.color}`}>{currentTier.icon} {currentTier.name}</Badge>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Balance Hero */}
        <Card className="border-0 bg-gradient-to-br from-[#145C25] via-[#1A7A30] to-[#0D3B1A] text-white shadow-brand-lg">
          <CardContent className="p-6 text-center">
            <p className="text-white/70 text-sm">Your EcoPoints Balance</p>
            <p className="text-4xl font-black mt-2">{currentPoints.toLocaleString()}</p>
            <p className="text-white/60 text-sm mt-1">≈ {formatNgn(currentPoints * 0.10)} value</p>
            {nextTier && (
              <div className="mt-4 bg-white/10 rounded-xl p-3">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{currentTier.icon} {currentTier.name}</span>
                  <span>{nextTier.icon} {nextTier.name}</span>
                </div>
                <Progress value={Math.min(100, ((currentPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100)} className="h-2 rounded-full bg-white/20 [&>div]:bg-amber-400" />
                <p className="text-xs text-white/50 mt-1">{nextTier.min - currentPoints} pts to {nextTier.name}</p>
              </div>
            )}
            <p className="text-xs text-white/40 mt-2">{currentTier.multiplier}x reward multiplier active</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" /><p className="text-lg font-extrabold">{wallet?.lifetime.toLocaleString()}</p><p className="text-[10px] text-neutral-500">Earned</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><Gift className="w-4 h-4 text-amber-500 mx-auto mb-1" /><p className="text-lg font-extrabold">{wallet?.spent.toLocaleString()}</p><p className="text-[10px] text-neutral-500">Redeemed</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><Star className="w-4 h-4 text-purple-500 mx-auto mb-1" /><p className="text-lg font-extrabold">{currentTier.multiplier}x</p><p className="text-[10px] text-neutral-500">Multiplier</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="wallet" className="rounded-xl text-xs">Wallet</TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl text-xs">Badges</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-xl text-xs">Rankings</TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-xl text-xs">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="mt-4 space-y-4">
            {/* How to Earn */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> How to Earn</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {[{ icon: "🚛", label: "Complete Pickup", pts: "+100-1500" }, { icon: "♻️", label: "Sort Plastic", pts: "+300" }, { icon: "🌿", label: "Sort Organic", pts: "+300" }, { icon: "👥", label: "Refer Friend", pts: "+1500" }, { icon: "📸", label: "Clear Photo", pts: "+100" }, { icon: "⭐", label: "Rate Collector", pts: "+50" }].map((item, i) => (
                  <div key={i} className="p-3 bg-neutral-50 rounded-xl text-center">
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-xs font-bold mt-1">{item.label}</p>
                    <p className="text-xs text-green-600 font-semibold">{item.pts}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Redeem */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-amber-500" /> Redeem</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[{ label: "₦500 Discount", pts: 5000, icon: "💳" }, { label: "₦1,000 Discount", pts: 10000, icon: "🏷️" }, { label: "₦500 Airtime", pts: 5000, icon: "📱" }, { label: "Plant 10 Trees", pts: 10000, icon: "🌳" }].map((r, i) => (
                  <button key={i} disabled={currentPoints < r.pts} className="p-3 rounded-xl border-2 border-neutral-200 text-left hover:border-[#145C25] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <span className="text-2xl">{r.icon}</span>
                    <p className="text-sm font-bold mt-1">{r.label}</p>
                    <p className="text-xs text-neutral-500">{r.pts.toLocaleString()} pts</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {DEMO_BADGES.map((b, i) => (
                <Card key={i} className={`border-0 shadow-sm ${!b.earned ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 text-center">
                    <span className="text-3xl">{b.icon}</span>
                    <p className="text-sm font-bold mt-2">{b.name}</p>
                    <p className="text-[10px] text-neutral-500">{b.desc}</p>
                    {b.earned ? (
                      <Badge className="mt-2 bg-green-100 text-green-700">Earned</Badge>
                    ) : (
                      <div className="mt-2">
                        <Progress value={b.progress} className="h-1.5 rounded-full bg-neutral-200 [&>div]:bg-amber-400" />
                        <p className="text-[10px] text-neutral-400 mt-0.5">{b.progress}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4 space-y-3">
            <div className="flex gap-2">
              {["Nigeria", "Abuja", "Monthly"].map(f => <Badge key={f} variant="outline" className="rounded-full">{f}</Badge>)}
            </div>
            {DEMO_LEADERBOARD.map((entry, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${entry.rank <= 3 ? "bg-amber-50 border border-amber-100" : "bg-white border border-neutral-100"}`}>
                <span className="text-xl font-black w-8 text-center">{entry.rank <= 3 ? entry.badge : entry.rank}</span>
                <Avatar className="w-8 h-8 bg-green-100 text-[#145C25] font-bold text-sm">{entry.name[0]}</Avatar>
                <div className="flex-1"><p className="text-sm font-bold">{entry.name}</p><p className="text-[10px] text-neutral-400">{entry.city}</p></div>
                <p className="font-extrabold text-[#145C25]">{entry.points.toLocaleString()}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full rounded-xl">View Full Leaderboard</Button>
          </TabsContent>

          <TabsContent value="challenges" className="mt-4 space-y-3">
            {DEMO_CHALLENGES.map((c, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.icon}</span>
                      <div><p className="font-bold text-sm">{c.title}</p><p className="text-xs text-neutral-500">{c.desc}</p></div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">{c.reward} pts</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>{c.participants} participants</span>
                    <span>{c.daysLeft} days left</span>
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-xs">Join Challenge</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Referral */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-violet-50">
          <CardContent className="p-4 flex items-center gap-4">
            <Users className="w-10 h-10 text-purple-500" />
            <div className="flex-1">
              <p className="font-bold text-sm">Refer a Friend</p>
              <p className="text-xs text-neutral-500">Earn 1,500 EcoPoints for each verified referral</p>
              <p className="text-xs font-mono bg-white rounded-lg px-2 py-1 mt-1 inline-block">TYD-{user?.id?.slice(0, 6) || "XXXXXX"}</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs">Share</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EcoPointsPage;
