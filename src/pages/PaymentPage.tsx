import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CreditCard, Shield, CheckCircle2, Lock } from "lucide-react";
import { api, formatNaira } from "@/lib/api";

const PaymentPage = () => {
  const queryClient = useQueryClient();
  const [paid, setPaid] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [pointsEarned, setPointsEarned] = useState(0);
  const { data } = useQuery({
    queryKey: ["pickups"],
    queryFn: api.listPickups,
  });
  const payablePickup = data?.pickups.find((pickup) => pickup.payment_status !== "paid") ?? data?.pickups[0];
  const paymentMutation = useMutation({
    mutationFn: api.createPayment,
    onSuccess: async (response) => {
      setPaymentReference(response.payment.reference);
      setPointsEarned(response.pointsEarned ?? 0);
      setPaid(true);
      await queryClient.invalidateQueries({ queryKey: ["pickups"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handlePayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payablePickup) return;
    paymentMutation.mutate({ pickupId: payablePickup.id, method: "card" });
  };

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
            {!payablePickup ? (
              <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
                <CardContent className="p-8 text-center space-y-4">
                  <h2 className="text-xl font-extrabold text-neutral-900">No pickup to pay for</h2>
                  <p className="text-neutral-500">Create a pickup request first, then return here to pay.</p>
                  <Link to="/household/request-pickup">
                    <Button className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">Request Pickup</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
            <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-[#145C25]" />
                  <div>
                    <h2 className="font-bold text-neutral-900">Pay for Pickup</h2>
                    <p className="text-sm text-neutral-500">{payablePickup.pickup_code} - {payablePickup.waste_type}, {payablePickup.weight_kg} kg</p>
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Pickup status</span><span className="capitalize">{payablePickup.status}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-neutral-500">Payment status</span><span className="capitalize">{payablePickup.payment_status.replace("_", " ")}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-neutral-200"><span>Total</span><span className="text-[#145C25] text-lg">{formatNaira(payablePickup.price_ngn)}</span></div>
                </div>
                <form onSubmit={handlePayment} className="space-y-3">
                  <label className="text-sm font-semibold text-neutral-700">Card Number</label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    className="h-12 rounded-xl"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    minLength={16}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-neutral-700">Expiry</label>
                      <Input placeholder="MM/YY" className="h-12 rounded-xl" autoComplete="cc-exp" required />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-neutral-700">CVV</label>
                      <Input
                        placeholder="123"
                        type="password"
                        className="h-12 rounded-xl"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        minLength={3}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={paymentMutation.isPending}
                    className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand"
                  >
                    <Lock className="w-4 h-4 mr-2" /> {paymentMutation.isPending ? "Processing..." : `Pay ${formatNaira(payablePickup.price_ngn)}`}
                  </Button>
                  {paymentMutation.error && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      {paymentMutation.error instanceof Error ? paymentMutation.error.message : "Payment failed."}
                    </div>
                  )}
                </form>
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <Shield className="w-3.5 h-3.5" /> Secured by Paystack
                </div>
              </CardContent>
            </Card>
            )}
          </>
        ) : (
          <Card className="border-0 shadow-brand-lg rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
              </div>
              <h2 className="text-xl font-extrabold text-neutral-900">Payment Successful!</h2>
              <p className="text-neutral-500">
                {formatNaira(payablePickup?.price_ngn ?? 0)} paid successfully. Reference {paymentReference}.
              </p>
              <p className="text-sm text-[#145C25] font-semibold">+{pointsEarned.toLocaleString()} EcoPoints added to your account.</p>
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
