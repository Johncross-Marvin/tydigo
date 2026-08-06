import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  User,
  Edit,
  Trash2,
  Plus,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { AuditLog } from "@/lib/api";

type AuditLogsProps = {
  logs: AuditLog[];
};

const actionIcons: Record<string, typeof FileText> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  suspend: AlertTriangle,
  approve: FileText,
  reject: FileText,
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-600",
  update: "bg-blue-100 text-blue-600",
  delete: "bg-red-100 text-red-600",
  suspend: "bg-amber-100 text-amber-600",
  approve: "bg-green-100 text-green-600",
  reject: "bg-red-100 text-red-600",
};

export function AuditLogs({ logs }: AuditLogsProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Audit Logs</h3>
        </div>

        <ScrollArea className="h-80">
          <div className="space-y-2">
            {logs.map((log) => {
              const Icon = actionIcons[log.action] ?? FileText;
              const color = actionColors[log.action] ?? "bg-neutral-100 text-neutral-600";

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800">
                        {log.actor_name}
                      </p>
                      <Badge className="bg-neutral-100 text-neutral-600 rounded-full text-[10px] capitalize">
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {log.entity_type} • {log.entity_id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">
                No audit logs yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
