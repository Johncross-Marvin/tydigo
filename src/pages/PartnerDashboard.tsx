import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  ShoppingCart,
  Star,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/lib/supabase";
import { useSeo, seoConfig } from "@/lib/seo";
import { MaterialMarketplace } from "@/components/partner/MaterialMarketplace";
import { BatchTracker } from "@/components/partner/BatchTracker";
import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { QualityVerification } from "@/components/partner/QualityVerification";
import { useToast } from "@/components/ui/toast-provider";

const PartnerDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo(seoConfig.partnerDashboard);

  const { data: requestsData } = useQuery({
    queryKey: ["partner-requests"],
    queryFn: async () => {
      if (!supabase || !user) return { requests: [] };
      const profileId = user.id; // profiles.id
      const { data } = await supabase.from("partner_material_requests").select("*").eq("partner_id", profileId).order("created_at", { ascending: false }).limit(10);
      return { requests: data || [] };
    },
  });

  const requests = requestsData?.requests ?? [];
  const activeBatches = requests.filter((r) => r.is_active !== false);

  const handleRequestMaterial = async (materialId: string) => {
    if (!supabase || !user) {
      toastError("Request failed", "Not authenticated.");
      return;
    }
    try {
      // The marketplace lists existing partner_material_requests. "Requesting"
      // a material creates a new request row referencing the source material.
      const source = requests.find((r) => r.id === materialId);
      if (!source) {
        toastError("Request failed", "Material not found.");
        return;
      }
      const { error } = await supabase.from("partner_material_requests").insert({
        partner_id: user.id,
        material_type: source.material_type,
        quantity_kg: source.quantity_kg,
        price_per_kg_ngn: source.price_per_kg_ngn,
        preferred_city: source.preferred_city,
        is_active: true,
      });
      if (error) throw error;
      success("Request Sent", "Your material request has been submitted.");
    } catch (err) {
      toastError("Request failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleRateQuality = async (batchId: string, rating: number, notes?: string) => {
    if (!supabase || !user) {
      toastError("Rating failed", "Not authenticated.");
      return;
    }
    try {
      const { error } = await supabase.from("ratings").insert({
        pickup_id: null,
        rater_id: user.id,
        ratee_id: null,
        score: rating,
        comment: notes ?? null,
      });
      if (error) throw error;
      success("Quality Rated", `You rated this batch ${rating} stars.`);
    } catch (err) {
      toastError("Rating failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", active: true },
    { icon: ShoppingCart, label: "Marketplace", active: false },
    { icon: Package, label: "My Batches", active: false },
    { icon: BarChart3, label: "Analytics", active: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A2F14] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size={36} className="bg-white/15" />
            <span className="text-xl font-bold">
              Ty<span className="text-amber-400">digo</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left ${
                item.active
                  ? "bg-[#145C25] text-white shadow-lg"
                  : "text-green-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700/50">
          <button
            onClick={() => void logout().then(() => navigate("/login"))}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-green-300 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0A2F14] text-white p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">Tydigo</span>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left ${
                    item.active ? "bg-[#145C25] text-white" : "text-green-200 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
          <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-100" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <h1 className="font-bold text-neutral-900">Partner Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-purple-100">
            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "P"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Welcome, {user?.name?.split(" ")[0] ?? "Partner"}
            </h1>
            <p className="text-neutral-500">Source recyclable materials and track your batches.</p>
          </div>

          <PartnerAnalytics
            totalSourced={requests.reduce((sum, r) => sum + r.quantity_kg, 0)}
            totalSpent={requests.reduce((sum, r) => sum + r.quantity_kg * r.price_per_kg_ngn, 0)}
            avgPricePerKg={requests.length > 0
              ? requests.reduce((sum, r) => sum + r.price_per_kg_ngn, 0) / requests.length
              : 0}
            supplierRating={null}
            activeBatches={activeBatches.length}
          />

          <Tabs defaultValue="marketplace">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="marketplace" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                My Batches ({activeBatches.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="marketplace" className="mt-4">
              <MaterialMarketplace
                materials={requests}
                onRequest={handleRequestMaterial}
              />
            </TabsContent>

            <TabsContent value="batches" className="mt-4 space-y-4">
              <BatchTracker batches={activeBatches} />
              {activeBatches.length > 0 && (
                <QualityVerification
                  batchId={activeBatches[0].id}
                  material={activeBatches[0].material_type}
                  onRate={handleRateQuality}
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default PartnerDashboardPage;
