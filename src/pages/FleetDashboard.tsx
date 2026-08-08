import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Recycle,
  Truck,
  Users,
  MapPin,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Settings,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { useToast } from "@/components/ui/toast-provider";

const FleetDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useSeo({ title: "Fleet Dashboard — Tydigo" });

  const { data: fleetData } = useQuery({
    queryKey: ["fleet-collectors"],
    queryFn: api.getFleetCollectors,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["fleet-analytics"],
    queryFn: api.getFleetAnalytics,
  });

  const collectors = fleetData?.collectors ?? [];
  const analytics = analyticsData ?? {
    totalCollectors: 0,
    activeCollectors: 0,
    totalJobs: 0,
    completedJobs: 0,
    totalRevenue: 0,
    avgRating: 0,
  };

  const menuItems = [
    { icon: Home, label: "Overview", active: true },
    { icon: Truck, label: "Vehicles", active: false },
    { icon: Users, label: "Drivers", active: false },
    { icon: MapPin, label: "Dispatch", active: false },
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
              <span className="text-lg font-bold">Tydigo Fleet</span>
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
          <h1 className="font-bold text-neutral-900">Fleet Dashboard</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="w-5 h-5 text-neutral-500" />
          </Button>
          <Avatar className="w-8 h-8 ring-2 ring-indigo-100">
            <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold text-sm">
              {user?.name?.charAt(0) ?? "F"}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
              Fleet Operations
            </h1>
            <p className="text-neutral-500">Manage your collection vehicles, drivers, and dispatch operations.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Total Drivers</p>
                <p className="text-2xl font-extrabold text-neutral-900">{analytics.totalCollectors}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Active Now</p>
                <p className="text-2xl font-extrabold text-green-600">{analytics.activeCollectors}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Jobs Completed</p>
                <p className="text-2xl font-extrabold text-neutral-900">{analytics.completedJobs}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Avg Rating</p>
                <p className="text-2xl font-extrabold text-amber-500">{analytics.avgRating.toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="drivers">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="drivers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Drivers
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Dispatch
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drivers" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Fleet Drivers</h3>
                  {collectors.length > 0 ? (
                    <div className="space-y-2">
                      {collectors.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                              {c.full_name?.charAt(0) ?? "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{c.full_name}</p>
                            <p className="text-xs text-neutral-500">
                              {c.is_online ? "🟢 Online" : "⚫ Offline"} · {c.total_pickups} pickups · ⭐ {c.rating}
                            </p>
                          </div>
                          {c.active_job_id && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              On Job
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <p className="text-neutral-500 text-sm">No drivers registered yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dispatch" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="font-bold text-neutral-900">Dispatch Center</h3>
                  <p className="text-neutral-500 text-sm mt-1">
                    Assign jobs to available drivers and monitor live operations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Fleet Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Total Jobs</p>
                      <p className="text-xl font-extrabold text-indigo-700">{analytics.totalJobs}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Completion Rate</p>
                      <p className="text-xl font-extrabold text-indigo-700">
                        {analytics.totalJobs > 0
                          ? `${((analytics.completedJobs / analytics.totalJobs) * 100).toFixed(0)}%`
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Total Revenue</p>
                      <p className="text-xl font-extrabold text-indigo-700">
                        ₦{analytics.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Avg Rating</p>
                      <p className="text-xl font-extrabold text-indigo-700">{analytics.avgRating.toFixed(1)} ⭐</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default FleetDashboardPage;
