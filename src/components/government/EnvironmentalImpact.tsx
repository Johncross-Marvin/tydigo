import { Card, CardContent } from "@/components/ui/card";
import {
  Recycle,
  TreePine,
  Droplets,
  Zap,
  Globe,
} from "lucide-react";
import { formatWeight } from "@/lib/api";

type EnvironmentalImpactProps = {
  totalWasteDivertedKg: number;
  recyclingRate: number;
  carbonOffsetKg: number;
  landfillSavedKg: number;
};

export function EnvironmentalImpact({
  totalWasteDivertedKg,
  recyclingRate,
  carbonOffsetKg,
  landfillSavedKg,
}: EnvironmentalImpactProps) {
  const stats = [
    { icon: Recycle, label: "Waste Diverted", value: formatWeight(totalWasteDivertedKg), color: "bg-green-100 text-[#145C25]" },
    { icon: Globe, label: "Recycling Rate", value: `${recyclingRate}%`, color: "bg-emerald-100 text-emerald-600" },
    { icon: Zap, label: "Carbon Offset", value: formatWeight(carbonOffsetKg), color: "bg-blue-100 text-blue-600" },
    { icon: TreePine, label: "Landfill Saved", value: formatWeight(landfillSavedKg), color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Environmental Impact</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 p-4 text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-extrabold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
