import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Truck, Recycle, DollarSign, TrendingUp, Shield, Settings, BarChart3, Award, AlertTriangle } from "lucide-react";

const AdminDashboardPage = () => {
  const kpis = [
    { icon: Users, label: "Total Users", value: "52,847", change: "+12%", color: "bg-blue-100 text-blue-600" },
    { icon: Truck, label: "Active Collectors", value: "1,243", change: "+5%", color: "bg-green-100 text-[#145C25]" },
    { icon: Recycle, label: "Waste Collected", value: "128 tons", change: "+18%", color: "bg-amber-100 text-amber-600" },
    { icon: DollarSign, label: "Revenue", value: "₦8.4M", change: "+22%", color: "bg-purple-100 text-purple-600" },
    { icon: Award, label: "EcoPoints Issued", value: "2.1M", change: "+15%", color: "bg-orange-100 text-orange-600" },
    { icon: AlertTriangle, label: "Pending KYC", value: "47", change: "Needs review", color: "bg-red-100 text-red-600" },
  ];

  const menuItems = [
    { icon: Shield, label: "KYC Verification", desc: "Approve collector & partner identities", route: "/admin/kyc" },
    { icon: DollarSign, label: "Pricing Engine", desc: "Manage pickup & weight pricing", route: "/admin/pricing" },
    { icon: Award, label: "EcoPoints Rules", desc: "Configure earning & redemption rules", route: "/admin/ecopoints" },
    { icon: Truck, label: "Batch Tracking", desc: "Monitor waste batches to partners", route: "/admin/batches" },
    { icon: BarChart3, label: "Impact Reports", desc: "ESG & sustainability analytics", route: "/admin/impact" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/role-selection" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Admin Dashboard</h1>
        <Badge className="ml-auto bg-red-100 text-red-600 rounded-full">
          <Settings className="w-3 h-3 mr-1" /> Super Admin
        </Badge>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-green-600">{kpi.change}</span>
                </div>
                <p className="text-2xl font-extrabold text-neutral-900">{kpi.value}</p>
                <p className="text-sm text-neutral-500">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Management Menu */}
        <h2 className="font-bold text-neutral-900">Platform Management</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item, i) => (
            <Link to={item.route} key={i}>
              <Card className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                    <item.icon className="w-6 h-6 text-neutral-600" />
                  </div>
                  <h3 className="font-bold text-neutral-900">{item.label}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
