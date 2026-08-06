import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Recycle,
  TrendingUp,
  Users,
  MapPin,
  Target,
} from "lucide-react";
import { formatWeight } from "@/lib/api";

type WasteProgramOverviewProps = {
  totalLocations: number;
  totalEmployees: number;
  totalWasteKg: number;
  recyclingRate: number;
  sustainabilityScore: number;
};

export function WasteProgramOverview({
  totalLocations,
  totalEmployees,
  totalWasteKg,
  recyclingRate,
  sustainabilityScore,
}: WasteProgramOverviewProps) {
  const stats = [
    { icon: Building2, label: "Locations", value: String(totalLocations), color: "bg-blue-100 text-blue-600" },
    { icon: Users, label: "Employees", value: String(totalEmployees), color: "bg-purple-100 text-purple-600" },
    { icon: Recycle, label: "Waste Collected", value: formatWeight(totalWasteKg), color: "bg-green-100 text-[#145C25]" },
    { icon: TrendingUp, label: "Recycling Rate", value: `${recyclingRate}%`, color: "bg-emerald-100 text-emerald-600" },
    { icon: Target, label: "Sustainability", value: `${sustainabilityScore}/100`, color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Waste Program Overview</h3>
        </div>

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
