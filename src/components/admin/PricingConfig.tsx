import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Save } from "lucide-react";
import { formatNaira } from "@/lib/api";
import type { PricingConfig as PricingConfigType } from "@/services/admin";

type PricingConfigProps = {
  configs: PricingConfigType[];
  onUpdate: (configId: string, updates: Record<string, unknown>) => void;
};

export function PricingConfig({ configs, onUpdate }: PricingConfigProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const groupedByType = configs.reduce<Record<string, PricingConfigType[]>>((acc, config) => {
    if (!acc[config.waste_type]) acc[config.waste_type] = [];
    acc[config.waste_type].push(config);
    return acc;
  }, {});

  const startEdit = (config: PricingConfigType) => {
    setEditingId(config.id);
    setEditValues({
      base_price_ngn: config.base_price_ngn,
      per_kg_price_ngn: config.per_kg_price_ngn,
    });
  };

  const saveEdit = (configId: string) => {
    onUpdate(configId, editValues);
    setEditingId(null);
  };

  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-[#145C25]" />
          <h3 className="font-bold text-neutral-900">Pricing Configuration</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedByType).map(([wasteType, tiers]) => (
            <div key={wasteType} className="rounded-xl bg-neutral-50 p-4">
              <h4 className="text-sm font-bold text-neutral-700 capitalize mb-3">
                {wasteType.replace(/_/g, " ")}
              </h4>
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <div key={tier.id} className="flex items-center gap-3">
                    <Badge className="bg-neutral-200 text-neutral-700 rounded-full text-xs shrink-0">
                      {tier.tier_name}
                    </Badge>
                    {editingId === tier.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="number"
                          value={editValues.base_price_ngn ?? tier.base_price_ngn}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              base_price_ngn: Number(e.target.value),
                            }))
                          }
                          className="h-8 w-24 rounded-lg text-sm"
                        />
                        <Input
                          type="number"
                          value={editValues.per_kg_price_ngn ?? tier.per_kg_price_ngn}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              per_kg_price_ngn: Number(e.target.value),
                            }))
                          }
                          className="h-8 w-24 rounded-lg text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEdit(tier.id)}
                          className="h-8 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-lg"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-neutral-600 flex-1">
                          Base: {formatNaira(tier.base_price_ngn)} | Per kg: {formatNaira(tier.per_kg_price_ngn)}
                        </span>
                        <Switch checked={tier.active} className="scale-75" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(tier)}
                          className="text-xs text-[#145C25] h-7"
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
