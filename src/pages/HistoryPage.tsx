import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, Clock, MapPin, Star, Truck } from "lucide-react";
import { api, formatNaira, formatWeight } from "@/lib/api";

const HistoryPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pickups"],
    queryFn: api.listPickups,
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pickup History</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
        {isLoading && <div className="rounded-2xl bg-white p-6 text-center text-neutral-500">Loading pickup records...</div>}

        {!isLoading && !data?.pickups.length && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-8 text-center">
              <h2 className="font-bold text-neutral-900">No pickup records yet</h2>
              <p className="text-sm text-neutral-500 mt-1">Your saved pickups will appear here after you request one.</p>
            </CardContent>
          </Card>
        )}

        {data?.pickups.map((pickup) => (
          <Card key={pickup.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">{pickup.pickup_code}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {new Date(pickup.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-[#145C25] rounded-full text-xs capitalize">{pickup.status.replace("_", " ")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <MapPin className="w-3.5 h-3.5" /> {pickup.address}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Award className="w-3.5 h-3.5" /> {pickup.waste_type} - {formatWeight(Number(pickup.weight_kg))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="font-bold text-[#145C25]">{formatNaira(pickup.price_ngn)}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default HistoryPage;
