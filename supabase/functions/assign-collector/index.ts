/**
 * Edge Function: assign-collector
 * 
 * Finds and assigns the best collector for a pickup request.
 * Uses nearest-suitable-collector algorithm.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Collector {
  id: string;
  distance_km: number;
  rating: number;
  vehicle_capacity_kg: number;
  current_jobs: number;
  acceptance_rate: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pickupRequestId, customerLat, customerLng, estimatedWeightKg, wasteType } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Find nearby collectors using PostGIS
    const { data: collectors } = await supabase.rpc("find_nearby_collectors", {
      pickup_lat: customerLat,
      pickup_lng: customerLng,
      max_distance_km: 10,
      required_capacity_kg: estimatedWeightKg,
    });

    if (!collectors?.length) {
      return new Response(JSON.stringify({ 
        assigned: false, 
        reason: "No collectors available nearby. Please try again shortly." 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Score and rank collectors
    const scored: (Collector & { score: number })[] = collectors.map((c: Collector) => ({
      ...c,
      score:
        (100 - Math.min(c.distance_km * 10, 50)) * 0.4 +  // Distance (40%)
        (c.rating * 10) * 0.3 +                             // Rating (30%)
        (100 - c.current_jobs * 20) * 0.15 +                 // Availability (15%)
        (c.acceptance_rate) * 0.15,                          // Acceptance (15%)
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best.score < 30) {
      return new Response(JSON.stringify({ 
        assigned: false, 
        reason: "Best available collector score too low. Expanding search." 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Assign collector
    const { error: assignError } = await supabase
      .from("collector_assignments")
      .insert({
        pickup_request_id: pickupRequestId,
        collector_id: best.id,
        distance_km: best.distance_km,
        estimated_arrival_minutes: Math.round(best.distance_km * 3),
        accepted_at: null,
      });

    if (assignError) throw assignError;

    // Update pickup request
    await supabase
      .from("pickup_requests")
      .update({ collector_id: best.id, status: "collector_assigned", updated_at: new Date().toISOString() })
      .eq("id", pickupRequestId);

    // Send notification to collector
    await supabase.from("notifications").insert({
      recipient_id: best.id,
      type: "new_pickup",
      title: "New Pickup Request",
      body: `New ${wasteType} pickup (${estimatedWeightKg}kg) nearby. Accept now!`,
      data: { pickup_request_id: pickupRequestId },
    });

    return new Response(JSON.stringify({
      assigned: true,
      collectorId: best.id,
      estimatedArrivalMinutes: Math.round(best.distance_km * 3),
      distanceKm: best.distance_km,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
