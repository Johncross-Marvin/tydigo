import { Card, CardContent } from "@/components/ui/card";
import { Recycle, TreePine, Droplets, Zap } from "lucide-react";

type ImpactStatsProps = {
  wasteRecycledKg: number;
  totalPickups: number;
};

export function ImpactStats({ wasteRecycledKg, totalPickups }: ImpactStatsProps) {
  // Environmental impact calculations (approximate)
  const treesSaved = Math.round(wasteRecycledKg * 0.017); // ~17 trees per ton
  const waterSavedL = Math.round(wasteRecycledKg * 30); // ~30L water saved per kg recycled
  const energySavedKwh = Math.round(wasteRecycledKg * 0.5); // ~0.5 kWh per kg

  const stats = [
    {
      icon: Recycle,
      value: `${wasteRecycledKg.toLocaleString()} kg`,
      label: "Waste Recycled",
      color: "bg-green-100 text-[#145C25]",
    },
    {
      icon: TreePine,
      value: treesSaved > 0 ? `${treesSaved}` : "0",
      label: "Trees Saved",
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: Droplets,
      value: `${waterSavedL.toLocaleString()} L`,
      label: "Water Saved",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Zap,
      value: `${energySavedKwh} kWh`,
      label: "Energy Saved",
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Your Impact</h3>

        {totalPickups === 0 ? (
          <div className="rounded-2xl bg-neutral-50 p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Recycle className="w-7 h-7 text-[#145C25]" />
            </div>
            <p className="font-semibold text-neutral-700">Start making an impact</p>
            <p className="text-sm text-neutral-500 mt-1">
              Complete your first pickup to see your environmental contribution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-xl bg-neutral-50 p-4 text-center"
              >
                <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-extrabold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
