/**
 * Edge Function: calculate-price
 * 
 * Calculates pickup pricing server-side.
 * Called by the frontend to get accurate pricing before pickup creation.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { weightKg, wasteType, city, zone, ecopointsToApply } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get pricing rules for this waste type and zone
    const { data: pricingRules } = await supabase
      .from("pricing_rules")
      .select("*")
      .or(`waste_type.eq.${wasteType},waste_type.is.null`)
      .order("min_kg", { ascending: true });

    // Find matching tier
    const tier = pricingRules?.find(
      (r) => weightKg >= (r.min_kg ?? 0) && (r.max_kg === null || weightKg <= r.max_kg)
    ) || pricingRules?.[pricingRules.length - 1];

    if (!tier) throw new Error("No pricing tier found");

    const basePriceNgn = tier.base_price_ngn + Math.round(Math.max(0, weightKg - (tier.min_kg ?? 0)) * (tier.per_kg_price_ngn ?? 0));
    const modifierPercent = tier.modifier_percent ?? 0;
    const wasteModifierNgn = Math.round(basePriceNgn * modifierPercent / 100);
    const subtotalBeforeFee = basePriceNgn + wasteModifierNgn;
    const platformFeeNgn = Math.round(subtotalBeforeFee * 0.10);
    const subtotalNgn = subtotalBeforeFee + platformFeeNgn;
    
    const maxEcoDiscount = Math.round(subtotalNgn * 0.50);
    const ecoDiscountNgn = Math.min(Math.round((ecopointsToApply ?? 0) * 0.10), maxEcoDiscount);
    const finalTotalNgn = Math.max(subtotalNgn - ecoDiscountNgn, 500);

    return new Response(JSON.stringify({
      basePriceNgn,
      wasteModifierNgn,
      wasteModifierPercent: modifierPercent,
      platformFeeNgn,
      platformFeePercent: 10,
      ecopointsDiscountNgn: ecoDiscountNgn,
      ecopointsApplied: Math.ceil(ecoDiscountNgn / 0.10),
      subtotalNgn,
      finalTotalNgn,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
