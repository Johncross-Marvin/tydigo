/**
 * Collector Jobs Page — Active job workflow + queue
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, MapPin, Clock, Truck, Package, Navigation,
  CheckCircle2, XCircle, AlertCircle, Phone, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { getMyTrades } from "@/services/marketplace";

const CollectorJobsPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("current");

  const { data: assignments } = useQuery({
    queryKey: ["collector-assignments", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      // collector_assignments.collector_id references profiles.id (not collector_profiles.id)
      const { data } = await supabase.from("collector_assignments").select("*, pickup_requests(*)").eq("collector_id", user.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const active = assignments?.filter((a: Record<string,unknown>) => a.status === "accepted" || a.status === "offered") || [];
  const completed = assignments?.filter((a: Record<string,unknown>) => a.status === "completed") || [];
  const current = active[0];

  const { data: achievements } = useQuery({
    queryKey: ["collector-achievements", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      const { data } = await supabase.from("collector_achievements").select("*").order("sort_order");
      // collector_achievement_awards.collector_profile_id references collector_profiles.id
      // Need to resolve collector_profiles.id from profiles.id
      const { data: cp } = await supabase.from("collector_profiles").select("id").eq("profile_id", user.id).maybeSingle();
      const cpId = cp?.id;
      const { data: earned } = cpId
        ? await supabase.from("collector_achievement_awards").select("achievement_id").eq("collector_profile_id", cpId)
        : { data: [] };
      const earnedIds = new Set((earned || []).map((e: Record<string,unknown>) => e.achievement_id));
      return (data || []).map((a: Record<string,unknown>) => ({ ...a, earned: earnedIds.has(a.id as string) }));
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["collector-profile", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return null;
      const { data } = await supabase.from("collector_profiles").select("*").eq("profile_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-3">
        <Link to="/collector/dashboard" className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-600" /></Link>
        <h1 className="font-bold text-neutral-900">My Jobs</h1>
        <Badge className="ml-auto">{active.length} active</Badge>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Current Job */}
        {current && (
          <Card className="border-0 shadow-brand-lg bg-gradient-to-br from-[#145C25] to-[#1A7A30] text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-white/20 text-white">Current Job</Badge>
                <Badge className="bg-amber-400 text-amber-900">{current.status}</Badge>
              </div>
              <p className="text-xl font-extrabold mb-1">{(current.pickup_requests as Record<string,unknown>)?.pickup_code as string || "N/A"}</p>
              <p className="text-white/70 text-sm">{(current.pickup_requests as Record<string,unknown>)?.pickup_address as string || "Address pending"}</p>
              <div className="flex gap-3 mt-4">
                <Button size="sm" className="bg-white text-[#145C25] hover:bg-white/90 rounded-xl">
                  <Navigation className="w-3 h-3 mr-1" /> Navigate
                </Button>
                <Button size="sm" variant="ghost" className="text-white border-white/20 rounded-xl">
                  <Phone className="w-3 h-3 mr-1" /> Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-2xl font-extrabold text-[#145C25]">{completed.length}</p><p className="text-[10px] text-neutral-500">Completed</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-2xl font-extrabold text-amber-600">{active.length}</p><p className="text-[10px] text-neutral-500">Active</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-2xl font-extrabold">{profile?.rating_average?.toFixed(1) || "5.0"}⭐</p><p className="text-[10px] text-neutral-500">Rating</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="current" className="rounded-xl text-xs">Current</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl text-xs">History</TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-xl text-xs">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4 space-y-3">
            {active.length === 0 && <p className="text-center text-neutral-400 py-8">No active jobs. Go online to receive pickups.</p>}
            {active.map((a: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{((a.pickup_requests as Record<string,unknown>)?.pickup_code as string) || "Pickup"}</p>
                    <p className="text-xs text-neutral-500 truncate max-w-[200px]">{((a.pickup_requests as Record<string,unknown>)?.pickup_address as string) || ""}</p>
                  </div>
                  <Badge className={a.status === "accepted" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{(a.status as string)}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {completed.length === 0 && <p className="text-center text-neutral-400 py-8">No completed jobs yet.</p>}
            {completed.slice(0, 10).map((a: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4"><p className="font-bold text-sm">{((a.pickup_requests as Record<string,unknown>)?.pickup_code as string) || "Pickup"}</p><p className="text-xs text-neutral-500">{new Date((a.completed_at as string) || "").toLocaleDateString()}</p></CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {(achievements || []).map((a: Record<string,unknown>, i: number) => (
                <Card key={i} className={`border-0 shadow-sm ${!a.earned ? "opacity-50" : ""}`}>
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">{a.icon as string}</span>
                    <p className="text-sm font-bold mt-1">{a.name as string}</p>
                    <p className="text-[10px] text-neutral-500">{a.description as string}</p>
                    {a.earned ? <Badge className="mt-2 bg-green-100 text-green-700 text-xs">Earned</Badge> : <Badge className="mt-2 bg-gray-100 text-gray-500 text-xs">Locked</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CollectorJobsPage;
