import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Phone, Mail, User,
  Shield, Eye, EyeOff, Recycle, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signIn, signUp, signInWithPhone } from "@/services/auth";
import { detectIdentifier, isEmail, isPhone } from "@/services/identifier";
import { useAuth } from "@/components/auth-provider";
import { normalizeNigerianPhone, isValidNigerianPhone } from "@/utils/phone";
import { IMAGE_IDS, gdUrl } from "@/lib/images";

// ─── Role Options ─────────────────────────────────────────────

const SIGNUP_ROLES: Array<{ value: UserRole; label: string; desc: string }> = [
  { value: "household", label: "Household", desc: "Schedule waste pickups at home" },
  { value: "estate", label: "Estate", desc: "Manage waste for your estate" },
  { value: "business", label: "Business", desc: "Bulk waste management & reports" },
  { value: "collector", label: "Collector", desc: "Accept jobs & earn" },
  { value: "recycler", label: "Recycler", desc: "Source recyclable materials" },
  { value: "organic_partner", label: "Organic Partner", desc: "BSF farms & compost" },
  { value: "fleet", label: "Fleet Operator", desc: "Manage collection vehicles" },
  { value: "corporate", label: "Corporate", desc: "Sustainability partnerships" },
  { value: "government", label: "Government", desc: "Agency oversight & reports" },
];

// ─── Component ────────────────────────────────────────────────

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("household");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone" | "username" | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [loading, navigate, user]);

  // Detect identifier type on change
  const handleIdentifierChange = useCallback((value: string) => {
    setIdentifier(value);
    setError("");
    if (value.trim()) {
      const detected = detectIdentifier(value);
      setIdentifierType(detected.type);
    } else {
      setIdentifierType(null);
    }
  }, []);

  // ── Submit Handler ──────────────────────────────────────

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      // Sign up flow
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }

      const hasEmail = identifier.trim() && isEmail(identifier);
      const hasPhone = identifier.trim() && isPhone(identifier);

      if (!hasEmail && !hasPhone) {
        setError("Please enter a valid email address or phone number.");
        return;
      }

      setSubmitting(true);

      try {
        if (hasPhone) {
          // Phone OTP signup
          const normalizedPhone = normalizeNigerianPhone(identifier);
          const response = await signInWithPhone(normalizedPhone, {
            name: fullName.trim(),
            role,
          });

          const pendingAuth = {
            ...response,
            phone: normalizedPhone,
            mode: "signup" as const,
            name: fullName.trim(),
            role,
          };
          sessionStorage.setItem("tydigo_pending_auth", JSON.stringify(pendingAuth));
          navigate("/otp", { state: pendingAuth });
        } else if (hasEmail) {
          // Email + password signup
          await signUp({
            fullName: fullName.trim(),
            email: identifier.trim(),
            password,
            role,
          });

          // After email signup, redirect to role selection or dashboard
          navigate("/role-selection");
        }
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to create account. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Sign in flow
      if (!identifier.trim()) {
        setError("Please enter your email, phone, or username.");
        return;
      }

      setSubmitting(true);

      try {
        const detected = detectIdentifier(identifier);

        if (detected.type === "phone") {
          // Phone OTP sign in
          const normalizedPhone = normalizeNigerianPhone(identifier);
          const response = await signInWithPhone(normalizedPhone);

          const pendingAuth = {
            ...response,
            phone: normalizedPhone,
            mode: "signin" as const,
          };
          sessionStorage.setItem("tydigo_pending_auth", JSON.stringify(pendingAuth));
          navigate("/otp", { state: pendingAuth });
        } else {
          // Email or username + password
          const result = await signIn({ identifier: identifier.trim(), password });
          navigate(roleHomePath[result.user.role], { replace: true });
        }
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Sign in failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ── Identifier Icon ─────────────────────────────────────

  const IdentifierIcon = identifierType === "email"
    ? Mail
    : identifierType === "phone"
      ? Phone
      : User;

  const identifierLabel = mode === "signin"
    ? "Email, phone or username"
    : "Email or phone number";

  const identifierPlaceholder = mode === "signin"
    ? "john@email.com • 08012345678 • johnmarvin"
    : "john@email.com or 08012345678";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Brand Side */}
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

        {/* Form Side */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <Card className="border-0 shadow-brand-lg rounded-3xl">
            <CardHeader className="space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-[#145C25]" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-neutral-900">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-neutral-500">
                {mode === "signin"
                  ? "Sign in with your email, phone, or username."
                  : "Join Tydigo and start managing waste sustainably."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${
                    mode === "signin" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${
                    mode === "signup" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name (signup only) */}
                {mode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Full Name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Amina Bello"
                      className="h-14 rounded-2xl"
                      required
                    />
                  </div>
                )}

                {/* Identifier */}
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">
                    {identifierLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <IdentifierIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      placeholder={identifierPlaceholder}
                      className="pl-12 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
                      required
                    />
                  </div>
                  {identifierType && mode === "signin" && (
                    <p className="text-xs text-neutral-400 mt-1">
                      {identifierType === "email" && "We'll sign you in with your email and password"}
                      {identifierType === "phone" && "We'll send a verification code to this number"}
                      {identifierType === "username" && "We'll sign you in with your username and password"}
                    </p>
                  )}
                </div>

                {/* Password (for email/username sign in, or email signup) */}
                {((mode === "signin" && identifierType !== "phone") || (mode === "signup" && identifierType === "email")) && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <KeyRound className="w-5 h-5 text-neutral-400" />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
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
                )}

                {/* Role Selection (signup only) */}
                {mode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-2 block">Account Type</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 font-semibold text-neutral-700 focus:border-[#145C25] focus:outline-none"
                    >
                      {SIGNUP_ROLES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label} — {item.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
                >
                  {submitting
                    ? "Please wait..."
                    : mode === "signin"
                      ? identifierType === "phone"
                        ? "Send Verification Code"
                        : "Sign In Securely"
                      : "Create Account"}
                  {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>

                {/* Security note */}
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <Shield className="w-4 h-4" />
                  Your session is stored securely with Supabase Auth.
                </div>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400">
                    {mode === "signin" ? "Phone OTP • Password • End-to-end encrypted" : "Secure onboarding"}
                  </span>
                </div>
              </div>

              {/* Trust badges */}
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
