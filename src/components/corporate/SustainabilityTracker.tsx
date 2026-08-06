import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Leaf, Recycle, Droplets, Zap } from "lucide-react";

type SustainabilityTrackerProps = {
  goals: Array<{
    id: string;
    name: string;
    current: number;
    target: number;
    unit: string;
    icon: "recycle" | "leaf" | "water" | "energy";
  }>;
};

const iconMap = {
  recycle: Recycle,
  leaf: Leaf,
  water: Droplets,
  energy: Zap,
};

const colorMap = {
  recycle: "bg-green-100 text-[#145C25] [&>div]:bg-[#145C25]",
  leaf: "bg-emerald-100 text-emerald-600 [&>div]:bg-emerald-600",
  water: "bg-blue-100 text-blue-600 [&>div]:bg-blue-600",
  energy: "bg-amber-100 text-amber-600 [&>div]:bg-amber-600",
};

export function SustainabilityTracker({ goals }: SustainabilityTrackerProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Sustainability Goals</h3>
        </div>

        <div className="space-y-4">
          {goals.map((goal) => {
            const Icon = iconMap[goal.icon];
            const progress = Math.min(Math.round((goal.current / goal.target) * 100), 100);
            const color = colorMap[goal.icon];

            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${color.split(" ")[0]} ${color.split(" ")[1]} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-neutral-700">{goal.name}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900">
                    {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                  </span>
                </div>
                <Progress value={progress} className={`h-2 rounded-full bg-neutral-100 ${color.split(" ").slice(2).join(" ")}`} />
                <p className="text-xs text-neutral-500 text-right">{progress}% complete</p>
              </div>
            );
          })}
          {goals.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">
              Set sustainability goals to track your progress.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
