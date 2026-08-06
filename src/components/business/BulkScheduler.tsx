import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Plus, Trash2, Building2 } from "lucide-react";

type BulkSchedulerProps = {
  locations: Array<{ id: string; address: string; label: string }>;
  onSchedule: (data: {
    locationIds: string[];
    wasteType: string;
    weightKg: number;
    scheduleWindow: string;
    frequency: string;
  }) => void;
};

const wasteTypes = [
  "general_waste", "plastic", "organic", "paper_cardboard", "metal_cans", "glass", "mixed_waste",
];

const frequencies = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function BulkScheduler({ locations, onSchedule }: BulkSchedulerProps) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [wasteType, setWasteType] = useState("general_waste");
  const [weightKg, setWeightKg] = useState(10);
  const [scheduleWindow, setScheduleWindow] = useState("today");
  const [frequency, setFrequency] = useState("once");

  const toggleLocation = (id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (selectedLocations.length === 0) return;
    onSchedule({ locationIds: selectedLocations, wasteType, weightKg, scheduleWindow, frequency });
  };

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Bulk Pickup Scheduler</h3>
        </div>

        {/* Location selection */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-neutral-700 mb-2 block">
            Select Locations ({selectedLocations.length} selected)
          </Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => toggleLocation(loc.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedLocations.includes(loc.id)
                    ? "border-[#145C25] bg-green-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${selectedLocations.includes(loc.id) ? "text-[#145C25]" : "text-neutral-400"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{loc.label}</p>
                  <p className="text-xs text-neutral-500 truncate">{loc.address}</p>
                </div>
              </button>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No locations added yet. Add locations in settings.
              </p>
            )}
          </div>
        </div>

        {/* Config */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Waste Type</Label>
            <Select value={wasteType} onValueChange={setWasteType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wasteTypes.map((wt) => (
                  <SelectItem key={wt} value={wt} className="capitalize">
                    {wt.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Weight (kg)</Label>
            <Input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              min={1}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Schedule</Label>
            <Select value={scheduleWindow} onValueChange={setScheduleWindow}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={selectedLocations.length === 0}
          className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule {selectedLocations.length} Pickup{selectedLocations.length !== 1 ? "s" : ""}
        </Button>
      </CardContent>
    </Card>
  );
}
