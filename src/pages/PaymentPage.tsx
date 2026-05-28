import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CreditCard, Shield, CheckCircle2, Lock } from "lucide-react";

const PaymentPage = () => {
  const [paid, setPaid] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Payment</h1>
      </header>

      <main className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        {!paid ? (
          <>
            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-[#145C25]" />
                  <div>
                    <h2 className="font-bold text-neutral-900">Pay for Pickup</h2>
                    <p className="text-sm text-neutral-500">WST-4829 — Plastic, 5 kg</p>
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Pickup fee</span><span>₦500</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Weight surcharge</span><span>₦250</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-neutral-200"><span>Total</span><span className="text-[#145C25] text-lg">₦750</span></div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-neutral-700">Card Number</label>
                  <Input placeholder="1234 5678 9012 3456" className="h-12 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-neutral-700">Expiry</label>
                      <Input placeholder="MM/YY" className="h-12 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-neutral-700">CVV</label>
                      <Input placeholder="123" type="password" className="h-12 rounded-xl" />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setPaid(true)}
                  className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand"
                >
                  <Lock className="w-4 h-4 mr-2" /> Pay ₦750
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <Shield className="w-3.5 h-3.5" /> Secured by Paystack
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-0 shadow-brand-lg rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
              </div>
              <h2 className="text-xl font-extrabold text-neutral-900">Payment Successful!</h2>
              <p className="text-neutral-500">₦750 has been paid for pickup WST-4829.</p>
              <Link to="/household/tracking">
                <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand">
                  Track Your Collector
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PaymentPage;
