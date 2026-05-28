import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Shield, RefreshCw, CheckCircle2 } from "lucide-react";

const OtpPage = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0 && !verified) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer, verified]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newOtp.every((d) => d !== "") && !verified) {
      setVerified(true);
      setTimeout(() => navigate("/role-selection"), 1500);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setTimer(45);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {verified ? "Verified!" : "Enter OTP Code"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {verified
                ? "Your phone number has been verified."
                : `We sent a 6-digit code to +234 800 000 0000`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {!verified ? (
              <>
                {/* OTP Inputs */}
                <div className="flex justify-center gap-3">
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-14 h-16 text-center text-2xl font-extrabold rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] focus:ring-2 focus:ring-green-100"
                    />
                  ))}
                </div>

                {/* Timer & Resend */}
                <div className="text-center space-y-2">
                  {timer > 0 ? (
                    <p className="text-sm text-neutral-500">
                      Resend code in{" "}
                      <span className="font-bold text-[#145C25]">
                        00:{timer.toString().padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleResend}
                      className="text-[#145C25] hover:text-[#0F4A1E] font-semibold"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Code
                    </Button>
                  )}
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center gap-1">
                  {otp.map((d, i) => (
                    <div
                      key={i}
                      className={`w-8 h-1 rounded-full transition-colors ${
                        d ? "bg-[#145C25]" : "bg-neutral-200"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                </div>
                <p className="text-neutral-500">
                  Redirecting to role selection...
                </p>
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Your verification code is encrypted end-to-end
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtpPage;
