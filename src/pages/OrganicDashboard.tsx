import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Recycle,
  Leaf,
  Warehouse,
  Truck,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Settings,
  Droplets,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { useToast } from "@/components/ui/toast-provider";

const OrganicDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo({ title: "Organic Partner Dashboard — Tydigo" });

  const { data: impactData } = useQuery({
    queryKey: ["organic-impact"],
    queryFn: () => api.getImpactReport("month"),
  });

  const impact = impactData?.report;

  const menuItems = [
    { icon: Home, label: "Overview", active: true },
    { icon: Leaf, label: "Feedstock", active: false },
    { icon: Warehouse, label: "Inventory", active: false },
    { icon: Truck, label: "Deliveries", active: false },
    { icon: BarChart3, label: "Analytics", active: false },
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
              <span className="text-lg font-bold">Tydigo Organic</span>
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
          <h1 className="font-bold text-neutral-900">Organic Partner Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-lime-100">
            <AvatarFallback className="bg-lime-100 text-lime-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "O"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Organic Partner Operations
            </h1>
            <p className="text-neutral-500">Manage feedstock intake, processing, and environmental impact.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Daily Capacity</p>
                <p className="text-2xl font-extrabold text-neutral-900">— kg</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Today's Intake</p>
                <p className="text-2xl font-extrabold text-green-600">0 kg</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Processing</p>
                <p className="text-2xl font-extrabold text-amber-500">0 kg</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">CO₂ Offset</p>
                <p className="text-2xl font-extrabold text-lime-600">
                  {impact ? `${impact.carbon_offset_kg.toFixed(0)} kg` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="feedstock">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="feedstock" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Feedstock
              </TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Inventory
              </TabsTrigger>
              <TabsTrigger value="impact" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Impact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedstock" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Feedstock Marketplace</h3>
                  <p className="text-neutral-500 text-sm mb-4">
                    Source organic waste feedstock for BSF farming, composting, or livestock feed production.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="border border-lime-200 bg-lime-50/50 rounded-xl">
                      <CardContent className="p-4">
                        <Droplets className="w-6 h-6 text-lime-600 mb-2" />
                        <p className="font-semibold text-sm">Food Waste</p>
                        <p className="text-xs text-neutral-500">Restaurant & household organic waste</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-lime-200 bg-lime-50/50 rounded-xl">
                      <CardContent className="p-4">
                        <Leaf className="w-6 h-6 text-lime-600 mb-2" />
                        <p className="font-semibold text-sm">Agricultural Waste</p>
                        <p className="text-xs text-neutral-500">Crop residue & farm byproducts</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6 text-center">
                  <Warehouse className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="font-bold text-neutral-900">Organic Inventory</h3>
                  <p className="text-neutral-500 text-sm mt-1">
                    Track your processed organic materials and finished products.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Environmental Impact</h3>
                  {impact ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-lime-50 rounded-xl p-4">
                        <p className="text-xs text-lime-600 font-medium">Carbon Offset</p>
                        <p className="text-xl font-extrabold text-lime-700">{impact.carbon_offset_kg.toFixed(0)} kg</p>
                      </div>
                      <div className="bg-lime-50 rounded-xl p-4">
                        <p className="text-xs text-lime-600 font-medium">Trees Equivalent</p>
                        <p className="text-xl font-extrabold text-lime-700">{impact.trees_saved}</p>
                      </div>
                      <div className="bg-lime-50 rounded-xl p-4">
                        <p className="text-xs text-lime-600 font-medium">Landfill Diverted</p>
                        <p className="text-xl font-extrabold text-lime-700">{impact.landfill_diverted_kg.toFixed(0)} kg</p>
                      </div>
                      <div className="bg-lime-50 rounded-xl p-4">
                        <p className="text-xs text-lime-600 font-medium">Total Processed</p>
                        <p className="text-xl font-extrabold text-lime-700">{impact.recycled_kg.toFixed(0)} kg</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-sm">Start processing organic waste to see your impact.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default OrganicDashboardPage;
