import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Award, Star, Gift } from "lucide-react";

const AdminEcoPointsPage = () => {
  const rules = [
    { label: "Signup Bonus", value: "500", icon: Award },
    { label: "First Pickup Bonus", value: "1,000", icon: Star },
    { label: "Sort Plastic (per kg)", value: "300", icon: Award },
    { label: "Sort Paper (per kg)", value: "200", icon: Award },
    { label: "5 Pickups/Month Bonus", value: "1,500", icon: Star },
    { label: "Referral Bonus", value: "2,000", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">EcoPoints Rules</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {rules.map((rule, i) => (
          <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <rule.icon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900 text-sm">{rule.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue={rule.value} className="w-24 h-10 rounded-xl text-center font-bold" />
                <span className="text-sm text-neutral-500">pts</span>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand">
          <Save className="w-4 h-4 mr-2" /> Save Rules
        </Button>
      </main>
    </div>
  );
};

export default AdminEcoPointsPage;
