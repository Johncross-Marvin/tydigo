import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Recycle,
  TreePine,
  Droplets,
  Zap,
  Download,
  TrendingUp,
  FileText,
} from "lucide-react";
import type { ImpactReport as ImpactReportType } from "@/lib/api";

type ImpactReportProps = {
  report?: ImpactReportType | null;
  onDownload: () => void;
};

export function ImpactReport({ report, onDownload }: ImpactReportProps) {
  const data = report ?? {
    total_waste_kg: 0,
    recycled_kg: 0,
    landfill_diverted_kg: 0,
    carbon_offset_kg: 0,
    trees_saved: 0,
    period: "this_month",
  };

  const metrics = [
    { icon: Recycle, label: "Total Waste", value: `${data.total_waste_kg.toLocaleString()} kg`, color: "bg-green-100 text-[#145C25]" },
    { icon: TrendingUp, label: "Recycled", value: `${data.recycled_kg.toLocaleString()} kg`, color: "bg-emerald-100 text-emerald-600" },
    { icon: TreePine, label: "Trees Saved", value: String(data.trees_saved), color: "bg-amber-100 text-amber-600" },
    { icon: Zap, label: "Carbon Offset", value: `${data.carbon_offset_kg.toLocaleString()} kg`, color: "bg-blue-100 text-blue-600" },
  ];

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#145C25]" />
            <h3 className="font-bold text-neutral-900">Impact Report</h3>
          </div>
          <Badge className="bg-green-100 text-[#145C25] rounded-full capitalize">
            {data.period.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {metrics.map((metric, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 p-4 text-center">
              <div className={`w-9 h-9 rounded-lg ${metric.color} flex items-center justify-center mx-auto mb-2`}>
                <metric.icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-extrabold text-neutral-900">{metric.value}</p>
              <p className="text-xs text-neutral-500">{metric.label}</p>
            </div>
          ))}
        </div>

        <Button
          onClick={onDownload}
          variant="outline"
          className="w-full rounded-xl border-[#145C25] text-[#145C25] hover:bg-green-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Full Report (PDF)
        </Button>
      </CardContent>
    </Card>
  );
}
