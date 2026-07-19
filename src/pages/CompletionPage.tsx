import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Star, Home, Share2 } from "lucide-react";
import { api, formatWeight } from "@/lib/api";

const CompletionPage = () => {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });
  const pickup = data?.recentPickups[0] ?? data?.activePickup ?? null;
  const earnedPoints = pickup ? Math.max(100, Math.round(Number(pickup.weight_kg) * 100)) : 0;

  const handleShare = async () => {
    const shareText = pickup
      ? `I just completed Tydigo pickup ${pickup.pickup_code} and earned ${earnedPoints.toLocaleString()} EcoPoints.`
      : "I just completed a Tydigo pickup.";

    if (navigator.share) {
      await navigator.share({ title: "Tydigo Pickup Complete", text: shareText, url: window.location.origin });
      return;
    }

    await navigator.clipboard.writeText(`${shareText} ${window.location.origin}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="border-0 shadow-brand-lg rounded-3xl max-w-md w-full">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-[#145C25]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">Pickup Complete!</h1>
            <p className="text-neutral-500 mt-1">Your saved pickup record is ready for review.</p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Pickup ID</span>
              <span className="font-bold">{pickup?.pickup_code ?? "No pickup yet"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Collector</span>
              <span className="font-bold">{pickup?.collector_name ?? "Unassigned"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Waste Collected</span>
              <span className="font-bold">{pickup ? `${pickup.waste_type} - ${formatWeight(Number(pickup.weight_kg))}` : "Pending"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">EcoPoints Earned</span>
              <span className="font-bold text-[#145C25]">+{earnedPoints.toLocaleString()} pts</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-2">Rate Your Collector</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} className="p-1 hover:scale-110 transition-transform" aria-label={`Rate ${s} stars`}>
                  <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/household/dashboard" className="flex-1">
              <Button className="w-full bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                <Home className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            </Link>
            <Button variant="outline" className="rounded-xl" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionPage;
