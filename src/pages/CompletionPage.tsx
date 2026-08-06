/**
 * Tydigo Completion Page
 *
 * Post-pickup summary with receipt, EcoPoints earned, and rating.
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Award, Star, Download, Share2,
  Leaf, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getPickupById } from "@/services/pickup";
import { getReceiptDetails } from "@/services/receipt";
import { formatNaira } from "@/services/pricing";

const CompletionPage = () => {
  const [searchParams] = useSearchParams();
  const pickupId = searchParams.get("pickupId");
  const { user } = useAuth();
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    if (!pickupId) return;
    getReceiptDetails(pickupId).then((data) => {
      setReceipt(data);
      setLoading(false);
    });
  }, [pickupId]);

  const handleRate = (stars: number) => {
    setRating(stars);
    setRated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
      </div>
    );
  }

  const ecoPointsEarned = Math.round(((receipt?.estimated_weight_kg as number) || 0) * 10);
  const collectorName = (receipt?.collector as Record<string, unknown>)?.full_name as string || "Collector";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pickup Complete!</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Success Banner */}
        <Card className="border-0 shadow-brand-lg rounded-3xl bg-gradient-to-br from-[#145C25] to-green-700 text-white overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold">Pickup Completed!</h2>
            <p className="text-white/70 text-sm mt-1">Your waste has been collected successfully</p>
          </CardContent>
        </Card>

        {/* EcoPoints Earned */}
        <Card className="border-0 shadow-brand-lg rounded-2xl bg-amber-50 border border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Award className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-semibold">EcoPoints Earned</p>
              <p className="text-2xl font-extrabold text-amber-800">+{ecoPointsEarned}</p>
            </div>
            <Badge className="ml-auto bg-amber-200 text-amber-800">Level Up!</Badge>
          </CardContent>
        </Card>

        {/* Receipt Summary */}
        <Card className="border-0 shadow-brand-lg rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Receipt</h3>
              <Badge className="bg-neutral-100 text-neutral-600">{receipt?.receipt_number as string || "—"}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Pickup Code</span><span className="font-bold font-mono">{receipt?.pickup_code as string}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Waste Type</span><span className="font-semibold">{receipt?.waste_type as string}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Weight</span><span className="font-semibold">{receipt?.estimated_weight_kg as number}kg</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Collector</span><span className="font-semibold">{collectorName}</span></div>
              <hr className="border-neutral-200" />
              <div className="flex justify-between text-lg font-extrabold"><span>Total Paid</span><span className="text-[#145C25]">{formatNaira((receipt?.final_total_ngn as number) || 0)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Collector */}
        <Card className="border-0 shadow-brand-lg rounded-2xl">
          <CardContent className="p-4 text-center">
            <h3 className="font-bold text-neutral-900 mb-2">Rate Your Collector</h3>
            <p className="text-sm text-neutral-500 mb-3">{collectorName}</p>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  className={`w-10 h-10 rounded-xl transition-all ${star <= rating ? "bg-amber-100 text-amber-500" : "bg-neutral-100 text-neutral-300"}`}
                >
                  <Star className={`w-5 h-5 mx-auto ${star <= rating ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
            {rated && <p className="text-sm text-green-600 font-semibold">Thanks for your feedback!</p>}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl font-semibold">
            <Download className="w-4 h-4 mr-2" /> Receipt
          </Button>
          <Button variant="outline" className="flex-1 rounded-2xl font-semibold">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        <Link to="/household/dashboard">
          <Button className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-14 text-lg">
            Back to Dashboard
          </Button>
        </Link>
      </main>
    </div>
  );
};

export default CompletionPage;
