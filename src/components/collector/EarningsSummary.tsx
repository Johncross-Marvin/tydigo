import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Star,
  Calendar,
} from "lucide-react";
import { formatNaira } from "@/lib/api";

type EarningsSummaryProps = {
  todayEarnings: number;
  weekEarnings: number;
  completedJobs: number;
  rating: number;
};

export function EarningsSummary({
  todayEarnings,
  weekEarnings,
  completedJobs,
  rating,
}: EarningsSummaryProps) {
  const stats = [
    {
      icon: DollarSign,
      label: "Today",
      value: formatNaira(todayEarnings),
      color: "bg-green-100 text-[#145C25]",
    },
    {
      icon: Calendar,
      label: "This Week",
      value: formatNaira(weekEarnings),
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: String(completedJobs),
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: Star,
      label: "Rating",
      value: rating.toFixed(1),
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Earnings Summary</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-base font-extrabold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
