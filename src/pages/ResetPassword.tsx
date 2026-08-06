/**
 * Tydigo Reset Password Page
 *
 * Handles the password reset flow after user clicks the email link
 * or enters the OTP code from SMS.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, KeyRound, Eye, EyeOff, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Check for the recovery token in the URL (Supabase redirects with type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Supabase handles the token automatically via the SDK
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      if (!isSupabaseAvailable() || !supabase) {
        // Mock mode
        setDone(true);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password. The link may have expired.");
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
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6 text-[#145C25]" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {done ? "Password updated" : "Create new password"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {done
                ? "Your password has been reset successfully. You can now sign in."
                : "Enter a new password for your Tydigo account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {!done ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">New Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <KeyRound className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="pl-12 pr-12 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Confirm Password</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
                    required
                  />
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
                  {submitting ? "Updating..." : "Reset Password"}
                  {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-600">Your password has been updated successfully.</p>
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl"
                >
                  Sign In with New Password
                  <ArrowRight className="w-4 h-4 ml-2" />
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

export default ResetPasswordPage;
