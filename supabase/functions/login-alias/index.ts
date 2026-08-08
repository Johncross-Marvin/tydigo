/**
 * Tydigo login-alias Edge Function
 *
 * Securely resolves username/phone login aliases to canonical email
 * and authenticates against Supabase Auth.
 *
 * Security:
 * - Rate limited (5 attempts per 15 min per IP)
 * - Generic error messages (no user enumeration)
 * - Never logs passwords
 * - Never exposes canonical email
 * - Uses service_role for privileged profile lookup
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 5 attempts per 15 minutes per IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit check
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  if (!checkRateLimit(clientIp)) {
    console.log("[login-alias] Rate limit exceeded for IP:", clientIp);
    return new Response(
      JSON.stringify({ error: "Invalid login details." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: "Invalid login details." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = String(identifier).trim();

    // Create service-role client for privileged profile lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let canonicalEmail: string | null = null;

    // Email pattern — use directly
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      canonicalEmail = trimmed.toLowerCase();
    } else {
      // Phone pattern (digits only, 10+ digits)
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length >= 10) {
        // Normalize to E.164
        let phoneE164 = digits;
        if (digits.startsWith("00")) phoneE164 = "+" + digits.slice(2);
        else if (digits.startsWith("234")) phoneE164 = "+" + digits;
        else if (digits.startsWith("0")) phoneE164 = "+234" + digits.slice(1);
        else if (digits.length >= 11) phoneE164 = "+" + digits;
        else phoneE164 = "+234" + digits;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (profile?.email) {
          canonicalEmail = profile.email as string;
        }
      }

      // Username lookup (if not found by phone)
      if (!canonicalEmail) {
        const username = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("username", username)
          .maybeSingle();

        if (profile?.email) {
          canonicalEmail = profile.email as string;
        }
      }
    }

    // Generic error — never reveal whether account exists
    if (!canonicalEmail) {
      console.log("[login-alias] No account found for identifier (generic response)");
      return new Response(
        JSON.stringify({ error: "Invalid login details." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate using the anon client (not service_role)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: canonicalEmail,
      password,
    });

    if (error) {
      console.log("[login-alias] Auth failed (generic response)");
      return new Response(
        JSON.stringify({ error: "Invalid login details." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.user?.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "Please verify your email before continuing." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the Supabase session
    console.log("[login-alias] Login successful");
    return new Response(
      JSON.stringify({
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[login-alias] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid login details." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
