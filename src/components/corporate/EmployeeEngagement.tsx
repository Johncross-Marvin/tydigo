import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, TrendingUp, Medal } from "lucide-react";

type EmployeeEngagementProps = {
  leaderboard: Array<{
    name: string;
    department: string;
    ecopoints: number;
    pickups: number;
    rank: number;
  }>;
  departmentCompetitions: Array<{
    department: string;
    score: number;
    participants: number;
  }>;
};

export function EmployeeEngagement({ leaderboard, departmentCompetitions }: EmployeeEngagementProps) {
  const medals = ["bg-amber-400", "bg-neutral-300", "bg-amber-700"];

  return (
    <div className="space-y-4">
      {/* Leaderboard */}
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-neutral-900">EcoPoints Leaderboard</h3>
          </div>

          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors">
                <div className={`w-8 h-8 rounded-full ${i < 3 ? medals[i] : "bg-neutral-100"} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {i < 3 ? <Medal className="w-4 h-4" /> : entry.rank}
                </div>
                <Avatar className="w-9 h-9 ring-2 ring-neutral-100">
                  <AvatarFallback className="bg-green-100 text-[#145C25] font-bold text-xs">
                    {entry.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800">{entry.name}</p>
                  <p className="text-xs text-neutral-500">{entry.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-[#145C25]">{entry.ecopoints.toLocaleString()}</p>
                  <p className="text-xs text-neutral-400">{entry.pickups} pickups</p>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No participants yet. Encourage your team to start recycling!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Department Competitions */}
      <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-neutral-900">Department Challenge</h3>
          </div>

          <div className="space-y-4">
            {departmentCompetitions.map((dept, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-neutral-700">{dept.department}</span>
                  <span className="text-xs text-neutral-500">{dept.participants} participants</span>
                </div>
                <Progress value={Math.min(dept.score, 100)} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-purple-600" />
              </div>
            ))}
            {departmentCompetitions.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                Start a department challenge to boost engagement!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
