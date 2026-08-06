import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, Users, AlertTriangle } from "lucide-react";

type ComplianceMonitorProps = {
  registeredCollectors: number;
  licensedOperators: number;
  complianceRate: number;
};

export function ComplianceMonitor({
  registeredCollectors,
  licensedOperators,
  complianceRate,
}: ComplianceMonitorProps) {
  const stats = [
    { icon: Users, label: "Registered Collectors", value: registeredCollectors.toLocaleString(), color: "bg-blue-100 text-blue-600" },
    { icon: CheckCircle2, label: "Licensed Operators", value: licensedOperators.toLocaleString(), color: "bg-green-100 text-[#145C25]" },
    { icon: Shield, label: "Compliance Rate", value: `${complianceRate}%`, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Compliance Monitoring</h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
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

        <div className="rounded-xl bg-neutral-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">Overall Compliance</span>
            <Badge className={complianceRate >= 80 ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}>
              {complianceRate >= 80 ? "Good" : "Needs Attention"}
            </Badge>
          </div>
          <Progress
            value={complianceRate}
            className="h-2.5 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
