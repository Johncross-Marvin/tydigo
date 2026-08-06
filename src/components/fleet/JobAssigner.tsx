import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, MapPin, Truck } from "lucide-react";
import type { FleetCollector, CollectorJob } from "@/lib/api";

type JobAssignerProps = {
  unassignedJobs: CollectorJob[];
  collectors: FleetCollector[];
  onAssign: (jobId: string, collectorId: string) => void;
};

export function JobAssigner({ unassignedJobs, collectors, onAssign }: JobAssignerProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const availableCollectors = collectors.filter((c) => c.is_online && !c.active_job_id);

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Job Assignment</h3>
          <Badge className="bg-amber-100 text-amber-600 rounded-full text-xs ml-auto">
            {unassignedJobs.length} unassigned
          </Badge>
        </div>

        {unassignedJobs.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">
            All jobs are assigned. Great work!
          </p>
        ) : (
          <div className="space-y-3">
            {unassignedJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="p-3 rounded-xl bg-neutral-50 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">
                    {job.pickup_code}
                  </Badge>
                  <span className="text-sm font-bold text-[#145C25]">
                    ₦{job.price_ngn.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{job.address}</span>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={assignments[job.id] ?? ""}
                    onValueChange={(v) => setAssignments((prev) => ({ ...prev, [job.id]: v }))}
                  >
                    <SelectTrigger className="flex-1 rounded-xl text-sm h-9">
                      <SelectValue placeholder="Select collector" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCollectors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} ({c.rating.toFixed(1)}★)
                        </SelectItem>
                      ))}
                      {availableCollectors.length === 0 && (
                        <SelectItem value="none" disabled>
                          No available collectors
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => assignments[job.id] && onAssign(job.id, assignments[job.id])}
                    disabled={!assignments[job.id]}
                    size="sm"
                    className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl h-9"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1" />
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
