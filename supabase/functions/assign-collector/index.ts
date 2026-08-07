/**
 * Edge Function: assign-collector
 *
 * Finds and assigns the best collector for a pickup request.
 * Uses PostGIS geospatial queries and the acceptance race protection RPC.
 *
 * Flow:
 * 1. Find nearby eligible collectors via find_nearby_eligible_collectors()
 * 2. Score and rank candidates
 * 3. Create offers via create_collector_offer()
 * 4. Notify top candidates
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CollectorCandidate {
  collector_id: string;
  profile_id: string;
  full_name: string;
  distance_km: number;
  rating: number;
  vehicle_capacity_kg: number;
  current_jobs: number;
  acceptance_rate: number;
  current_lat: number;
  current_lng: number;
}

interface ScoredCandidate extends CollectorCandidate {
  score: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const { pickupRequestId, customerLat, customerLng, estimatedWeightKg, wasteType } = body;

    if (!pickupRequestId || !customerLat || !customerLng) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: pickupRequestId, customerLat, customerLng",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[assign-collector] Finding collectors for pickup:", pickupRequestId);

    // 1. Find nearby eligible collectors
    const { data: collectors, error: findError } = await supabase.rpc(
      "find_nearby_eligible_collectors",
      {
        p_pickup_lat: customerLat,
        p_pickup_lng: customerLng,
        p_max_distance_km: 10,
        p_required_capacity_kg: estimatedWeightKg || null,
        p_waste_type: wasteType || null,
      },
    );

    if (findError) {
      console.error("[assign-collector] find_nearby_eligible_collectors error:", findError);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to find collectors: " + findError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates = (collectors || []) as CollectorCandidate[];

    if (!candidates.length) {
      console.log("[assign-collector] No eligible collectors found nearby");

      // Update pickup to indicate no match yet
      await supabase
        .from("pickup_requests")
        .update({ status: "matching_collector", updated_at: new Date().toISOString() })
        .eq("id", pickupRequestId);

      return new Response(JSON.stringify({
        success: true,
        assigned: false,
        reason: "No collectors available nearby. Search will continue.",
        candidatesFound: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Score and rank candidates
    const scored: ScoredCandidate[] = candidates.map((c) => {
      const distanceScore = Math.max(0, 100 - c.distance_km * 10); // 0-100, closer is better
      const ratingScore = c.rating * 20; // 0-100 (5.0 = 100)
      const availabilityScore = Math.max(0, 100 - c.current_jobs * 25); // Fewer jobs = better
      const acceptanceScore = c.acceptance_rate; // 0-100

      const score =
        distanceScore * 0.35 +
        ratingScore * 0.25 +
        availabilityScore * 0.20 +
        acceptanceScore * 0.20;

      return { ...c, score };
    });

    scored.sort((a, b) => b.score - a.score);

    console.log("[assign-collector] Top candidates:", scored.slice(0, 3).map((c) => ({
      id: c.collector_id,
      name: c.full_name,
      score: c.score.toFixed(1),
      distance: c.distance_km.toFixed(1) + "km",
    })));

    // 3. Create offers for top candidates (up to 3)
    const maxOffers = 3;
    const offersCreated: string[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < Math.min(maxOffers, scored.length); i++) {
      const candidate = scored[i];

      // Skip candidates with very low scores
      if (candidate.score < 20) {
        console.log("[assign-collector] Skipping low-score candidate:", candidate.collector_id, candidate.score);
        continue;
      }

      try {
        const { data: offerId, error: offerError } = await supabase.rpc(
          "create_collector_offer",
          {
            p_pickup_request_id: pickupRequestId,
            p_collector_id: candidate.collector_id,
            p_distance_km: candidate.distance_km,
            p_estimated_arrival_minutes: Math.round(candidate.distance_km * 3),
          },
        );

        if (offerError) {
          console.error("[assign-collector] create_collector_offer error:", offerError);
          continue;
        }

        if (offerId) {
          offersCreated.push(offerId as string);

          // Notify collector
          await supabase.from("notifications").insert({
            recipient_id: candidate.collector_id,
            type: "new_pickup",
            title: "New Pickup Available",
            body: `${wasteType || "Waste"} pickup (${estimatedWeightKg || "?"}kg) — ${candidate.distance_km.toFixed(1)}km away. Accept now!`,
            data: {
              pickup_id: pickupRequestId,
              assignment_id: offerId,
              distance_km: candidate.distance_km,
              estimated_arrival_minutes: Math.round(candidate.distance_km * 3),
            },
            read: false,
            created_at: now,
          });
        }
      } catch (err) {
        console.error("[assign-collector] Error creating offer for", candidate.collector_id, ":", err);
      }
    }

    // 4. Update pickup status
    await supabase
      .from("pickup_requests")
      .update({ status: "matching_collector", updated_at: now })
      .eq("id", pickupRequestId);

    // 5. Create analytics event
    await supabase.from("analytics_events").insert({
      event_name: "matching.started",
      entity_type: "pickup",
      entity_id: pickupRequestId,
      properties: {
        candidates_found: candidates.length,
        offers_created: offersCreated.length,
        top_score: scored[0]?.score || 0,
      },
      occurred_at: now,
    });

    return new Response(JSON.stringify({
      success: true,
      assigned: offersCreated.length > 0,
      candidatesFound: candidates.length,
      offersCreated: offersCreated.length,
      topCandidates: scored.slice(0, 3).map((c) => ({
        id: c.collector_id,
        name: c.full_name,
        score: Math.round(c.score),
        distanceKm: Math.round(c.distance_km * 10) / 10,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[assign-collector] Unexpected error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
