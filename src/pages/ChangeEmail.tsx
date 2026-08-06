/**
 * Tydigo Change Email Page
 *
 * Step 1: Verify password
 * Step 2: Enter new email + verify
 * Step 3: Success
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, Shield, CheckCircle2, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { logSecurityEvent } from "@/services/security";

type Step = "verify-password" | "enter-new" | "verify-new" | "done";

const ChangeEmailPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("verify-password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyPassword = async () => {
    setError("");
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSupabaseAvailable() && supabase) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.email) throw new Error("No email associated with account.");

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authUser.email,
          password,
        });
        if (signInError) throw new Error("Incorrect password.");
      }
      setStep("enter-new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    setError("");
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSupabaseAvailable() && supabase) {
        const { error: updateError } = await supabase.auth.updateUser({
          email: newEmail.trim().toLowerCase(),
        });
        if (updateError) throw updateError;

        // Update profile email
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from("profiles")
            .update({ email: newEmail.trim().toLowerCase(), updated_at: new Date().toISOString() })
            .eq("auth_user_id", authUser.id);

          const { data: profile } = await supabase.from("profiles")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();
          if (profile) {
            await logSecurityEvent(profile.id, authUser.id, "email_change", { new: newEmail.trim().toLowerCase() });
          }
        }
      }

      await refreshUser();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email.");
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
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {step === "done" ? "Email Updated" : "Change Email Address"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {step === "verify-password" && "Verify your password to continue."}
              {step === "enter-new" && "Enter your new email address."}
              {step === "verify-new" && "Check your new email for a confirmation link."}
              {step === "done" && "Your email address has been updated."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {step === "verify-password" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Current Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <KeyRound className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-12 pr-12 h-14 rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleVerifyPassword} disabled={submitting} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Password"}
                </Button>
              </div>
            )}

            {step === "enter-new" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">New Email Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="newemail@example.com"
                      className="pl-12 h-14 rounded-2xl"
                    />
                  </div>
                </div>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                <Button onClick={handleSendVerification} disabled={submitting || !newEmail.trim()} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Update Email"}
                </Button>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-600">Your email has been updated to <strong>{newEmail}</strong>.</p>
                <Button onClick={() => navigate("/household/profile")} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                  Back to Profile
                </Button>
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Secure email update powered by Supabase Auth.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangeEmailPage;
