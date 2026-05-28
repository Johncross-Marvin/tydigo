import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Truck, MapPin, Package } from "lucide-react";

const AdminBatchesPage = () => {
  const batches = [
    { id: "BATCH-042", material: "Crushed PET Plastic", qty: "500 kg", from: "Abuja", to: "Lagos", status: "In Transit", progress: 65 },
    { id: "BATCH-041", material: "Cardboard Bales", qty: "1,200 kg", from: "Abuja", to: "Kano", status: "Delivered", progress: 100 },
    { id: "BATCH-040", material: "Aluminum Cans", qty: "300 kg", from: "Lagos", to: "Aba", status: "Processing", progress: 25 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Batch Tracking</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
        {batches.map((batch, i) => (
          <Card key={i} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-neutral-500" />
                  <span className="font-bold text-neutral-900 text-sm">{batch.id}</span>
                </div>
                <Badge className={`rounded-full text-xs ${
                  batch.status === "Delivered" ? "bg-green-100 text-[#145C25]" :
                  batch.status === "In Transit" ? "bg-blue-100 text-blue-600" :
                  "bg-amber-100 text-amber-600"
                }`}>{batch.status}</Badge>
              </div>
              <p className="font-semibold text-neutral-700">{batch.material}</p>
              <p className="text-sm text-neutral-500">{batch.qty}</p>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{batch.from}</span>
                <span>→</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{batch.to}</span>
              </div>
              <Progress value={batch.progress} className="h-1.5 rounded-full bg-neutral-100 [&>div]:bg-[#145C25]" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default AdminBatchesPage;
