import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Recycle, Package, Truck, TrendingUp, ShoppingBag, Plus, CheckCircle2 } from "lucide-react";

const PartnerDashboardPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/role-selection" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Partner Dashboard</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Package, label: "Requests", value: "28", color: "bg-amber-100 text-amber-600" },
            { icon: CheckCircle2, label: "Fulfilled", value: "19", color: "bg-green-100 text-[#145C25]" },
            { icon: TrendingUp, label: "Revenue", value: "₦450K", color: "bg-blue-100 text-blue-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-extrabold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Material Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-neutral-900">Material Requests</h2>
            <Link to="/partner/request">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Request
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { material: "Crushed Plastic (PET)", qty: "500 kg", status: "Pending", price: "₦150/kg" },
              { material: "Cardboard Bales", qty: "1,200 kg", status: "In Transit", price: "₦80/kg" },
              { material: "Aluminum Cans", qty: "300 kg", status: "Delivered", price: "₦350/kg" },
            ].map((req, i) => (
              <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-sm">{req.material}</p>
                    <p className="text-xs text-neutral-500">{req.qty} • {req.price}</p>
                  </div>
                  <Badge className={`rounded-full text-xs ${
                    req.status === "Delivered" ? "bg-green-100 text-[#145C25]" :
                    req.status === "In Transit" ? "bg-blue-100 text-blue-600" :
                    "bg-amber-100 text-amber-600"
                  }`}>{req.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerDashboardPage;
