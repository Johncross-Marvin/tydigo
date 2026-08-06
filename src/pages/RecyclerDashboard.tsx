/**
 * Recycler Marketplace Dashboard
 * 
 * Enterprise dashboard for recyclers, BSF farms, compost operators,
 * and material buyers. Shows inventory, purchase requests, marketplace,
 * warehouse capacity, and transaction history.
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
  ArrowLeft, Building2, Package, ShoppingCart, TrendingUp,
  Warehouse, Gavel, Truck, FileText, BarChart3, Settings,
  DollarSign, Leaf, Award, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

const formatNgn = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);

const RecyclerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch recycler profile
  const { data: profile } = useQuery({
    queryKey: ["recycler-profile", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return null;
      const { data } = await supabase.from("partner_profiles").select("*").eq("profile_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch purchase requests
  const { data: purchaseRequests } = useQuery({
    queryKey: ["purchase-requests", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      const { data } = await supabase.from("partner_material_requests").select("*").eq("partner_id", user.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch waste batches (incoming)
  const { data: incomingBatches } = useQuery({
    queryKey: ["incoming-batches", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      const { data } = await supabase.from("waste_batches").select("*").eq("partner_id", user.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Marketplace listings
  const { data: listings } = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase.from("waste_batches").select("*").eq("verified", true).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const verifiedBatches = incomingBatches?.filter((b: Record<string,unknown>) => b.verified) || [];
  const pendingBatches = incomingBatches?.filter((b: Record<string,unknown>) => !b.verified) || [];
  const totalPurchased = incomingBatches?.reduce((s: number, b: Record<string,unknown>) => s + Number(b.quantity_kg || 0), 0) || 0;
  const impactCredits = profile?.impact_credits || 0;

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-600" /></Link>
          <h1 className="font-bold text-neutral-900">Recycler Marketplace</h1>
          {profile?.verified && <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-3"><p className="text-xs text-neutral-500">Total Purchased</p><p className="text-lg font-extrabold text-[#145C25]">{totalPurchased.toLocaleString()} kg</p></CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-sky-50">
            <CardContent className="p-3"><p className="text-xs text-neutral-500">Active Requests</p><p className="text-lg font-extrabold text-blue-600">{purchaseRequests?.length || 0}</p></CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-3"><p className="text-xs text-neutral-500">Impact Credits</p><p className="text-lg font-extrabold text-amber-600">{impactCredits.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-3"><p className="text-xs text-neutral-500">Pending</p><p className="text-lg font-extrabold text-purple-600">{pendingBatches.length}</p></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="overview" className="rounded-xl text-xs">Overview</TabsTrigger>
            <TabsTrigger value="marketplace" className="rounded-xl text-xs">Marketplace</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl text-xs">Requests</TabsTrigger>
            <TabsTrigger value="batches" className="rounded-xl text-xs">Batches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Marketplace Overview */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Marketplace Activity</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <Package className="w-6 h-6 text-[#145C25] mx-auto mb-1" />
                  <p className="text-xl font-extrabold">{listings?.length || 0}</p>
                  <p className="text-xs text-neutral-500">Available Listings</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-extrabold">{purchaseRequests?.length || 0}</p>
                  <p className="text-xs text-neutral-500">Open Requests</p>
                </div>
              </CardContent>
            </Card>

            {/* Impact */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Leaf className="w-4 h-4 text-green-500" /> Environmental Impact</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Waste Diverted</span><span className="font-bold">{totalPurchased.toLocaleString()} kg</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">CO₂ Equivalent Saved</span><span className="font-bold">{(totalPurchased * 0.5).toLocaleString()} kg</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Impact Credits</span><span className="font-bold text-amber-600">{impactCredits.toLocaleString()}</span></div>
                <Progress value={Math.min(100, (totalPurchased / 10000) * 100)} className="h-2 rounded-full bg-neutral-200 [&>div]:bg-green-500" />
                <p className="text-xs text-neutral-400">{Math.round((totalPurchased / 10000) * 100)}% to 10,000kg milestone</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-900">Available Waste Batches</h2>
              <Badge className="bg-green-100 text-green-700">{listings?.length || 0} listings</Badge>
            </div>
            {(listings || []).slice(0, 8).map((batch: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm capitalize">{(batch.material_type as string)?.replace(/_/g, " ") || "Waste"}</p>
                    <p className="text-xs text-neutral-500">{Number(batch.quantity_kg || 0).toLocaleString()} kg • Grade: {(batch.quality_grade as string) || "Standard"}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={batch.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                      {batch.verified ? "Verified" : "Pending"}
                    </Badge>
                    <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-900">Purchase Requests</h2>
              <Link to="/partner/request">
                <Button size="sm" className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-xs">
                  + New Request
                </Button>
              </Link>
            </div>
            {(purchaseRequests || []).map((req: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm capitalize">{(req.material as string)?.replace(/_/g, " ") || "Material"}</p>
                      <p className="text-xs text-neutral-500">{Number(req.quantity_kg || 0).toLocaleString()} kg needed</p>
                    </div>
                    <Badge className={req.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                      {(req.status as string) || "pending"}
                    </Badge>
                  </div>
                  {req.delivery_address && <p className="text-xs text-neutral-400 truncate">Delivery: {(req.delivery_address as string)}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="batches" className="mt-4 space-y-3">
            <h2 className="font-bold text-neutral-900">Received Batches</h2>
            {(incomingBatches || []).slice(0, 10).map((batch: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm capitalize">{(batch.material_type as string)?.replace(/_/g, " ") || "Material"}</p>
                    <p className="text-xs text-neutral-500">{Number(batch.quantity_kg || 0).toLocaleString()} kg • {new Date((batch.created_at as string) || "").toLocaleDateString()}</p>
                  </div>
                  <Badge className={batch.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {batch.verified ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <AlertCircle className="w-3 h-3 mr-1 inline" />}
                    {batch.verified ? "Verified" : "Pending"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default RecyclerDashboard;
