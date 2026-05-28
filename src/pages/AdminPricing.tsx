import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, DollarSign } from "lucide-react";

const AdminPricingPage = () => {
  const pricingItems = [
    { label: "Base Pickup Fee", value: "₦500", desc: "Flat fee per pickup" },
    { label: "Plastic (per kg)", value: "₦50", desc: "PET, HDPE, LDPE" },
    { label: "Paper (per kg)", value: "₦30", desc: "Cardboard, newspaper" },
    { label: "Metal (per kg)", value: "₦80", desc: "Aluminum, steel" },
    { label: "Organic (per kg)", value: "₦20", desc: "Food & garden waste" },
    { label: "E-Waste (per kg)", value: "₦100", desc: "Electronics, batteries" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pricing Engine</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {pricingItems.map((item, i) => (
          <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#145C25]" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900 text-sm">{item.label}</p>
                <p className="text-xs text-neutral-500">{item.desc}</p>
              </div>
              <Input defaultValue={item.value.replace("₦", "")} className="w-24 h-10 rounded-xl text-center font-bold" />
            </CardContent>
          </Card>
        ))}
        <Button className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand">
          <Save className="w-4 h-4 mr-2" /> Save Pricing
        </Button>
      </main>
    </div>
  );
};

export default AdminPricingPage;
