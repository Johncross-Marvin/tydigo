import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Truck,
  CheckCircle2,
  DollarSign,
  Star,
  TrendingUp,
} from "lucide-react";
import { formatNaira } from "@/lib/api";

type FleetAnalyticsProps = {
  analytics: {
    totalCollectors: number;
    activeCollectors: number;
    totalJobs: number;
    completedJobs: number;
    totalRevenue: number;
    avgRating: number;
  };
};

export function FleetAnalytics({ analytics }: FleetAnalyticsProps) {
  const stats = [
    { icon: Users, label: "Total Collectors", value: String(analytics.totalCollectors), color: "bg-blue-100 text-blue-600" },
    { icon: Truck, label: "Active Now", value: String(analytics.activeCollectors), color: "bg-green-100 text-[#145C25]" },
    { icon: CheckCircle2, label: "Completed Jobs", value: String(analytics.completedJobs), color: "bg-purple-100 text-purple-600" },
    { icon: DollarSign, label: "Total Revenue", value: formatNaira(analytics.totalRevenue), color: "bg-amber-100 text-amber-600" },
    { icon: Star, label: "Avg Rating", value: analytics.avgRating.toFixed(1), color: "bg-rose-100 text-rose-600" },
    { icon: TrendingUp, label: "Completion Rate", value: analytics.totalJobs > 0 ? `${Math.round((analytics.completedJobs / analytics.totalJobs) * 100)}%` : "0%", color: "bg-cyan-100 text-cyan-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Fleet Analytics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 p-4 text-center">
              <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-extrabold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
