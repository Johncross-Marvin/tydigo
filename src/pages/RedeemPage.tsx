import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gift, Smartphone, ShoppingBag, CreditCard, Zap, Award } from "lucide-react";

const RedeemPage = () => {
  const rewards = [
    { icon: Smartphone, title: "₦500 Airtime", pts: "1,000 pts", desc: "MTN, Airtel, Glo, 9mobile", color: "bg-blue-100 text-blue-600" },
    { icon: CreditCard, title: "₦2,500 Cash", pts: "5,000 pts", desc: "Direct bank transfer", color: "bg-green-100 text-[#145C25]" },
    { icon: ShoppingBag, title: "₦1,000 Shopping", pts: "2,000 pts", desc: "Jumia, Konga voucher", color: "bg-purple-100 text-purple-600" },
    { icon: Zap, title: "₦200 Electricity", pts: "400 pts", desc: "Prepaid meter token", color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Redeem Points</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Balance */}
        <Card className="border-0 shadow-brand rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Available Points</p>
              <p className="text-3xl font-extrabold text-amber-900">12,450</p>
            </div>
            <Award className="w-12 h-12 text-amber-400" />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {rewards.map((reward, i) => (
            <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${reward.color} flex items-center justify-center`}>
                  <reward.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-neutral-900">{reward.title}</h3>
                  <p className="text-xs text-neutral-500">{reward.desc}</p>
                </div>
                <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl text-sm">
                  <Gift className="w-4 h-4 mr-1.5" /> {reward.pts}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RedeemPage;
