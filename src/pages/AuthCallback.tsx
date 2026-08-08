/**
 * Tydigo Auth Callback Page
 *
 * Handles email verification, password reset, and other
 * Supabase auth redirects. Establishes session and redirects.
 *
 * IMPORTANT: Supabase auth.users.email_confirmed_at is the canonical
 * email-verification truth. We do NOT independently set
 * profiles.email_verified from the client.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/api";

type CallbackState = "processing" | "success" | "error";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [message, setMessage] = useState("Completing verification...");

  useEffect(() => {
    if (!isSupabaseAvailable() || !supabase) {
      setState("error");
      setMessage("Authentication service unavailable.");
      return;
    }

    const handleCallback = async () => {
      try {
        // Supabase handles the token exchange automatically via the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        const user = data.session?.user;
        if (!user) {
          // Check if we have a user even without session (email confirmed but no session)
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            setState("success");
            setMessage("Email verified successfully!");

            // Log security event
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("auth_user_id", userData.user.id)
              .maybeSingle();

            if (profile) {
              await supabase.from("security_events").insert({
                profile_id: profile.id,
                event_type: "auth",
                action: "email_verified",
              });
            }

            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 2000);
            return;
          }

          setState("error");
          setMessage("Could not verify your session. Please try signing in.");
          return;
        }

        setState("success");
        setMessage("Email verified successfully!");

        // Log security event
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profile) {
          await supabase.from("security_events").insert({
            profile_id: profile.id,
            event_type: "auth",
            action: "email_verified",
          });
        }

        // Redirect to appropriate dashboard
        setTimeout(() => {
          const role = (profile?.role as UserRole) || "customer";
          navigate(roleHomePath[role], { replace: true });
        }, 2000);
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setState("error");
        setMessage("Verification failed. The link may have expired. Please try signing in to resend.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {state === "processing" && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-[#145C25] animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">Verifying...</h2>
            <p className="text-neutral-500">{message}</p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[#145C25]" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">Verified!</h2>
            <p className="text-neutral-500">{message}</p>
            <p className="text-sm text-neutral-400">Redirecting you now...</p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900">Verification Failed</h2>
            <p className="text-neutral-500">{message}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="inline-flex items-center justify-center h-14 px-8 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
