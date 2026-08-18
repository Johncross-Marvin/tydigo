import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Recycle,
  Building2,
  BarChart3,
  MapPin,
  Calendar,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { useSeo, seoConfig } from "@/lib/seo";
import { BulkScheduler } from "@/components/business/BulkScheduler";
import { SubscriptionPlans } from "@/components/business/SubscriptionPlans";
import { ImpactReport } from "@/components/business/ImpactReport";
import { MultiAddressManager } from "@/components/business/MultiAddressManager";
import { useToast } from "@/components/ui/toast-provider";
import {
  getBusinessLocations,
  addBusinessLocation,
  getImpactReport,
} from "@/services/business";

const BusinessDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo(seoConfig.businessDashboard);

  const { data: locations = [] } = useQuery({
    queryKey: ["business-locations", user?.id],
    queryFn: () => getBusinessLocations(user?.id ?? ""),
    enabled: !!user?.id,
  });

  const { data: impactData } = useQuery({
    queryKey: ["impact-report", user?.id],
    queryFn: () => getImpactReport(user?.id ?? "", "month"),
    enabled: !!user?.id,
  });

  const handleBulkSchedule = async (data: {
    locationIds: string[];
    wasteType: string;
    weightKg: number;
    scheduleWindow: string;
    frequency: string;
  }) => {
    if (!supabase || !user) {
      toastError("Scheduling failed", "Not authenticated.");
      return;
    }
    try {
      const pickups = data.locationIds.map((locationId) => ({
        customer_id: user.id,
        waste_type: data.wasteType,
        estimated_weight_kg: data.weightKg,
        pickup_address: locationId,
        requested_window: data.scheduleWindow,
        status: "requested",
        payment_status: "pending",
        pickup_code: `TYD-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
      const { error } = await supabase.from("pickup_requests").insert(pickups);
      if (error) throw error;
      success("Pickups Scheduled", `${data.locationIds.length} pickups have been scheduled.`);
    } catch (err) {
      toastError("Scheduling failed", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleAddLocation = async (address: string, label: string) => {
    if (!user) return;
    try {
      await addBusinessLocation(user.id, address, label);
      success("Location Added", `"${label}" has been added.`);
    } catch (err) {
      toastError("Failed to add location", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const handleRemoveLocation = (id: string) => {
    toastError("Remove Location", "This feature will be available soon.");
  };

  const handleSelectPlan = (planId: string) => {
    success("Plan Selected", `You've selected the ${planId} plan. Our team will contact you.`);
  };

  const handleDownloadReport = () => {
    success("Report Downloading", "Your impact report is being generated.");
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", active: true },
    { icon: Calendar, label: "Schedule", active: false },
    { icon: BarChart3, label: "Reports", active: false },
    { icon: MapPin, label: "Locations", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A2F14] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Recycle className="w-5 h-5 text-amber-400" />
            </div>
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
          <h1 className="font-bold text-neutral-900">Business Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-green-100">
            <AvatarFallback className="bg-green-100 text-[#145C25] font-bold text-sm">
              {user?.name?.charAt(0) ?? "B"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Welcome, {user?.name?.split(" ")[0] ?? "Business"}
            </h1>
            <p className="text-neutral-500">Manage your waste collection across all locations.</p>
          </div>

          <Tabs defaultValue="schedule">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Plans
              </TabsTrigger>
              <TabsTrigger value="impact" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Impact
              </TabsTrigger>
              <TabsTrigger value="locations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Locations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-4">
              <BulkScheduler locations={locations} onSchedule={handleBulkSchedule} />
            </TabsContent>

            <TabsContent value="plans" className="mt-4">
              <SubscriptionPlans onSelect={handleSelectPlan} />
            </TabsContent>

            <TabsContent value="impact" className="mt-4">
              <ImpactReport report={impactData} onDownload={handleDownloadReport} />
            </TabsContent>

            <TabsContent value="locations" className="mt-4">
              <MultiAddressManager
                locations={locations}
                onAdd={handleAddLocation}
                onRemove={handleRemoveLocation}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default BusinessDashboardPage;
