import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Truck, Recycle, TrendingUp, Users, Building2, Leaf, Download } from "lucide-react";

const BusinessDashboardPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/role-selection" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Business Dashboard</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900">Okonkwo Enterprises</h2>
            <Badge className="bg-purple-100 text-purple-600 rounded-full text-xs">Business Plan</Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: "Total Pickups", value: "1,247", color: "bg-blue-100 text-blue-600" },
            { icon: Recycle, label: "Waste Recycled", value: "8,450 kg", color: "bg-green-100 text-[#145C25]" },
            { icon: TrendingUp, label: "CO2 Saved", value: "12.4 tons", color: "bg-amber-100 text-amber-600" },
            { icon: Users, label: "Employees", value: "48", color: "bg-purple-100 text-purple-600" },
          ].map((kpi, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-3`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-extrabold text-neutral-900">{kpi.value}</p>
                <p className="text-sm text-neutral-500">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-bold text-neutral-900 mb-3">Schedule Bulk Pickup</h3>
              <p className="text-sm text-neutral-500 mb-4">Request pickup for multiple waste categories at once.</p>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                <Truck className="w-4 h-4 mr-2" /> Schedule Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-bold text-neutral-900 mb-3">Impact Report</h3>
              <p className="text-sm text-neutral-500 mb-4">Download your monthly sustainability report.</p>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BusinessDashboardPage;
