/**
 * Recycler Marketplace Dashboard — Production
 * 
 * Live marketplace: listings, purchase requests, offers, trades,
 * warehouses, inventory, inspections, settlements, analytics.
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
  ArrowLeft, Package, ShoppingCart, TrendingUp, Warehouse, Gavel,
  Truck, FileText, BarChart3, DollarSign, Leaf, Award, AlertCircle,
  CheckCircle2, Clock, Plus, Search, Filter,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  getMarketplaceListings, getPurchaseRequests, getMyOffers, getMyTrades,
  getMyWarehouses, getWarehouseInventory, getMySettlements,
  getAcceptedMaterials, getRecyclerAnalytics,
} from "@/services/marketplace";

const formatNgn = (v: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(v);
const formatKg = (v: number) => `${v.toLocaleString()} kg`;

const RecyclerDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const profileId = user?.id || "";

  const { data: listings } = useQuery({ queryKey: ["listings"], queryFn: () => getMarketplaceListings({ status: "active" }) });
  const { data: requests } = useQuery({ queryKey: ["purchase-requests", profileId], queryFn: () => getPurchaseRequests(profileId), enabled: !!profileId });
  const { data: offers } = useQuery({ queryKey: ["offers", profileId], queryFn: () => getMyOffers(profileId), enabled: !!profileId });
  const { data: trades } = useQuery({ queryKey: ["trades", profileId], queryFn: () => getMyTrades(profileId), enabled: !!profileId });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses", profileId], queryFn: () => getMyWarehouses(profileId), enabled: !!profileId });
  const { data: settlements } = useQuery({ queryKey: ["settlements", profileId], queryFn: () => getMySettlements(profileId), enabled: !!profileId });
  const { data: materials } = useQuery({ queryKey: ["accepted-materials", profileId], queryFn: () => getAcceptedMaterials(profileId), enabled: !!profileId });
  const { data: analytics } = useQuery({ queryKey: ["recycler-analytics", profileId], queryFn: () => getRecyclerAnalytics(profileId), enabled: !!profileId });

  const activeListings = listings?.filter((l: Record<string,unknown>) => l.status === "active") || [];
  const activeRequests = requests?.filter((r: Record<string,unknown>) => r.status === "active") || [];
  const pendingOffers = offers?.filter((o: Record<string,unknown>) => o.status === "pending") || [];
  const activeTrades = trades?.filter((t: Record<string,unknown>) => !["completed","cancelled"].includes(t.status as string)) || [];
  const totalInventory = warehouses?.reduce((s: number, w: Record<string,unknown>) => s + Number(w.current_capacity || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-600" /></Link>
          <h1 className="font-bold text-neutral-900">Recycler Marketplace</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Active Listings" value={activeListings.length} color="text-green-600" bg="bg-green-50" />
          <KPICard label="My Requests" value={activeRequests.length} color="text-blue-600" bg="bg-blue-50" />
          <KPICard label="Pending Offers" value={pendingOffers.length} color="text-amber-600" bg="bg-amber-50" />
          <KPICard label="Active Trades" value={activeTrades.length} color="text-purple-600" bg="bg-purple-50" />
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-xs text-neutral-500">Purchased</p><p className="font-extrabold text-lg">{formatKg(analytics.totalKgPurchased)}</p></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-xs text-neutral-500">Spent</p><p className="font-extrabold text-lg text-[#145C25]">{formatNgn(analytics.totalSpendNgn)}</p></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-xs text-neutral-500">Trades</p><p className="font-extrabold text-lg">{analytics.completedTrades}/{analytics.totalTrades}</p></CardContent></Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-5 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="overview" className="rounded-xl text-xs">Overview</TabsTrigger>
            <TabsTrigger value="marketplace" className="rounded-xl text-xs">Market</TabsTrigger>
            <TabsTrigger value="trades" className="rounded-xl text-xs">Trades</TabsTrigger>
            <TabsTrigger value="warehouse" className="rounded-xl text-xs">Warehouse</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl text-xs">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Accepted Materials */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Accepted Materials</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(materials || []).slice(0, 8).map((m: Record<string,unknown>, i: number) => (
                    <Badge key={i} variant="outline" className="rounded-full text-xs">
                      {(m as { waste_categories?: { name?: string } }).waste_categories?.name || "Material"}
                    </Badge>
                  ))}
                  {!materials?.length && <p className="text-sm text-neutral-400">No materials configured yet.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Warehouses */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Warehouses ({warehouses?.length || 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(warehouses || []).map((w: Record<string,unknown>, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm font-semibold">{w.name as string}</span>
                    </div>
                    <Badge className="text-xs">{w.status as string || "active"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Available Materials</h2>
              <Badge className="bg-green-100 text-green-700">{activeListings.length} listings</Badge>
            </div>
            {(listings || []).slice(0, 10).map((l: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{l.title as string || "Material"}</p>
                    <p className="text-xs text-neutral-500">{formatKg(Number(l.quantity_available_kg || 0))} • Grade: {l.quality_grade as string || "Standard"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[#145C25]">{formatNgn(Number(l.asking_price_per_kg_minor || 0) / 100)}/kg</p>
                    <Button size="sm" variant="outline" className="mt-1 rounded-xl text-xs">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!listings?.length && <p className="text-center text-neutral-400 py-8">No active listings. Check back soon.</p>}
          </TabsContent>

          <TabsContent value="trades" className="mt-4 space-y-3">
            <h2 className="font-bold">Active Trades</h2>
            {(trades || []).slice(0, 10).map((t: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{t.trade_reference as string || `Trade #${i + 1}`}</p>
                    <p className="text-xs text-neutral-500">{formatKg(Number(t.agreed_quantity_kg || 0))} • {formatNgn(Number(t.total_minor || 0) / 100)}</p>
                  </div>
                  <Badge className={t.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                    {(t.status as string) || "pending"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {!trades?.length && <p className="text-center text-neutral-400 py-8">No trades yet.</p>}
          </TabsContent>

          <TabsContent value="warehouse" className="mt-4 space-y-3">
            <h2 className="font-bold">Inventory</h2>
            {warehouses?.map((w: Record<string,unknown>) => (
              <Card key={w.id as string} className="border-0 shadow-sm">
                <CardHeader className="pb-1"><CardTitle className="text-sm">{w.name as string}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-neutral-500">Capacity: {formatKg(Number(w.capacity_kg || 0))}</p>
                  <Progress value={Math.min(100, (totalInventory / Number(w.capacity_kg || 1)) * 100)} className="h-2 mt-2 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]" />
                </CardContent>
              </Card>
            ))}
            {!warehouses?.length && <p className="text-center text-neutral-400 py-8">No warehouses configured.</p>}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">Purchase Requests</h2>
              <Link to="/partner/request"><Button size="sm" className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-xs"><Plus className="w-3 h-3 mr-1" />New</Button></Link>
            </div>
            {(requests || []).map((r: Record<string,unknown>, i: number) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div><p className="font-bold text-sm">{r.title as string}</p><p className="text-xs text-neutral-500">{formatKg(Number(r.required_quantity_kg || 0))} needed</p></div>
                    <Badge className={(r.status as string) === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{(r.status as string)}</Badge>
                  </div>
                  {r.remaining_quantity_kg !== undefined && (
                    <Progress value={Math.round(((Number(r.required_quantity_kg) - Number(r.remaining_quantity_kg)) / Number(r.required_quantity_kg || 1)) * 100)} className="h-1.5 rounded-full bg-neutral-200 [&>div]:bg-blue-500" />
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function KPICard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <Card className={`border-0 shadow-sm ${bg}`}>
      <CardContent className="p-3 text-center">
        <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
        <p className="text-[10px] text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default RecyclerDashboard;
