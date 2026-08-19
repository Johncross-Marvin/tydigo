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
  MapPin,
  Calendar,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Users,
  BarChart3,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useSeo, seoConfig } from "@/lib/seo";
import { useToast } from "@/components/ui/toast-provider";
import { getBusinessLocations, getImpactReport } from "@/services/business";

const EstateDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo({ title: "Estate Dashboard — Tydigo" });

  const { data: locations = [] } = useQuery({
    queryKey: ["estate-locations", user?.id],
    queryFn: () => getBusinessLocations(user?.id ?? ""),
    enabled: !!user?.id,
  });

  const { data: impact } = useQuery({
    queryKey: ["estate-impact", user?.id],
    queryFn: () => getImpactReport(user?.id ?? "", "month"),
    enabled: !!user?.id,
  });

  const menuItems = [
    { icon: Home, label: "Overview", active: true },
    { icon: MapPin, label: "Locations", active: false },
    { icon: Calendar, label: "Collections", active: false },
    { icon: Users, label: "Residents", active: false },
    { icon: BarChart3, label: "Reports", active: false },
    { icon: Leaf, label: "Sustainability", active: false },
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
              <span className="text-lg font-bold">Tydigo Estate</span>
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
          <h1 className="font-bold text-neutral-900">Estate Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-teal-100">
            <AvatarFallback className="bg-teal-100 text-teal-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "E"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Welcome, {user?.name?.split(" ")[0] ?? "Estate Manager"}
            </h1>
            <p className="text-neutral-500">Manage waste operations across your estate or community.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Locations</p>
                <p className="text-2xl font-extrabold text-neutral-900">{locations.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Scheduled</p>
                <p className="text-2xl font-extrabold text-neutral-900">0</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Waste Diverted</p>
                <p className="text-2xl font-extrabold text-neutral-900">
                  {impact ? `${(impact.total_waste_kg / 1000).toFixed(1)}t` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Recycling Rate</p>
                <p className="text-2xl font-extrabold text-green-600">
                  {impact ? `${((impact.recycled_kg / Math.max(impact.total_waste_kg, 1)) * 100).toFixed(0)}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="collections" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Collections
              </TabsTrigger>
              <TabsTrigger value="sustainability" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Sustainability
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-2">Estate Overview</h3>
                  <p className="text-neutral-500 text-sm">
                    Your estate waste management dashboard provides centralized control over
                    collection schedules, bulk pickups, and sustainability tracking for your community.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                      Schedule Bulk Pickup
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Add Location
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {locations.length > 0 && (
                <Card className="border-0 shadow-brand-sm rounded-2xl">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-neutral-900 mb-3">Estate Locations</h3>
                    <div className="space-y-2">
                      {locations.map((loc) => (
                        <div key={loc.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                          <MapPin className="w-4 h-4 text-teal-500" />
                          <div>
                            <p className="font-semibold text-sm">{loc.label}</p>
                            <p className="text-xs text-neutral-500">{loc.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="collections" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="font-bold text-neutral-900">Scheduled Collections</h3>
                  <p className="text-neutral-500 text-sm mt-1">
                    No active collections. Schedule a bulk pickup to get started.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sustainability" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Estate Sustainability</h3>
                  {impact ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-600 font-medium">Carbon Offset</p>
                        <p className="text-xl font-extrabold text-green-700">{impact.carbon_offset_kg.toFixed(0)} kg</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-600 font-medium">Trees Saved</p>
                        <p className="text-xl font-extrabold text-green-700">{impact.trees_saved}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-600 font-medium">Landfill Diverted</p>
                        <p className="text-xl font-extrabold text-green-700">{impact.landfill_diverted_kg.toFixed(0)} kg</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-600 font-medium">Total Recycled</p>
                        <p className="text-xl font-extrabold text-green-700">{impact.recycled_kg.toFixed(0)} kg</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-sm">Start collecting waste to see your sustainability impact.</p>
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

export default EstateDashboardPage;
