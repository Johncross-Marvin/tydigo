import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the service role key for sensitive mutations. The caller's identity
    // is still verified below via the user-scoped client.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await req.json()).action;

    switch (action) {
      case "init": return await initOnboarding(serviceClient, user, await req.json());
      case "complete-step": return await completeStep(serviceClient, user, await req.json());
      case "grant-reward": return await grantReward(serviceClient, user, await req.json());
      case "get-progress": return await getProgress(serviceClient, user);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[onboarding] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function initOnboarding(
  client: ReturnType<typeof createClient>,
  user: { id: string },
  body: { role: string },
) {
  const { data: profile } = await client.from("profiles")
    .select("id").eq("auth_user_id", user.id).maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const role = body.role || "household";

  // Get journey
  const { data: journey } = await client.from("onboarding_journeys")
    .select("id, title").eq("role", role).eq("is_active", true).maybeSingle();

  if (!journey) {
    return new Response(JSON.stringify({ error: "No journey found for role" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get steps
  const { data: steps } = await client.from("onboarding_steps")
    .select("*").eq("journey_id", journey.id).order("sort_order");

  // Get existing progress
  const { data: progress } = await client.from("user_onboarding_progress")
    .select("*").eq("profile_id", profile.id).eq("journey_id", journey.id);

  const progressMap = new Map((progress || []).map((p: Record<string, unknown>) => [p.step_id, p]));

  // Initialize missing progress entries
  const now = new Date().toISOString();
  for (const step of (steps || [])) {
    if (!progressMap.has(step.id)) {
      await client.from("user_onboarding_progress").insert({
        profile_id: profile.id,
        journey_id: journey.id,
        step_id: step.id,
        completed: false,
        skipped: false,
        created_at: now,
      });
    }
  }

  // Return journey with progress
  const { data: updatedProgress } = await client.from("user_onboarding_progress")
    .select("*, onboarding_steps(*)")
    .eq("profile_id", profile.id)
    .eq("journey_id", journey.id)
    .order("created_at");

  const completedCount = (updatedProgress || []).filter((p: Record<string, unknown>) => p.completed).length;
  const totalSteps = (steps || []).length;
  const totalMinutes = (steps || []).reduce((sum: number, s: Record<string, unknown>) => sum + ((s.estimated_minutes as number) || 2), 0);

  return new Response(JSON.stringify({
    journey,
    steps,
    progress: updatedProgress,
    completionPct: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
    completedCount,
    totalSteps,
    estimatedMinutes: totalMinutes,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function completeStep(
  client: ReturnType<typeof createClient>,
  user: { id: string },
  body: { stepId: string; timeSpent?: number },
) {
  const { data: profile } = await client.from("profiles")
    .select("id").eq("auth_user_id", user.id).maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  const { error } = await client.from("user_onboarding_progress")
    .update({
      completed: true,
      completed_at: now,
      time_spent: body.timeSpent || 0,
    })
    .eq("profile_id", profile.id)
    .eq("step_id", body.stepId);

  if (error) {
    return new Response(JSON.stringify({ error: "Failed to update progress" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, completedAt: now }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function grantReward(
  client: ReturnType<typeof createClient>,
  user: { id: string },
  body: { points: number; reason: string },
) {
  const { data: profile } = await client.from("profiles")
    .select("id").eq("auth_user_id", user.id).maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use the atomic award_ecopoints RPC for wallet tracking, idempotency,
  // and balance reconciliation. Never insert directly into ecopoint_transactions.
  const idempotencyKey = `onboarding_${profile.id}_${body.reason}`;
  const { data: txnId, error } = await client.rpc("award_ecopoints", {
    p_profile_id: profile.id,
    p_points: body.points,
    p_transaction_type: "earn",
    p_source_type: "onboarding",
    p_idempotency_key: idempotencyKey,
    p_description: body.reason,
    p_status: "confirmed",
  });

  if (error) {
    console.error("[onboarding] award_ecopoints RPC error:", error);
    return new Response(JSON.stringify({ error: "Failed to award EcoPoints" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, pointsAwarded: body.points, transactionId: txnId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getProgress(
  client: ReturnType<typeof createClient>,
  user: { id: string },
) {
  const { data: profile } = await client.from("profiles")
    .select("id, role").eq("auth_user_id", user.id).maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: journey } = await client.from("onboarding_journeys")
    .select("id").eq("role", profile.role).eq("is_active", true).maybeSingle();

  if (!journey) {
    return new Response(JSON.stringify({ completed: true, completionPct: 100 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: steps } = await client.from("onboarding_steps")
    .select("id").eq("journey_id", journey.id);

  const { data: progress } = await client.from("user_onboarding_progress")
    .select("completed").eq("profile_id", profile.id).eq("journey_id", journey.id);

  const total = (steps || []).length;
  const completed = (progress || []).filter((p: Record<string, unknown>) => p.completed).length;

  return new Response(JSON.stringify({
    completed: completed >= total,
    completionPct: total > 0 ? Math.round((completed / total) * 100) : 100,
    completedCount: completed,
    totalSteps: total,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
