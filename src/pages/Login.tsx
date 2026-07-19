import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Recycle, Phone, ArrowRight, Shield, CheckCircle2, ArrowLeft } from "lucide-react";
import { IMAGE_IDS, gdUrl } from "@/lib/images";

const LoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setSubmitted(true);
      setTimeout(() => navigate("/otp", { state: { phone } }), 1500);
    }
  };

  const formattedPhone = phone.replace(/(\d{3})(\d{3})(\d{0,4})/, "$1 $2 $3").trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left - App Preview */}
        <div className="hidden lg:flex flex-col items-center">
          <div className="w-72 rounded-[2.5rem] overflow-hidden shadow-brand-lg border-4 border-neutral-300">
            <img
              src={gdUrl(IMAGE_IDS.login)}
              alt="WastiGo Login"
              className="w-full h-auto"
            />
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Recycle className="w-6 h-6 text-[#145C25]" />
              <span className="text-xl font-bold text-[#145C25]">
                Wasti<span className="text-amber-500">Go</span>
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              Smart Waste Management Platform
            </p>
          </div>
        </div>

        {/* Right - Login Form */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <Card className="border-0 shadow-brand-lg rounded-3xl">
            <CardHeader className="space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
                <Phone className="w-6 h-6 text-[#145C25]" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-neutral-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-neutral-500">
                Enter your phone number to sign in or create an account.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-600">
                          🇳🇬 +234
                        </span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="800 000 0000"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        className="pl-20 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-lg"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={phone.length < 10}
                    className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
                  >
                    Send Verification Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <Shield className="w-4 h-4" />
                    Your phone number is secure and will never be shared.
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900">
                    Code Sent!
                  </p>
                  <p className="text-neutral-500">
                    We sent a 6-digit code to{" "}
                    <strong>+234 {formattedPhone}</strong>
                  </p>
                  <p className="text-xs text-neutral-400">
                    Redirecting to verification...
                  </p>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400">
                    Trusted by 50,000+ Nigerians
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Secure
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No Password
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
