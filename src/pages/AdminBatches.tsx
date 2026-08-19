import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, MapPin, Package } from "lucide-react";
import { listBatches, type WasteBatch } from "@/services/admin";

const statusStyles: Record<string, string> = {
  collected: "bg-blue-100 text-blue-600",
  in_transit: "bg-blue-100 text-blue-600",
  transferred: "bg-indigo-100 text-indigo-600",
  destination_assigned: "bg-purple-100 text-purple-600",
  received: "bg-amber-100 text-amber-600",
  accepted: "bg-green-100 text-[#145C25]",
  partially_accepted: "bg-amber-100 text-amber-600",
  rejected: "bg-red-100 text-red-600",
  inventoried: "bg-green-100 text-[#145C25]",
};

const formatStatus = (status: string) => status.replace(/_/g, " ");

const AdminBatchesPage = () => {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["admin-batches"],
    queryFn: () => listBatches({ limit: 50 }),
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/admin/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </Link>
        <h1 className="font-bold text-neutral-900">Batch Tracking</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <p className="text-center text-neutral-400 py-12">Loading batches…</p>
        ) : batches.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No waste batches recorded yet.</p>
          </div>
        ) : (
          batches.map((batch: WasteBatch) => (
            <Card key={batch.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-neutral-500" />
                    <span className="font-bold text-neutral-900 text-sm">
                      {batch.batch_reference || batch.id.slice(0, 8)}
                    </span>
                  </div>
                  <Badge className={`rounded-full text-xs ${statusStyles[batch.status] || "bg-neutral-100 text-neutral-600"}`}>
                    {formatStatus(batch.status)}
                  </Badge>
                </div>
                <p className="font-semibold text-neutral-700">{batch.material_type}</p>
                <p className="text-sm text-neutral-500">{batch.quantity_kg.toLocaleString()} kg</p>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {batch.source_zone || "Unknown zone"}
                  </span>
                  {batch.destination_type && (
                    <>
                      <span>→</span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {batch.destination_type}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default AdminBatchesPage;
