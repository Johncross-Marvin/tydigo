/**
 * Tydigo Forgot Password Page
 *
 * Allows users to request a password reset via email or phone.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, Phone, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { detectIdentifier } from "@/services/identifier";
import { normalizeNigerianPhone } from "@/utils/phone";

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const detected = detectIdentifier(identifier);

      if (!isSupabaseAvailable() || !supabase) {
        // Mock mode
        setSent(true);
        setChannel("email");
        return;
      }

      if (detected.type === "email") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          detected.normalized,
          { redirectTo: `${window.location.origin}/reset-password` }
        );
        if (resetError) throw resetError;
        setChannel("email");
      } else if (detected.type === "phone") {
        const normalizedPhone = normalizeNigerianPhone(identifier);
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: { shouldCreateUser: false, channel: "sms" },
        });
        if (otpError) throw otpError;
        setChannel("sms");
      } else {
        setError("Please enter a valid email address or phone number.");
        setSubmitting(false);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset instructions. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {sent ? "Check your inbox" : "Reset your password"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {sent
                ? channel === "email"
                  ? "We've sent a password reset link to your email. Click the link to create a new password."
                  : "We've sent a verification code to your phone. Use it to reset your password."
                : "Enter your email or phone number and we'll send you reset instructions."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">
                    Email or phone number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                      placeholder="john@email.com or 08012345678"
                      className="pl-12 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Reset Instructions"}
                  {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-600">
                  {channel === "email"
                    ? "Check your email and click the reset link. If you don't see it, check your spam folder."
                    : "Enter the verification code sent to your phone to continue."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSent(false); setError(""); }}
                  className="rounded-xl"
                >
                  Try a different method
                </Button>
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Secure password reset powered by Supabase Auth.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
