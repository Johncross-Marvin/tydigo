import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/pickup", "");

    // GET /pickup — list pickups for current user
    if (req.method === "GET" && !path.includes("/")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }).limit(50);

      if (profile.role === "customer" || profile.role === "household") {
        query = query.eq("customer_id", profile.id);
      } else if (profile.role === "collector" || profile.role === "fleet") {
        query = query.eq("collector_id", profile.id);
      }

      const { data: pickups, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ pickups }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /pickup/:id/status — update pickup status
    if (req.method === "PATCH" && path.includes("/status")) {
      const pickupId = path.split("/")[1];
      const { status, notes } = await req.json();

      if (!pickupId || !status) {
        return new Response(JSON.stringify({ error: "Missing pickup ID or status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the user is authorized to update this pickup
      const { data: pickup } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("id", pickupId)
        .maybeSingle();

      if (!pickup) {
        return new Response(JSON.stringify({ error: "Pickup not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isCollector = profile.role === "collector" || profile.role === "fleet";
      const isAdmin = profile.role === "admin";
      const isOwner = pickup.customer_id === profile.id;
      const isAssigned = pickup.collector_id === profile.id;

      if (!isAdmin && !isOwner && !(isCollector && isAssigned)) {
        return new Response(JSON.stringify({ error: "Not authorized to update this pickup" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { status, updated_at: now };

      // Set timestamp columns based on status
      if (status === "collector_assigned") updates.collector_assigned_at = now;
      if (status === "collector_arrived") updates.collector_arrived_at = now;
      if (status === "pickup_verified") updates.pickup_verified_at = now;
      if (status === "waste_picked") updates.waste_picked_at = now;
      if (status === "completed") updates.completed_at = now;
      if (status === "cancelled") updates.cancelled_at = now;

      const { data: updated, error } = await supabase
        .from("pickup_requests")
        .update(updates)
        .eq("id", pickupId)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Create status event
      await supabase.from("pickup_status_events").insert({
        pickup_id: pickupId,
        to_status: status,
        notes: notes || `Status changed to ${status}`,
        created_at: now,
      });

      // Update profile stats on completion
      if (status === "completed") {
        await supabase.rpc("increment_pickup_count", { profile_id: pickup.customer_id });
        if (pickup.collector_id) {
          await supabase.rpc("increment_pickup_count", { profile_id: pickup.collector_id });
        }
      }

      return new Response(JSON.stringify({ pickup: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /pickup/:id/assign — assign collector
    if (req.method === "POST" && path.includes("/assign")) {
      const pickupId = path.split("/")[1];
      const { collectorId } = await req.json();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile || (profile.role !== "admin" && profile.role !== "fleet")) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from("pickup_requests")
        .update({
          collector_id: collectorId,
          status: "collector_assigned",
          collector_assigned_at: now,
          updated_at: now,
        })
        .eq("id", pickupId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({ pickup: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[pickup] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
