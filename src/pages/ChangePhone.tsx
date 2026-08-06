/**
 * Tydigo Change Phone Page
 *
 * Step 1: Verify current phone with OTP
 * Step 2: Enter new phone + verify with OTP
 * Step 3: Success
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Phone, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { normalizeNigerianPhone } from "@/utils/phone";
import { logSecurityEvent } from "@/services/security";

type Step = "verify-old" | "verify-otp" | "enter-new" | "verify-new-otp" | "done";

const ChangePhonePage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("verify-old");
  const [oldPhone, setOldPhone] = useState(user?.phone || "");
  const [oldOtp, setOldOtp] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSendOldOtp = async () => {
    setError("");
    if (!oldPhone.trim()) {
      setError("Please enter your current phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const normalized = normalizeNigerianPhone(oldPhone);
      if (isSupabaseAvailable() && supabase) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalized,
          options: { shouldCreateUser: false, channel: "sms" },
        });
        if (otpError) throw otpError;
      }
      setStep("verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOldOtp = async () => {
    setError("");
    if (!oldOtp.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSupabaseAvailable() && supabase) {
        const normalized = normalizeNigerianPhone(oldPhone);
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: normalized,
          token: oldOtp,
          type: "sms",
        });
        if (verifyError) throw verifyError;
      }
      setStep("enter-new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNewOtp = async () => {
    setError("");
    if (!newPhone.trim()) {
      setError("Please enter your new phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const normalized = normalizeNigerianPhone(newPhone);
      if (isSupabaseAvailable() && supabase) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: normalized,
          options: { shouldCreateUser: false, channel: "sms" },
        });
        if (otpError) throw otpError;
      }
      setStep("verify-new-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyNewOtp = async () => {
    setError("");
    if (!newOtp.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setSubmitting(true);
    try {
      const normalized = normalizeNigerianPhone(newPhone);
      if (isSupabaseAvailable() && supabase) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: normalized,
          token: newOtp,
          type: "sms",
        });
        if (verifyError) throw verifyError;

        // Update phone in auth
        const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
        if (updateError) throw updateError;

        // Update phone in profiles
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from("profiles")
            .update({ phone: normalized, phone_verified: true, updated_at: new Date().toISOString() })
            .eq("auth_user_id", authUser.id);

          // Log security event
          const { data: profile } = await supabase.from("profiles")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();
          if (profile) {
            await logSecurityEvent(profile.id, authUser.id, "phone_change", { old: oldPhone, new: normalized });
          }
        }
      }

      await refreshUser();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update phone number.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/household/profile" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {step === "done" ? "Phone Updated" : "Change Phone Number"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {step === "verify-old" && "First, verify your current phone number."}
              {step === "verify-otp" && "Enter the code sent to your current phone."}
              {step === "enter-new" && "Enter your new phone number."}
              {step === "verify-new-otp" && "Enter the code sent to your new phone."}
              {step === "done" && "Your phone number has been updated."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {step === "verify-old" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Current Phone Number</label>
                  <Input
                    value={oldPhone}
                    onChange={(e) => setOldPhone(e.target.value)}
                    placeholder="08012345678"
                    className="h-14 rounded-2xl"
                  />
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleSendOldOtp} disabled={submitting} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Verification Code"}
                </Button>
              </div>
            )}

            {step === "verify-otp" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Verification Code</label>
                  <Input
                    value={oldOtp}
                    onChange={(e) => setOldOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="h-14 rounded-2xl text-center text-2xl tracking-widest"
                  />
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleVerifyOldOtp} disabled={submitting || oldOtp.length < 6} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify"}
                </Button>
              </div>
            )}

            {step === "enter-new" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">New Phone Number</label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="08098765432"
                    className="h-14 rounded-2xl"
                  />
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleSendNewOtp} disabled={submitting || !newPhone.trim()} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Verification Code"}
                </Button>
              </div>
            )}

            {step === "verify-new-otp" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Verification Code</label>
                  <Input
                    value={newOtp}
                    onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="h-14 rounded-2xl text-center text-2xl tracking-widest"
                  />
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleVerifyNewOtp} disabled={submitting || newOtp.length < 6} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Update Phone Number"}
                </Button>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-600">Your phone number has been updated to <strong>{newPhone}</strong>.</p>
                <Button onClick={() => navigate("/household/profile")} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                  Back to Profile
                </Button>
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Secure phone update powered by Supabase Auth.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangePhonePage;
