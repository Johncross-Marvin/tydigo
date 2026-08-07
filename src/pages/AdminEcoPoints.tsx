import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Award, Star, Gift, TrendingUp,
  Users, Wallet, Shield, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatEcopoints } from "@/services/ecopoints";

const AdminEcoPointsPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("rules");

  // Fetch reward rules from DB
  const { data: rules } = useQuery({
    queryKey: ["admin-reward-rules"],
    queryFn: async () => {
      const { data } = await supabase!.from("reward_rules").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["admin-eco-analytics"],
    queryFn: async () => {
      const [{ data: wallets }, { data: txns }, { data: redemptions }] = await Promise.all([
        supabase!.from("eco_points_wallets").select("balance, lifetime_earned, lifetime_redeemed"),
        supabase!.from("ecopoint_transactions").select("points, status").eq("status", "confirmed"),
        supabase!.from("eco_redemptions").select("points_used, monetary_value_ngn").eq("status", "fulfilled"),
      ]);
      const totalIssued = (txns || []).filter((t: Record<string,unknown>) => (t.points as number) > 0).reduce((s: number, t: Record<string,unknown>) => s + Number(t.points), 0);
      const totalRedeemed = (redemptions || []).reduce((s: number, r: Record<string,unknown>) => s + Number(r.points_used), 0);
      const totalValueRedeemed = (redemptions || []).reduce((s: number, r: Record<string,unknown>) => s + Number(r.monetary_value_ngn), 0);
      const activeWallets = (wallets || []).length;
      const outstandingBalance = (wallets || []).reduce((s: number, w: Record<string,unknown>) => s + Number(w.balance), 0);
      return { totalIssued, totalRedeemed, totalValueRedeemed, activeWallets, outstandingBalance };
    },
  });

  // Toggle rule active status
  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase!.from("reward_rules").update({ is_active: isActive }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reward-rules"] });
      toast.success("Rule updated");
    },
  });

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-3">
        <Link to="/admin/dashboard" className="p-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">EcoPoints Admin</h1>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
              <p className="text-lg font-extrabold">{formatEcopoints(analytics?.totalIssued || 0)}</p>
              <p className="text-[10px] text-neutral-500">Total Issued</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Gift className="w-4 h-4 text-amber-500 mb-1" />
              <p className="text-lg font-extrabold">{formatEcopoints(analytics?.totalRedeemed || 0)}</p>
              <p className="text-[10px] text-neutral-500">Total Redeemed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Users className="w-4 h-4 text-blue-500 mb-1" />
              <p className="text-lg font-extrabold">{analytics?.activeWallets || 0}</p>
              <p className="text-[10px] text-neutral-500">Active Wallets</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Wallet className="w-4 h-4 text-purple-500 mb-1" />
              <p className="text-lg font-extrabold">{formatEcopoints(analytics?.outstandingBalance || 0)}</p>
              <p className="text-[10px] text-neutral-500">Outstanding</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 rounded-2xl bg-neutral-100 p-1">
            <TabsTrigger value="rules" className="rounded-xl text-xs">Rules</TabsTrigger>
            <TabsTrigger value="conversion" className="rounded-xl text-xs">Conversion</TabsTrigger>
            <TabsTrigger value="fraud" className="rounded-xl text-xs">Fraud</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4 space-y-3">
            {(rules || []).map((rule: Record<string,unknown>) => (
              <Card key={rule.id as string} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    rule.is_active ? "bg-amber-100" : "bg-neutral-100"
                  }`}>
                    <Award className={`w-5 h-5 ${rule.is_active ? "text-amber-600" : "text-neutral-400"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 text-sm">{rule.name as string}</p>
                    <p className="text-[10px] text-neutral-400">
                      {rule.trigger_event as string} • {rule.role as string}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[#145C25]">{formatEcopoints(rule.points as number)}</p>
                    <button
                      onClick={() => toggleRule.mutate({ id: rule.id as string, isActive: !rule.is_active })}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        rule.is_active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {rule.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="conversion" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Conversion Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Points per ₦10</span>
                  <Input defaultValue="100" className="w-24 h-10 rounded-xl text-center" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Discount %</span>
                  <Input defaultValue="50" className="w-24 h-10 rounded-xl text-center" />
                </div>
                <Button className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fraud" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="font-bold text-neutral-700">Fraud Monitoring</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Suspicious activity will be flagged automatically. Review flagged transactions here.
                </p>
                <Button variant="outline" className="mt-4 rounded-xl" disabled>
                  <AlertTriangle className="w-4 h-4 mr-2" /> No flags yet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminEcoPointsPage;
