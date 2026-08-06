import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Apple,
  Package,
  FileText,
  Cpu,
  GlassWater,
  Recycle,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WasteType } from "@/services/pricing";

type QuickRequestFormProps = {
  onRequest: (wasteType: WasteType) => void;
};

const wasteTypes: { type: WasteType; label: string; icon: typeof Recycle; color: string; weightHint: string }[] = [
  { type: "plastic", label: "Plastic", icon: Package, color: "bg-blue-100 text-blue-600 border-blue-200", weightHint: "Bottles, bags, containers" },
  { type: "organic", label: "Organic", icon: Apple, color: "bg-green-100 text-green-600 border-green-200", weightHint: "Food waste, garden waste" },
  { type: "paper_cardboard", label: "Paper", icon: FileText, color: "bg-amber-100 text-amber-600 border-amber-200", weightHint: "Cardboard, newspapers" },
  { type: "general_waste", label: "General", icon: Trash, color: "bg-neutral-100 text-neutral-600 border-neutral-200", weightHint: "Mixed household waste" },
  { type: "metal_cans", label: "Metal", icon: Recycle, color: "bg-purple-100 text-purple-600 border-purple-200", weightHint: "Cans, tins, scrap metal" },
  { type: "glass", label: "Glass", icon: GlassWater, color: "bg-cyan-100 text-cyan-600 border-cyan-200", weightHint: "Bottles, jars" },
  { type: "e_waste", label: "E-Waste", icon: Cpu, color: "bg-red-100 text-red-600 border-red-200", weightHint: "Electronics, batteries" },
  { type: "mixed_waste", label: "Mixed", icon: Trash2, color: "bg-gray-100 text-gray-600 border-gray-200", weightHint: "Unsorted mixed waste" },
];

export function QuickRequestForm({ onRequest }: QuickRequestFormProps) {
  const [selected, setSelected] = useState<WasteType | null>(null);

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-900">Quick Request</h3>
          <Badge className="bg-green-100 text-[#145C25] rounded-full text-xs">
            <Plus className="w-3 h-3 mr-1" />
            New Pickup
          </Badge>
        </div>

        <p className="text-sm text-neutral-500 mb-4">
          Select your waste type to start a pickup request:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {wasteTypes.map((wt) => (
            <button
              key={wt.type}
              onClick={() => setSelected(wt.type)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                wt.color,
                selected === wt.type
                  ? "ring-2 ring-[#145C25] ring-offset-1 scale-105"
                  : "hover:scale-105 hover:shadow-sm",
              )}
            >
              <wt.icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{wt.label}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-xl bg-green-50 p-3 mb-4">
            <p className="text-xs text-green-700 font-medium">
              {wasteTypes.find((w) => w.type === selected)?.weightHint}
            </p>
            <p className="text-xs text-green-600 mt-1">
              💡 Tip: 1 small bag ≈ 5kg, 1 large bin ≈ 15kg
            </p>
          </div>
        )}

        <Button
          onClick={() => selected && onRequest(selected)}
          disabled={!selected}
          className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          {selected ? `Request ${wasteTypes.find((w) => w.type === selected)?.label} Pickup` : "Select Waste Type"}
        </Button>
      </CardContent>
    </Card>
  );
}
