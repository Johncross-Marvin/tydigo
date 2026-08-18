/**
 * Tydigo Government Service
 *
 * Government oversight analytics backed by Supabase. Queries aggregate
 * (non-personal) data only — no individual user records are exposed.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type RegionalStat = {
  name: string;
  wasteCollectedKg: number;
  recyclingRate: number;
  activeCollectors: number;
};

export type ComplianceData = {
  registeredCollectors: number;
  licensedOperators: number;
  complianceRate: number;
};

export type EnvironmentalImpact = {
  totalWasteDivertedKg: number;
  recyclingRate: number;
  carbonOffsetKg: number;
  landfillSavedKg: number;
};

// ─── Regional Analytics ──────────────────────────────────────
export async function getRegionalAnalytics(): Promise<RegionalStat[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  // Aggregate completed pickups by city/state (no personal data).
  const { data: zones } = await supabase
    .from("city_zones")
    .select("id, name, city_id");

  const { data: pickups } = await supabase
    .from("pickup_requests")
    .select("city_id, estimated_weight_kg, status")
    .eq("status", "completed");

  const { data: collectors } = await supabase
    .from("collector_profiles")
    .select("profile_id, is_online");

  // Build a simple per-zone aggregate. If no zones exist, return empty
  // (honest empty state) rather than fabricating regional numbers.
  const zoneMap = new Map<string, { name: string; kg: number; count: number }>();
  for (const z of zones ?? []) {
    zoneMap.set(z.id as string, { name: z.name as string, kg: 0, count: 0 });
  }

  for (const p of pickups ?? []) {
    const zone = zoneMap.get((p.city_id as string) ?? "");
    if (zone) {
      zone.kg += Number(p.estimated_weight_kg ?? 0);
      zone.count += 1;
    }
  }

  const activeCollectors = (collectors ?? []).filter((c) => c.is_online).length;

  return Array.from(zoneMap.values()).map((z) => ({
    name: z.name,
    wasteCollectedKg: Math.round(z.kg),
    recyclingRate: 0, // Derived from real diversion data when available
    activeCollectors,
  }));
}

// ─── Compliance ──────────────────────────────────────────────
export async function getComplianceData(): Promise<ComplianceData> {
  if (!isSupabaseAvailable() || !supabase) {
    return { registeredCollectors: 0, licensedOperators: 0, complianceRate: 0 };
  }

  const { count: registeredCollectors } = await supabase
    .from("collector_profiles")
    .select("*", { count: "exact", head: true });

  const { count: licensedOperators } = await supabase
    .from("collector_profiles")
    .select("*", { count: "exact", head: true })
    .eq("kyc_status", "approved");

  const total = registeredCollectors ?? 0;
  const licensed = licensedOperators ?? 0;
  const complianceRate = total > 0 ? Math.round((licensed / total) * 100) : 0;

  return {
    registeredCollectors: total,
    licensedOperators: licensed,
    complianceRate,
  };
}

// ─── Environmental Impact ────────────────────────────────────
export async function getEnvironmentalImpact(): Promise<EnvironmentalImpact> {
  if (!isSupabaseAvailable() || !supabase) {
    return {
      totalWasteDivertedKg: 0,
      recyclingRate: 0,
      carbonOffsetKg: 0,
      landfillSavedKg: 0,
    };
  }

  // Use the canonical aggregate view for environmental impact.
  const { data } = await supabase
    .from("impact_report_view")
    .select("*")
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (data as Record<string, unknown> | null) ?? {};

  return {
    totalWasteDivertedKg: Number(row.total_kg ?? 0),
    recyclingRate: 0, // Derived from diversion ratio when available
    carbonOffsetKg: Number(row.carbon_offset_kg ?? 0),
    landfillSavedKg: Number(row.landfill_diverted_kg ?? 0),
  };
}

// ─── Public Report ───────────────────────────────────────────
export async function generatePublicReport(period: string): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  // Persist a report generation request. The actual report is generated
  // server-side; this records the intent for auditability.
  await supabase.from("impact_reports").insert({
    period,
    status: "pending",
    requested_at: new Date().toISOString(),
  });
}
