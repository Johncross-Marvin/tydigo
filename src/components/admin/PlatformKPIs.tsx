import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Truck,
  Recycle,
  DollarSign,
  Award,
  FileCheck,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatNaira, formatWeight } from "@/lib/api";
import type { PlatformKpi } from "@/lib/api";

type PlatformKPIsProps = {
  kpis: PlatformKpi;
  period: string;
  onPeriodChange: (period: string) => void;
};

export function PlatformKPIs({ kpis, period, onPeriodChange }: PlatformKPIsProps) {
  const periods = ["today", "week", "month", "year"];

  const stats = [
    { icon: Users, label: "Total Users", value: kpis.totalUsers.toLocaleString(), color: "bg-blue-100 text-blue-600" },
    { icon: Truck, label: "Active Collectors", value: String(kpis.activeCollectors), color: "bg-green-100 text-[#145C25]" },
    { icon: Recycle, label: "Waste Collected", value: formatWeight(kpis.wasteCollectedKg), color: "bg-emerald-100 text-emerald-600" },
    { icon: DollarSign, label: "Revenue", value: formatNaira(kpis.revenueNgn), color: "bg-amber-100 text-amber-600" },
    { icon: Award, label: "EcoPoints Issued", value: kpis.ecopointsIssued.toLocaleString(), color: "bg-purple-100 text-purple-600" },
    { icon: FileCheck, label: "Pending KYC", value: String(kpis.pendingKyc), color: "bg-rose-100 text-rose-600" },
    { icon: TrendingUp, label: "Total Pickups", value: kpis.totalPickups.toLocaleString(), color: "bg-cyan-100 text-cyan-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-neutral-500" />
        <div className="flex gap-1">
          {periods.map((p) => (
            <Badge
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`cursor-pointer rounded-full capitalize ${
                period === p
                  ? "bg-[#145C25] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">{stat.label}</span>
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-neutral-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
