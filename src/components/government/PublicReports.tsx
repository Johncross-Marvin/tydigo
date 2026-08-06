import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Calendar,
  FileCheck,
  Clock,
} from "lucide-react";

type PublicReportsProps = {
  onGenerate: (period: string) => void;
};

const reportTemplates = [
  { id: "monthly", label: "Monthly Report", period: "month", description: "Waste collection and recycling summary" },
  { id: "quarterly", label: "Quarterly Report", period: "quarter", description: "Comprehensive environmental metrics" },
  { id: "annual", label: "Annual Report", period: "year", description: "Full year impact and compliance report" },
];

export function PublicReports({ onGenerate }: PublicReportsProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Public Reports</h3>
        </div>

        <p className="text-sm text-neutral-500 mb-4">
          Generate environmental reports for public disclosure and policy-making.
        </p>

        <div className="space-y-3">
          {reportTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 text-[#145C25]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800">{template.label}</p>
                <p className="text-xs text-neutral-500">{template.description}</p>
              </div>
              <Button
                onClick={() => onGenerate(template.period)}
                size="sm"
                className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Generate
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
