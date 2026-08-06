/**
 * Tydigo Payment Page
 *
 * Secure payment processing with Paystack, wallet, and EcoPoints.
 */

import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CreditCard, Wallet, Shield, CheckCircle2, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { formatNaira } from "@/services/pricing";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pickupId = searchParams.get("pickupId");
  const amount = Number(searchParams.get("amount") || "0");
  const [method, setMethod] = useState<"card" | "wallet">("card");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    setDone(true);
    setTimeout(() => {
      navigate(`/household/completion?pickupId=${pickupId}`, { replace: true });
    }, 1500);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900">Payment Successful!</h2>
          <p className="text-neutral-500">Redirecting to completion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Payment</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Amount */}
        <Card className="border-0 shadow-brand-lg rounded-3xl bg-gradient-to-br from-[#145C25] to-green-700 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-white/70 text-sm">Total Amount</p>
            <p className="text-4xl font-extrabold mt-1">{formatNaira(amount)}</p>
            <p className="text-white/50 text-xs mt-2">Secure payment powered by Paystack</p>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Payment Method</h3>
          <div className="space-y-2">
            <button
              onClick={() => setMethod("card")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${method === "card" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}
            >
              <CreditCard className="w-6 h-6 text-[#145C25]" />
              <div className="flex-1 text-left">
                <p className="font-bold text-neutral-900">Card Payment</p>
                <p className="text-xs text-neutral-500">Visa, Mastercard, Verve</p>
              </div>
              {method === "card" && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
            </button>
            <button
              onClick={() => setMethod("wallet")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${method === "wallet" ? "border-[#145C25] bg-green-50" : "border-neutral-200"}`}
            >
              <Wallet className="w-6 h-6 text-[#145C25]" />
              <div className="flex-1 text-left">
                <p className="font-bold text-neutral-900">Wallet</p>
                <p className="text-xs text-neutral-500">Balance: ₦0</p>
              </div>
              {method === "wallet" && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 justify-center">
          <Shield className="w-3 h-3" /> Secured by Paystack • 256-bit encryption
        </div>

        <Button
          onClick={handlePay}
          disabled={processing}
          className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-14 text-lg"
        >
          {processing ? "Processing..." : `Pay ${formatNaira(amount)}`}
        </Button>
      </main>
    </div>
  );
};

export default PaymentPage;
