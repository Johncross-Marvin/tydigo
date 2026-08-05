import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Phone, Recycle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signInWithPhone } from "@/services/auth";
import { useAuth } from "@/components/auth-provider";
import { normalizeNigerianPhone, isValidNigerianPhone } from "@/utils/phone";
import { IMAGE_IDS, gdUrl } from "@/lib/images";

const signupRoles: Array<{ value: UserRole; label: string }> = [
  { value: "customer", label: "Home / Household" },
  { value: "business", label: "Estate / Business" },
  { value: "collector", label: "Collector" },
  { value: "partner", label: "Recycler / Partner" },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [loading, navigate, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    // Validate name for signup
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    // Validate phone
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!isValidNigerianPhone(phone)) {
      setError("Please enter a valid Nigerian phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const normalizedPhone = normalizeNigerianPhone(phone);

      const response = await signInWithPhone(
        normalizedPhone,
        mode === "signup" ? { name: name.trim(), role } : undefined,
      );

      const pendingAuth = {
        ...response,
        phone: normalizedPhone,
        mode,
        name: mode === "signup" ? name.trim() : undefined,
        role: mode === "signup" ? role : undefined,
      };
      sessionStorage.setItem("tydigo_pending_auth", JSON.stringify(pendingAuth));
      navigate("/otp", { state: pendingAuth });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to send verification code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col items-center">
          <div className="w-72 rounded-[2.5rem] overflow-hidden shadow-brand-lg border-4 border-neutral-300">
            <img src={gdUrl(IMAGE_IDS.login)} alt="Tydigo secure sign in" className="w-full h-auto" />
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Recycle className="w-6 h-6 text-[#145C25]" />
              <span className="text-xl font-bold text-[#145C25]">
                Ty<span className="text-amber-500">digo</span>
              </span>
            </div>
            <p className="text-sm text-neutral-500">Cleaner homes. Smarter cities.</p>
          </div>
        </div>

        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <Card className="border-0 shadow-brand-lg rounded-3xl">
            <CardHeader className="space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
                <Phone className="w-6 h-6 text-[#145C25]" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-neutral-900">
                {mode === "signin" ? "Sign in to Tydigo" : "Create your Tydigo account"}
              </CardTitle>
              <CardDescription className="text-neutral-500">
                {mode === "signin"
                  ? "Enter your phone number to sign in securely."
                  : "Your profile, pickups, EcoPoints, and payment history are stored securely."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${mode === "signin" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${mode === "signup" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500"}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Full Name</label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Amina Bello"
                      className="h-14 rounded-2xl"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-600">Phone</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="pl-24 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-lg"
                      required
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Nigerian number, e.g. 0800 000 0000 or +234 800 000 0000
                  </p>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Account Type</label>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as UserRole)}
                      className="h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 font-semibold text-neutral-700 focus:border-[#145C25] focus:outline-none"
                    >
                      {signupRoles.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                  {submitting ? "Sending verification code..." : "Continue Securely"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <Shield className="w-4 h-4" />
                  Your session is stored securely with Supabase Auth.
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400">Phone OTP • End-to-end encrypted</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Secure
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Persistent profiles
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
