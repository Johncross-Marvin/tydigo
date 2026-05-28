import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Star, Award, Home, Share2 } from "lucide-react";

const CompletionPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="border-0 shadow-brand-lg rounded-3xl max-w-md w-full">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-[#145C25]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">Pickup Complete!</h1>
            <p className="text-neutral-500 mt-1">Your waste has been collected successfully.</p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Pickup ID</span>
              <span className="font-bold">WST-4829</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Collector</span>
              <span className="font-bold">Ibrahim Musa</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Waste Collected</span>
              <span className="font-bold">Plastic — 5 kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">EcoPoints Earned</span>
              <span className="font-bold text-[#145C25]">+500 pts</span>
            </div>
          </div>

          {/* Rating */}
          <div>
            <p className="text-sm font-semibold text-neutral-700 mb-2">Rate Your Collector</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} className="p-1 hover:scale-110 transition-transform">
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
            <Button variant="outline" className="rounded-xl">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionPage;
