/**
 * Collector Performance Panel
 * Analytics, leaderboard, levels, and achievements
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Star, Clock, CheckCircle2, Award, Zap, Shield, Trophy } from "lucide-react";

export type PerformanceData = {
  totalPickups: number;
  completedJobs: number;
  cancelledJobs: number;
  averageRating: number | null;
  acceptanceRate: number | null;
  completionRate: number | null;
  onTimeRate: number | null;
  averageResponseTimeSeconds: number | null;
  totalDistanceKm: number;
  totalEcoPoints: number;
  currentLevel: {
    name: string;
    badge: string;
    pointsToNextLevel: number;
    progressPercent: number;
  };
  recentAchievements: Array<{
    name: string;
    icon: string;
    earnedAt: string;
  }>;
  leaderboardRank?: number;
};

type Props = {
  performance: PerformanceData;
};

const LEVEL_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700",
  Silver: "bg-gray-400",
  Gold: "bg-yellow-500",
  Platinum: "bg-cyan-500",
  Diamond: "bg-blue-500",
  Master: "bg-purple-500",
  Elite: "bg-rose-500",
};

export function CollectorPerformancePanel({ performance }: Props) {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={String(performance.completedJobs)} color="text-green-500" />
        <StatCard icon={Star} label="Rating" value={performance.averageRating != null ? performance.averageRating.toFixed(1) : "New"} color="text-amber-500" />
        <StatCard icon={Clock} label="On-Time" value={performance.onTimeRate != null ? `${performance.onTimeRate}%` : "—"} color="text-blue-500" />
      </div>

      {/* Rates */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <RateBar label="Acceptance Rate" value={performance.acceptanceRate} />
          <RateBar label="Completion Rate" value={performance.completionRate} />
          <RateBar label="On-Time Rate" value={performance.onTimeRate} />
          <div className="flex justify-between text-sm pt-1">
            <span className="text-neutral-500">Avg Response</span>
            <span className="font-bold">{performance.averageResponseTimeSeconds != null ? `${Math.round(performance.averageResponseTimeSeconds)}s` : "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Total Distance</span>
            <span className="font-bold">{performance.totalDistanceKm.toFixed(1)} km</span>
          </div>
        </CardContent>
      </Card>

      {/* Level Progress */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className={`w-5 h-5 ${LEVEL_COLORS[performance.currentLevel.name]?.replace("bg-", "text-") || "text-amber-500"}`} />
              <span className="font-bold text-neutral-900">{performance.currentLevel.name} Collector</span>
            </div>
            <Badge className={`${LEVEL_COLORS[performance.currentLevel.name] || "bg-amber-500"} text-white`}>
              {performance.currentLevel.badge}
            </Badge>
          </div>
          <Progress value={performance.currentLevel.progressPercent} className="h-2 rounded-full bg-amber-200 [&>div]:bg-amber-500" />
          <p className="text-xs text-neutral-500 mt-1">
            {performance.currentLevel.pointsToNextLevel} pts to next level
          </p>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <div>
        <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Recent Achievements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {performance.recentAchievements.slice(0, 4).map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-neutral-100">
              <span className="text-xl">{a.icon}</span>
              <div>
                <p className="text-xs font-bold">{a.name}</p>
                <p className="text-[10px] text-neutral-400">{new Date(a.earnedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof CheckCircle2; label: string; value: string; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 text-center">
        <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
        <p className="text-lg font-extrabold">{value}</p>
        <p className="text-[10px] text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function RateBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-500">{label}</span>
        <span className="font-bold">{value != null ? `${value}%` : "—"}</span>
      </div>
      <Progress value={value ?? 0} className="h-2 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]" />
    </div>
  );
}
