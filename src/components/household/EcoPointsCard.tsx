import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Sparkles, TrendingUp, Gift } from "lucide-react";

type EcoPointsCardProps = {
  balance: number;
  lifetime?: number;
};

export function EcoPointsCard({ balance, lifetime }: EcoPointsCardProps) {
  return (
    <Card className="border-0 shadow-md shadow-neutral-200/30 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-900">EcoPoints</h3>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-3xl font-black text-neutral-900">
              {balance.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            ≈ ₦{(balance * 0.1).toLocaleString()} in value
          </p>
          {lifetime !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
              <TrendingUp className="w-3 h-3" />
              <span>{lifetime.toLocaleString()} lifetime points earned</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link to="/household/redeem" className="flex-1">
            <Button className="w-full bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm">
              <Gift className="w-4 h-4 mr-1.5" />
              Redeem
            </Button>
          </Link>
          <Link to="/household/ecopoints" className="flex-1">
            <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-sm">
              History
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
