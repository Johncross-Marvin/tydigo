import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Recycle, Package, Truck, TrendingUp, ShoppingBag, Plus, CheckCircle2 } from "lucide-react";
import { api, formatNaira } from "@/lib/api";

const PartnerDashboardPage = () => {
  const { data } = useQuery({
    queryKey: ["partner-requests"],
    queryFn: api.listPartnerRequests,
  });
  const requests = data?.requests ?? [];
  const fulfilled = requests.filter((request) => request.status === "delivered").length;
  const requestedValue = requests.reduce((total, request) => total + Number(request.quantity_kg) * Number(request.price_per_kg_ngn), 0);

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
            { icon: Package, label: "Requests", value: String(requests.length), color: "bg-amber-100 text-amber-600" },
            { icon: CheckCircle2, label: "Fulfilled", value: String(fulfilled), color: "bg-green-100 text-[#145C25]" },
            { icon: TrendingUp, label: "Value", value: formatNaira(requestedValue), color: "bg-blue-100 text-blue-600" },
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
            {requests.map((req, i) => (
              <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-sm">{req.material}</p>
                    <p className="text-xs text-neutral-500">{Number(req.quantity_kg).toLocaleString()} kg • {formatNaira(Number(req.price_per_kg_ngn))}/kg</p>
                  </div>
                  <Badge className={`rounded-full text-xs ${
                    req.status === "delivered" ? "bg-green-100 text-[#145C25]" :
                    req.status === "in_transit" ? "bg-blue-100 text-blue-600" :
                    "bg-amber-100 text-amber-600"
                  }`}>{req.status.replace("_", " ")}</Badge>
                </CardContent>
              </Card>
            ))}
            {!requests.length && (
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-6 text-center text-sm text-neutral-500">
                  No material requests yet. Create one to start sourcing recyclables.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerDashboardPage;
