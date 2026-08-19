import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
  Plus,
  Star,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/BrandMark";
import { useSeo } from "@/lib/seo";
import { useToast } from "@/components/ui/toast-provider";
import {
  getFleetProfile,
  getFleetDrivers,
  getFleetVehicles,
  getFleetOverview,
  addFleetVehicle,
  updateFleetVehicleStatus,
  type FleetProfile,
  type FleetDriver,
  type FleetVehicle,
  type FleetOverview,
} from "@/services/fleet";

const FleetDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: "truck",
    brand: "",
    model: "",
    year: "",
    plateNumber: "",
    capacityKg: "",
    fuelType: "",
  });
  useSeo({ title: "Fleet Dashboard — Tydigo" });

  const profileId = user?.id ?? "";

  // Resolve the fleet profile for the authenticated fleet_owner
  const { data: fleetProfile, isLoading: fleetLoading } = useQuery({
    queryKey: ["fleet-profile", profileId],
    queryFn: () => getFleetProfile(profileId),
    enabled: !!profileId,
  });

  const fleetId = fleetProfile?.id ?? "";

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["fleet-drivers", fleetId],
    queryFn: () => getFleetDrivers(fleetId),
    enabled: !!fleetId,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["fleet-vehicles", fleetId],
    queryFn: () => getFleetVehicles(fleetId),
    enabled: !!fleetId,
  });

  const { data: overview } = useQuery({
    queryKey: ["fleet-overview", fleetId],
    queryFn: () => getFleetOverview(fleetId),
    enabled: !!fleetId,
  });

  const addVehicleMutation = useMutation({
    mutationFn: () =>
      addFleetVehicle(fleetId, {
        vehicleType: vehicleForm.vehicleType,
        brand: vehicleForm.brand || undefined,
        model: vehicleForm.model || undefined,
        year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
        plateNumber: vehicleForm.plateNumber || undefined,
        capacityKg: vehicleForm.capacityKg ? Number(vehicleForm.capacityKg) : undefined,
        fuelType: vehicleForm.fuelType || undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        success("Vehicle added");
        setShowAddVehicle(false);
        setVehicleForm({ vehicleType: "truck", brand: "", model: "", year: "", plateNumber: "", capacityKg: "", fuelType: "" });
        queryClient.invalidateQueries({ queryKey: ["fleet-vehicles", fleetId] });
        queryClient.invalidateQueries({ queryKey: ["fleet-overview", fleetId] });
      } else {
        toastError(result.error || "Failed to add vehicle");
      }
    },
    onError: (err) => toastError(err instanceof Error ? err.message : "Failed to add vehicle"),
  });

  const setVehicleStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: string }) =>
      updateFleetVehicleStatus(vehicleId, fleetId, status),
    onSuccess: (result) => {
      if (result.success) {
        success("Vehicle status updated");
        queryClient.invalidateQueries({ queryKey: ["fleet-vehicles", fleetId] });
        queryClient.invalidateQueries({ queryKey: ["fleet-overview", fleetId] });
      } else {
        toastError(result.error || "Failed to update vehicle");
      }
    },
    onError: (err) => toastError(err instanceof Error ? err.message : "Failed to update vehicle"),
  });

  const menuItems = [
    { icon: Home, label: "Overview", active: true },
    { icon: Truck, label: "Vehicles", active: false },
    { icon: Users, label: "Drivers", active: false },
    { icon: MapPin, label: "Dispatch", active: false },
    { icon: BarChart3, label: "Analytics", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  const o = overview ?? {
    totalDrivers: 0,
    onlineDrivers: 0,
    busyDrivers: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    activeJobs: 0,
    completedJobs: 0,
    avgRating: null,
  };

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
              {fleetProfile?.companyName ?? "Fleet Operations"}
            </h1>
            <p className="text-neutral-500">Manage your collection vehicles, drivers, and dispatch operations.</p>
          </div>

          {/* Quick Stats — real data only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Total Drivers</p>
                <p className="text-2xl font-extrabold text-neutral-900">{o.totalDrivers}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Active Now</p>
                <p className="text-2xl font-extrabold text-green-600">{o.onlineDrivers}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Vehicles</p>
                <p className="text-2xl font-extrabold text-neutral-900">{o.totalVehicles}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-brand-sm rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500 font-medium">Avg Rating</p>
                <p className="text-2xl font-extrabold text-amber-500">
                  {o.avgRating != null ? o.avgRating.toFixed(1) : "New"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="drivers">
            <TabsList className="rounded-xl bg-neutral-100 p-1">
              <TabsTrigger value="drivers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Drivers
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Vehicles
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Dispatch
              </TabsTrigger>
            </TabsList>

            {/* Drivers */}
            <TabsContent value="drivers" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Fleet Drivers</h3>
                  {driversLoading ? (
                    <p className="text-sm text-neutral-500">Loading drivers…</p>
                  ) : drivers.length > 0 ? (
                    <div className="space-y-2">
                      {drivers.map((c) => (
                        <div key={c.profileId} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                              {c.fullName?.charAt(0) ?? "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{c.fullName}</p>
                            <p className="text-xs text-neutral-500">
                              {c.isOnline ? "🟢 Online" : "⚫ Offline"} · {c.totalPickups} pickups
                              {c.rating != null ? ` · ⭐ ${c.rating.toFixed(1)}` : " · New"}
                            </p>
                          </div>
                          {c.currentJobId && (
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
                      <p className="text-neutral-500 text-sm">No drivers affiliated yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vehicles */}
            <TabsContent value="vehicles" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-neutral-900">Fleet Vehicles</h3>
                    <Button size="sm" className="rounded-xl" onClick={() => setShowAddVehicle((v) => !v)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Vehicle
                    </Button>
                  </div>

                  {showAddVehicle && (
                    <div className="mb-4 p-4 bg-neutral-50 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Vehicle Type</Label>
                          <Input
                            value={vehicleForm.vehicleType}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, vehicleType: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Brand</Label>
                          <Input
                            value={vehicleForm.brand}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Model</Label>
                          <Input
                            value={vehicleForm.model}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Year</Label>
                          <Input
                            value={vehicleForm.year}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, year: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Plate Number</Label>
                          <Input
                            value={vehicleForm.plateNumber}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, plateNumber: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Capacity (kg)</Label>
                          <Input
                            value={vehicleForm.capacityKg}
                            onChange={(e) => setVehicleForm((f) => ({ ...f, capacityKg: e.target.value }))}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        disabled={addVehicleMutation.isPending}
                        onClick={() => addVehicleMutation.mutate()}
                      >
                        {addVehicleMutation.isPending ? "Adding…" : "Save Vehicle"}
                      </Button>
                    </div>
                  )}

                  {vehiclesLoading ? (
                    <p className="text-sm text-neutral-500">Loading vehicles…</p>
                  ) : vehicles.length > 0 ? (
                    <div className="space-y-2">
                      {vehicles.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                          <Truck className="w-5 h-5 text-neutral-400" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {[v.brand, v.model, v.year].filter(Boolean).join(" ") || v.vehicleType}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {v.plateNumber ?? "No plate"} · {v.capacityKg != null ? `${v.capacityKg} kg` : "—"}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              v.status === "active" || v.status === "available"
                                ? "bg-green-100 text-green-700"
                                : v.status === "maintenance"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {v.status}
                          </span>
                          {v.status !== "maintenance" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs"
                              onClick={() => setVehicleStatusMutation.mutate({ vehicleId: v.id, status: "maintenance" })}
                            >
                              Set Maintenance
                            </Button>
                          )}
                          {v.status === "maintenance" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs"
                              onClick={() => setVehicleStatusMutation.mutate({ vehicleId: v.id, status: "active" })}
                            >
                              Set Active
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <p className="text-neutral-500 text-sm">No vehicles registered yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dispatch */}
            <TabsContent value="dispatch" className="mt-4">
              <Card className="border-0 shadow-brand-sm rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-neutral-900 mb-3">Dispatch Board</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Available Drivers</p>
                      <p className="text-xl font-extrabold text-indigo-700">{o.onlineDrivers}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Available Vehicles</p>
                      <p className="text-xl font-extrabold text-indigo-700">{o.availableVehicles}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Active Jobs</p>
                      <p className="text-xl font-extrabold text-indigo-700">{o.activeJobs}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium">Busy Drivers</p>
                      <p className="text-xl font-extrabold text-indigo-700">{o.busyDrivers}</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mt-4">
                    Dispatch assignment is performed through the server-authoritative dispatch operation.
                  </p>
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
