import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Recycle,
  MapPin,
  Clock,
  Star,
  Award,
  History,
  CreditCard,
  User,
  LogOut,
  Bell,
  Plus,
  ChevronRight,
  TrendingUp,
  Truck,
  Gift,
  Target,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api, formatWeight } from "@/lib/api";

const GOOGLE_DRIVE_IDS = {
  dashboard: "1b5h3vD3HPb_4iPqCUZSRqBPXC5sCL0_k",
};

const gd = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const HouseholdDashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/household/dashboard", active: true },
    { icon: MapPin, label: "Request Pickup", route: "/household/request-pickup" },
    { icon: Truck, label: "Live Tracking", route: "/household/tracking" },
    { icon: Award, label: "EcoPoints", route: "/household/ecopoints" },
    { icon: History, label: "History", route: "/household/history" },
    { icon: CreditCard, label: "Payments", route: "/household/payment" },
    { icon: Target, label: "Challenges", route: "/household/challenges" },
    { icon: Gift, label: "Redeem", route: "/household/redeem" },
    { icon: User, label: "Profile", route: "/household/profile" },
  ];

  const quickActions = [
    { icon: Plus, label: "New Pickup", route: "/household/request-pickup", color: "bg-green-100 text-[#145C25]" },
    { icon: Truck, label: "Track", route: "/household/tracking", color: "bg-blue-100 text-blue-600" },
    { icon: Gift, label: "Redeem", route: "/household/redeem", color: "bg-amber-100 text-amber-600" },
    { icon: History, label: "History", route: "/household/history", color: "bg-purple-100 text-purple-600" },
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
            <Link
              key={item.label}
              to={item.route}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-[#145C25] text-white shadow-lg"
                  : "text-green-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700/50">
          <button
            onClick={() => void logout().then(() => navigate("/login"))}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-green-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0A2F14] text-white p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="flex items-center gap-2.5">
                <Recycle className="w-5 h-5 text-amber-400" />
                <span className="text-lg font-bold">Tydigo</span>
              </Link>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.route}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    item.active ? "bg-[#145C25] text-white" : "text-green-200 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-100" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Bell className="w-5 h-5 text-neutral-500" />
            </Button>
            <Avatar className="w-9 h-9 ring-2 ring-green-100">
              <AvatarFallback className="bg-green-100 text-[#145C25] font-bold">AB</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Welcome */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-neutral-900">
                Welcome back, {user?.name?.split(" ")[0] ?? "there"}
              </h1>
              <p className="text-neutral-500">Your live waste pickup summary</p>
            </div>
            <Link to="/household/request-pickup">
              <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand">
                <Plus className="w-4 h-4 mr-2" />
                Request Pickup
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Award, label: "EcoPoints", value: (dashboard?.stats?.ecopoints ?? user?.ecopoints ?? 0).toLocaleString(), sub: "Current balance", color: "bg-amber-100 text-amber-600" },
              { icon: Truck, label: "Total Pickups", value: String(dashboard?.stats?.totalPickups ?? 0), sub: "Stored pickups", color: "bg-blue-100 text-blue-600" },
              { icon: Recycle, label: "Waste Recycled", value: formatWeight(dashboard?.stats?.wasteRecycledKg ?? 0), sub: "From your records", color: "bg-green-100 text-[#145C25]" },
              { icon: Star, label: "Rating", value: String(dashboard?.stats?.rating ?? user?.rating ?? 5), sub: "Collector feedback", color: "bg-purple-100 text-purple-600" },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-neutral-500">{stat.label}</span>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-neutral-900">{stat.value}</div>
                  <div className="text-xs text-neutral-400 mt-1">{stat.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <Link to={action.route} key={i}>
                  <Card className="border-0 shadow-sm hover:shadow-brand transition-all rounded-2xl cursor-pointer hover:-translate-y-0.5">
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-2`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-neutral-700">{action.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Active Pickup + Challenges */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Active Pickup */}
            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-neutral-900">Active Pickup</h3>
                  <Badge className="bg-blue-100 text-blue-600 rounded-full">In Progress</Badge>
                </div>
                {dashboard?.activePickup ? (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-[#145C25]" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{dashboard.activePickup.collector_name}</p>
                        <p className="text-sm text-neutral-500 capitalize">{dashboard.activePickup.status.replace("_", " ")}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                        {dashboard.activePickup.address}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        {dashboard.activePickup.schedule_window}
                      </div>
                    </div>
                    <Progress value={dashboard.activePickup.payment_status === "paid" ? 70 : 35} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
                    <div className="flex gap-2 mt-4">
                      <Link to="/household/tracking" className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl border-[#145C25] text-[#145C25]">
                          Track Live
                        </Button>
                      </Link>
                      <Link to="/household/payment" className="flex-1">
                        <Button className="w-full rounded-xl bg-[#145C25] hover:bg-[#0F4A1E] text-white">Pay</Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-neutral-50 p-5 text-center">
                    <p className="font-semibold text-neutral-700">No active pickup yet.</p>
                    <p className="text-sm text-neutral-500 mt-1">Create your first pickup request to start tracking.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Challenges */}
            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-neutral-900">Active Challenges</h3>
                  <Link to="/household/challenges">
                    <Button variant="ghost" size="sm" className="text-[#145C25] text-xs">
                      View All <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {(dashboard?.challenges ?? [
                    { title: "Sort 10kg Plastic", progress: 0, points: 500 },
                    { title: "5 Pickups This Month", progress: 0, points: 1000 },
                    { title: "Refer a Neighbor", progress: 0, points: 2000 },
                  ]).map((challenge, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-neutral-700">{challenge.title}</span>
                        <span className="text-xs text-[#145C25] font-semibold">+{challenge.points.toLocaleString()} pts</span>
                      </div>
                      <Progress value={challenge.progress} className="h-1.5 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-neutral-900">Recent Activity</h3>
                <Link to="/household/history">
                  <Button variant="ghost" size="sm" className="text-[#145C25] text-xs">
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {(dashboard?.recentPickups?.length
                  ? dashboard.recentPickups.map((pickup) => ({
                      icon: Truck,
                      title: pickup.pickup_code,
                      desc: `${pickup.waste_type} - ${formatWeight(Number(pickup.weight_kg))}`,
                      time: new Date(pickup.created_at).toLocaleDateString(),
                      color: "bg-green-100 text-[#145C25]",
                    }))
                  : [
                      { icon: Award, title: "Welcome Bonus", desc: "Your account is ready and saved.", time: "Today", color: "bg-amber-100 text-amber-600" },
                    ]).map((activity, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center shrink-0`}>
                      <activity.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 text-sm">{activity.title}</p>
                      <p className="text-sm text-neutral-500">{activity.desc}</p>
                    </div>
                    <span className="text-xs text-neutral-400 shrink-0">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default HouseholdDashboardPage;
