/**
 * Tydigo Check Email Page
 *
 * Shown after signup. Tells user to verify their email.
 * Provides resend, change email, and back-to-login options.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resendVerification } from "@/services/auth";

const CheckEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as { email?: string })?.email || "";
  const [email, setEmail] = useState(emailFromState);
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setSending(true);
    setError("");
    try {
      await resendVerification(email);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[#145C25]" />
            </div>
            <CardTitle className="text-2xl font-extrabold">Check Your Email</CardTitle>
            <CardDescription className="text-neutral-500">
              We sent a verification link to{email ? <><br /><span className="font-semibold text-neutral-700">{email}</span></> : " your email address"}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {resent && (
              <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Verification email resent! Check your inbox.
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-neutral-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-neutral-600">
                Click the link in the email to verify your account. If you don't see it, check your spam folder.
              </p>

              {!emailFromState && (
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Your email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-14 rounded-2xl"
                  />
                </div>
              )}

              <Button
                onClick={handleResend}
                disabled={sending}
                variant="outline"
                className="w-full rounded-xl font-semibold"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Resend Verification Email
              </Button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-neutral-500">
                Already verified?{" "}
                <Link to="/login" className="text-[#145C25] font-semibold hover:underline">Sign in</Link>
              </p>
              <p className="text-xs text-neutral-400">
                Wrong email?{" "}
                <Link to="/signup" className="text-[#145C25] hover:underline">Create a new account</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckEmailPage;
