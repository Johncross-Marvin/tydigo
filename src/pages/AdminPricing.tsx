import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, DollarSign, Loader2 } from "lucide-react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { toast } from "sonner";

type PricingRule = {
  id: string;
  name: string;
  waste_type: string | null;
  base_price_ngn: number;
  per_kg_price_ngn: number | null;
  is_active: boolean;
};

const AdminPricingPage = () => {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, { base: string; perKg: string }>>({});

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-pricing-rules"],
    queryFn: async (): Promise<PricingRule[]> => {
      if (!isSupabaseAvailable() || !supabase) return [];
      const { data } = await supabase
        .from("pricing_rules")
        .select("id, name, waste_type, base_price_ngn, per_kg_price_ngn, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      return (data as PricingRule[]) || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rule: PricingRule) => {
      if (!isSupabaseAvailable() || !supabase) throw new Error("Not available");
      const edit = edits[rule.id];
      const base = edit?.base !== undefined ? Number(edit.base) : rule.base_price_ngn;
      const perKg = edit?.perKg !== undefined && edit.perKg !== ""
        ? Number(edit.perKg)
        : rule.per_kg_price_ngn;

      if (!Number.isFinite(base) || base < 0) throw new Error("Invalid base price");
      if (perKg !== null && (!Number.isFinite(perKg) || perKg < 0)) throw new Error("Invalid per-kg price");

      const { error } = await supabase
        .from("pricing_rules")
        .update({ base_price_ngn: base, per_kg_price_ngn: perKg })
        .eq("id", rule.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-rules"] });
      setEdits({});
      toast.success("Pricing updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save pricing"),
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pricing Engine</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading pricing rules…
          </div>
        ) : rules.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-8 text-center text-neutral-400">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No pricing rules configured yet.</p>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => {
            const edit = edits[rule.id];
            return (
              <Card key={rule.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-sm">{rule.name}</p>
                    <p className="text-xs text-neutral-500">
                      {rule.waste_type ?? "General"} · base + per-kg
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={edit?.base ?? String(rule.base_price_ngn)}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [rule.id]: { base: e.target.value, perKg: prev[rule.id]?.perKg ?? String(rule.per_kg_price_ngn ?? "") },
                        }))
                      }
                      className="w-24 h-10 rounded-xl text-center font-bold"
                      aria-label={`${rule.name} base price`}
                    />
                    <Input
                      type="number"
                      value={edit?.perKg ?? String(rule.per_kg_price_ngn ?? "")}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [rule.id]: { base: prev[rule.id]?.base ?? String(rule.base_price_ngn), perKg: e.target.value },
                        }))
                      }
                      className="w-24 h-10 rounded-xl text-center font-bold"
                      aria-label={`${rule.name} per-kg price`}
                    />
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={saveMutation.isPending}
                      onClick={() => saveMutation.mutate(rule)}
                    >
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default AdminPricingPage;
