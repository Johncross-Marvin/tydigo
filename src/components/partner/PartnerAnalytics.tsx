import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  DollarSign,
  Package,
  Star,
  BarChart3,
} from "lucide-react";
import { formatNaira, formatWeight } from "@/lib/api";

type PartnerAnalyticsProps = {
  totalSourced: number;
  totalSpent: number;
  avgPricePerKg: number;
  supplierRating: number;
  activeBatches: number;
};

export function PartnerAnalytics({
  totalSourced,
  totalSpent,
  avgPricePerKg,
  supplierRating,
  activeBatches,
}: PartnerAnalyticsProps) {
  const stats = [
    { icon: Package, label: "Total Sourced", value: formatWeight(totalSourced), color: "bg-purple-100 text-purple-600" },
    { icon: DollarSign, label: "Total Spent", value: formatNaira(totalSpent), color: "bg-green-100 text-[#145C25]" },
    { icon: TrendingUp, label: "Avg Price/kg", value: formatNaira(avgPricePerKg), color: "bg-blue-100 text-blue-600" },
    { icon: Star, label: "Avg Supplier Rating", value: supplierRating.toFixed(1), color: "bg-amber-100 text-amber-600" },
    { icon: BarChart3, label: "Active Batches", value: String(activeBatches), color: "bg-rose-100 text-rose-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Sourcing Analytics</h3>
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
