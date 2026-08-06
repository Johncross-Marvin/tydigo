import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  FileCheck,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

type ComplianceReportsProps = {
  reports: Array<{
    id: string;
    title: string;
    period: string;
    status: "ready" | "generating" | "expired";
    generatedAt?: string;
  }>;
  onDownload: (reportId: string) => void;
  onGenerate: () => void;
};

export function ComplianceReports({ reports, onDownload, onGenerate }: ComplianceReportsProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#145C25]" />
            <h3 className="font-bold text-neutral-900">Compliance Reports</h3>
          </div>
          <Button
            onClick={onGenerate}
            size="sm"
            className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
          >
            <FileCheck className="w-4 h-4 mr-1.5" />
            Generate New
          </Button>
        </div>

        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                report.status === "ready" ? "bg-green-100" :
                report.status === "generating" ? "bg-amber-100" : "bg-neutral-100"
              }`}>
                {report.status === "ready" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : report.status === "generating" ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <Calendar className="w-4 h-4 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{report.title}</p>
                <p className="text-xs text-neutral-500 capitalize">{report.period.replace(/_/g, " ")}</p>
              </div>
              <Badge className={`rounded-full text-xs ${
                report.status === "ready" ? "bg-green-100 text-green-600" :
                report.status === "generating" ? "bg-amber-100 text-amber-600" :
                "bg-neutral-100 text-neutral-500"
              }`}>
                {report.status}
              </Badge>
              {report.status === "ready" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(report.id)}
                  className="h-8 w-8 rounded-lg"
                >
                  <Download className="w-4 h-4 text-neutral-500" />
                </Button>
              )}
            </div>
          ))}
          {reports.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">
              No compliance reports yet. Generate your first report.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
