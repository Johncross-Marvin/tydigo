import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { COVERAGE_AREAS, type CoverageStatus } from "@/lib/site-config";

const STATUS_STYLES: Record<CoverageStatus, string> = {
  active: "bg-green-100 text-[#145C25]",
  pilot: "bg-amber-100 text-amber-700",
  coming_soon: "bg-neutral-100 text-neutral-500",
};

const STATUS_LABELS: Record<CoverageStatus, string> = {
  active: "Active",
  pilot: "Pilot",
  coming_soon: "Coming soon",
};

export function CoveragePreview() {
  const [query, setQuery] = useState("");

  const filtered = COVERAGE_AREAS.filter((area) => {
    const q = query.toLowerCase();
    return area.city.toLowerCase().includes(q) || area.state.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by city or state"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#145C25]/30"
          aria-label="Search cities"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-neutral-50 p-8 text-center">
          <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No matching cities</p>
          <p className="text-sm text-neutral-500 mt-1">
            Tydigo is expanding. Request your city below.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((area) => (
            <div
              key={`${area.city}-${area.state}`}
              className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#145C25]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900">
                  {area.city}, {area.state}
                </p>
                <p className="text-xs text-neutral-500 truncate">{area.services.join(" · ")}</p>
              </div>
              <Badge className={`${STATUS_STYLES[area.status]} rounded-full text-[10px] shrink-0`}>
                {STATUS_LABELS[area.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link
          to="/cities"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#145C25] hover:underline"
        >
          Request Tydigo in your city
        </Link>
      </div>
    </div>
  );
}
