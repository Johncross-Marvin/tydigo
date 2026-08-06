/**
 * Tydigo Pickup History Page
 *
 * Full history with search, filters, status badges, and repeat pickup.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Filter, RotateCcw, ChevronRight,
  MapPin, Clock, CheckCircle2, XCircle, Truck, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCustomerPickups } from "@/services/pickup";
import { getStatusLabel, getStatusColor, type PickupStatus } from "@/services/pickup-status";
import { formatNaira } from "@/services/pricing";
import type { Pickup } from "@/lib/api";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    getCustomerPickups(user.id).then((data) => {
      setPickups(data);
      setLoading(false);
    });
  }, [user]);

  const filtered = pickups.filter((p) => {
    const matchesSearch = !search || p.pickup_code?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["all", "completed", "cancelled", "requested", "collector_assigned", "collector_en_route"];

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pickup History</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or address..."
            className="pl-10 rounded-2xl bg-white border-neutral-200"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {s === "all" ? "All" : getStatusLabel(s as PickupStatus)}
            </button>
          ))}
        </div>

        {/* Pickup List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-semibold">No pickups found</p>
            <Link to="/household/request-pickup" className="text-sm text-[#145C25] font-semibold mt-2 inline-block">Request a Pickup</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((pickup) => (
              <Card key={pickup.id} className="border-0 shadow-brand-sm rounded-2xl hover:shadow-brand-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-neutral-900 font-mono text-sm">{pickup.pickup_code}</p>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{pickup.address}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(pickup.status as PickupStatus)}>
                      {getStatusLabel(pickup.status as PickupStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500">{pickup.weight_kg}kg</span>
                      <span className="font-bold text-[#145C25]">{formatNaira(pickup.price_ngn)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/household/request-pickup`)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100"
                        title="Repeat Pickup"
                      >
                        <RotateCcw className="w-4 h-4 text-neutral-400" />
                      </button>
                      <Link to={`/household/tracking?id=${pickup.id}`} className="p-1.5 rounded-lg hover:bg-neutral-100">
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 mt-2">
                    <Clock className="w-3 h-3" />
                    {new Date(pickup.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
