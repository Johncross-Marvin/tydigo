import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, Award, Clock, MapPin, ChevronRight, Star } from "lucide-react";

const HistoryPage = () => {
  const pickups = [
    { id: "WST-4829", date: "Today", time: "10:30 AM", location: "Wuse Zone 2", waste: "Plastic", weight: "5 kg", cost: "₦750", status: "Completed", rating: 5 },
    { id: "WST-4815", date: "Yesterday", time: "2:15 PM", location: "Wuse Zone 2", waste: "Paper", weight: "3 kg", cost: "₦500", status: "Completed", rating: 4 },
    { id: "WST-4801", date: "May 25", time: "9:00 AM", location: "Wuse Zone 2", waste: "Organic", weight: "8 kg", cost: "₦900", status: "Completed", rating: 5 },
    { id: "WST-4790", date: "May 22", time: "4:45 PM", location: "Wuse Zone 2", waste: "Metal", weight: "2 kg", cost: "₦400", status: "Completed", rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/household/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Pickup History</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
        {pickups.map((pickup) => (
          <Card key={pickup.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">{pickup.id}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {pickup.date} at {pickup.time}
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-[#145C25] rounded-full text-xs">{pickup.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <MapPin className="w-3.5 h-3.5" /> {pickup.location}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Award className="w-3.5 h-3.5" /> {pickup.waste} — {pickup.weight}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="font-bold text-[#145C25]">{pickup.cost}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: pickup.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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
