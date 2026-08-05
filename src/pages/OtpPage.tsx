import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { signInWithPhone } from "@/services/auth";
import { roleHomePath } from "@/lib/api";
import { maskPhone } from "@/utils/phone";

type PendingAuth = {
  expiresInSeconds: number;
  mode: "signin" | "signup";
  phone: string;
  name?: string;
  role?: "customer" | "collector" | "business" | "partner" | "admin";
};

const readPendingAuth = (state: unknown): PendingAuth | null => {
  if (state && typeof state === "object" && "phone" in state && "mode" in state) {
    return state as PendingAuth;
  }
  const stored = sessionStorage.getItem("tydigo_pending_auth");
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as PendingAuth;
    if (parsed.phone && parsed.mode) return parsed;
    return null;
  } catch {
    return null;
  }
};

const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifySession } = useAuth();
  const pendingAuth = useMemo(() => readPendingAuth(location.state), [location.state]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(pendingAuth?.expiresInSeconds ?? 600);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!pendingAuth) navigate("/login", { replace: true });
  }, [navigate, pendingAuth]);

  useEffect(() => {
    if (timer > 0 && !verified) {
      const interval = setInterval(() => setTimer((value) => value - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer, verified]);

  const verifyCode = async (digits: string[]) => {
    if (!pendingAuth || digits.some((digit) => !digit) || verifying || verified) return;

    setVerifying(true);
    setError("");

    try {
      const user = await verifySession(
        pendingAuth.phone,
        digits.join(""),
        pendingAuth.name || pendingAuth.role
          ? { name: pendingAuth.name, role: pendingAuth.role }
          : undefined,
      );
      sessionStorage.removeItem("tydigo_pending_auth");
      setVerified(true);
      setTimeout(() => navigate(roleHomePath[user.role], { replace: true }), 900);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "");
    if (digit.length > 1) return;
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (nextOtp.every(Boolean)) void verifyCode(nextOtp);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const nextOtp = Array.from({ length: 6 }, (_, index) => pasted[index] ?? "");
    setOtp(nextOtp);
    inputRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
    if (pasted.length === 6) void verifyCode(nextOtp);
  };

  const handleResend = async () => {
    if (!pendingAuth || resending) return;
    setError("");
    setResending(true);

    try {
      const response = await signInWithPhone(pendingAuth.phone);
      setTimer(response.expiresInSeconds || 600);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const displayPhone = maskPhone(pendingAuth?.phone ?? "");

  if (!pendingAuth) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {verified ? "Verified ✅" : "Verify your phone"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {verified
                ? "Your secure session is ready."
                : `Enter the 6-digit code sent to ${displayPhone}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {!verified ? (
              <>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>A 6-digit verification code was sent via SMS to your phone number.</span>
                </div>

                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleChange(index, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      onPaste={handlePaste}
                      aria-label={`OTP digit ${index + 1}`}
                      className="w-14 h-16 text-center text-2xl font-extrabold rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] focus:ring-2 focus:ring-green-100"
                    />
                  ))}
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-center space-y-2">
                  {timer > 0 ? (
                    <p className="text-sm text-neutral-500">
                      Code expires in{" "}
                      <span className="font-bold text-[#145C25]">
                        {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-[#145C25] hover:text-[#0F4A1E] font-semibold"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                      {resending ? "Resending..." : "Resend Code"}
                    </Button>
                  )}
                </div>

                <Button
                  onClick={() => void verifyCode(otp)}
                  disabled={otp.some((digit) => !digit) || verifying}
                  className="w-full h-12 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Verify and Continue"}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-500">Redirecting to your workspace...</p>
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              OTP verification powered by Supabase Auth.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtpPage;
