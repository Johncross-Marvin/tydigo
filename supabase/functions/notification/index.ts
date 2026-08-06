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

    const url = new URL(req.url);
    const path = url.pathname.replace("/notification", "");

    // GET /notification — list notifications
    if (req.method === "GET" && !path.includes("/")) {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const unreadOnly = url.searchParams.get("unread") === "true";

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq("read", false);
      }

      const { data: notifications, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ notifications }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /notification/unread-count
    if (req.method === "GET" && path === "/unread-count") {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", profile.id)
        .eq("read", false);

      if (error) throw error;

      return new Response(JSON.stringify({ count: count || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /notification/:id/read — mark as read
    if (req.method === "POST" && path.includes("/read")) {
      const notificationId = path.split("/")[1];

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("recipient_id", profile.id);

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /notification/read-all — mark all as read
    if (req.method === "POST" && path === "/read-all") {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", profile.id)
        .eq("read", false);

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /notification/broadcast — admin broadcast
    if (req.method === "POST" && path === "/broadcast") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { title, body, targetRoles, targetUserIds } = await req.json();

      if (targetUserIds?.length) {
        const notifications = targetUserIds.map((recipientId: string) => ({
          recipient_id: recipientId,
          type: "system",
          title,
          body,
          data: {},
          read: false,
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;
      } else if (targetRoles?.length) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .in("role", targetRoles);

        if (users?.length) {
          const notifications = users.map((u: { id: string }) => ({
            recipient_id: u.id,
            type: "system",
            title,
            body,
            data: {},
            read: false,
            created_at: new Date().toISOString(),
          }));

          const { error } = await supabase.from("notifications").insert(notifications);
          if (error) throw error;
        }
      }

      return new Response(JSON.stringify({ ok: true, sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notification] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
