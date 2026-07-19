import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Target, Flame, Users, Zap, Gift } from "lucide-react";

const ChallengesPage = () => {
  const challenges = [
    { icon: Target, title: "Sort 10kg Plastic", desc: "Sort and recycle 10kg of plastic waste", progress: 70, pts: "+500", barClass: "[&>div]:bg-blue-500" },
    { icon: Flame, title: "7-Day Streak", desc: "Schedule pickups for 7 consecutive days", progress: 57, pts: "+750", barClass: "[&>div]:bg-orange-500" },
    { icon: Users, title: "Refer 3 Neighbors", desc: "Invite neighbors to join WastiGo", progress: 33, pts: "+2,000", barClass: "[&>div]:bg-purple-500" },
    { icon: Zap, title: "Super Sorter", desc: "Pre-sort waste into 3+ categories", progress: 100, pts: "+300", barClass: "[&>div]:bg-amber-500" },
    { icon: Trophy, title: "Monthly Champion", desc: "Complete 20 pickups this month", progress: 45, pts: "+3,000", barClass: "[&>div]:bg-green-500" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Challenges</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {challenges.map((challenge, i) => (
          <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center`}>
                  <challenge.icon className="w-6 h-6 text-neutral-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900">{challenge.title}</h3>
                    <Badge className="bg-amber-100 text-amber-700 rounded-full text-xs">{challenge.pts} pts</Badge>
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">{challenge.desc}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Progress</span>
                  <span>{challenge.progress}%</span>
                </div>
                <Progress value={challenge.progress} className={`h-2 rounded-full bg-neutral-100 ${challenge.barClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default ChallengesPage;
