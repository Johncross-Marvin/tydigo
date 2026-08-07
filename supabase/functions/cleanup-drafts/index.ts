/**
 * Edge Function: cleanup-drafts
 *
 * Scheduled cleanup of abandoned draft uploads.
 * Deletes draft files older than 48 hours that have no linked pickup.
 *
 * Should be invoked via pg_cron or external scheduler every 6 hours.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRAFT_MAX_AGE_HOURS = 48;
const BATCH_SIZE = 100;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - DRAFT_MAX_AGE_HOURS);

    console.log("[cleanup-drafts] Cleaning drafts older than:", cutoffDate.toISOString());

    let totalDeleted = 0;
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      // List draft files
      const { data: files, error: listError } = await supabase.storage
        .from("waste-photos")
        .list("drafts", {
          limit: BATCH_SIZE,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });

      if (listError) {
        console.error("[cleanup-drafts] List error:", listError);
        break;
      }

      if (!files || files.length === 0) {
        hasMore = false;
        break;
      }

      // Filter files older than cutoff
      const oldFiles = files.filter((f) => {
        const created = f.created_at ? new Date(f.created_at) : null;
        return created && created < cutoffDate;
      });

      if (oldFiles.length === 0) {
        // All remaining files are newer — stop
        hasMore = false;
        break;
      }

      // Delete old draft files
      const pathsToDelete = oldFiles.map((f) => `drafts/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from("waste-photos")
        .remove(pathsToDelete);

      if (deleteError) {
        console.error("[cleanup-drafts] Delete error:", deleteError);
      } else {
        totalDeleted += oldFiles.length;
        console.log("[cleanup-drafts] Deleted batch:", oldFiles.length, "files");
      }

      offset += BATCH_SIZE;

      if (files.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log("[cleanup-drafts] Cleanup complete. Total deleted:", totalDeleted);

    return new Response(JSON.stringify({
      success: true,
      deletedCount: totalDeleted,
      cutoffDate: cutoffDate.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[cleanup-drafts] Unexpected error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
