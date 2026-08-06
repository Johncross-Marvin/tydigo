import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyStateInline } from "@/components/ui/empty-state";
import {
  Search,
  Package,
  MapPin,
  Scale,
  DollarSign,
  ShoppingCart,
  Filter,
} from "lucide-react";
import type { PartnerMaterialRequest } from "@/lib/api";
import { formatNaira, formatWeight } from "@/lib/api";

type MaterialMarketplaceProps = {
  materials: PartnerMaterialRequest[];
  onRequest: (materialId: string) => void;
};

const materialIcons: Record<string, typeof Package> = {
  plastic: Package,
  organic: Package,
  paper_cardboard: Package,
  metal_cans: Package,
  glass: Package,
  e_waste: Package,
};

export function MaterialMarketplace({ materials, onRequest }: MaterialMarketplaceProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = materials.filter((m) => {
    if (filter !== "all" && m.material !== filter) return false;
    if (search && !m.material.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const materialTypes = [...new Set(materials.map((m) => m.material))];

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="pl-10 rounded-xl"
          />
        </div>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Material type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Badge
          onClick={() => setFilter("all")}
          className={`cursor-pointer rounded-full whitespace-nowrap ${
            filter === "all" ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </Badge>
        {materialTypes.map((type) => (
          <Badge
            key={type}
            onClick={() => setFilter(type)}
            className={`cursor-pointer rounded-full capitalize whitespace-nowrap ${
              filter === type ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {type.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      {/* Material cards */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <EmptyStateInline
              icon={Package}
              title="No materials available"
              description="Check back soon for new material batches."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((material) => (
            <Card key={material.id} className="border-0 shadow-sm shadow-neutral-200/20 rounded-2xl hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-purple-100 text-purple-600 rounded-full capitalize text-xs">
                    {material.material.replace(/_/g, " ")}
                  </Badge>
                  <Badge className={`rounded-full text-xs ${
                    material.status === "available" ? "bg-green-100 text-green-600" :
                    material.status === "requested" ? "bg-amber-100 text-amber-600" :
                    "bg-neutral-100 text-neutral-600"
                  }`}>
                    {material.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-neutral-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatWeight(material.quantity_kg)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatNaira(material.price_per_kg_ngn)}/kg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="truncate">{material.delivery_address}</span>
                  </div>
                </div>

                <Button
                  onClick={() => onRequest(material.id)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Request Material
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
