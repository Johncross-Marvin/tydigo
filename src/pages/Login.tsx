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
import { normalizeNigerianPhone } from "@/utils/phone";
import { IMAGE_IDS, gdUrl } from "@/lib/images";
import { useSeo, seoConfig } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

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
  const [rememberMe, setRememberMe] = useState(true);

  useSeo(seoConfig.login);

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

  // ── OAuth Handlers ──────────────────────────────────────

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setError("");
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/role-selection`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!supabase) return;
    setError("");
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/role-selection`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple sign in failed.");
      setSubmitting(false);
    }
  };

  // ── Submit Handler ──────────────────────────────────────

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
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
          await signUp({
            fullName: fullName.trim(),
            email: identifier.trim(),
            password,
            role,
          });
          navigate("/role-selection");
        }
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to create account. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!identifier.trim()) {
        setError("Please enter your email, phone, or username.");
        return;
      }

      setSubmitting(true);

      try {
        const detected = detectIdentifier(identifier);

        if (detected.type === "phone") {
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

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="h-12 rounded-2xl border-2 border-neutral-200 hover:border-neutral-300 font-semibold text-neutral-700"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAppleSignIn}
                  disabled={submitting}
                  className="h-12 rounded-2xl border-2 border-neutral-200 hover:border-neutral-300 font-semibold text-neutral-700"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Apple
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400">or continue with email</span>
                </div>
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

                {/* Password */}
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

                {/* Remember Me + Forgot Password (signin only) */}
                {mode === "signin" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 text-[#145C25] focus:ring-[#145C25]"
                      />
                      <span className="text-sm text-neutral-600">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-sm font-semibold text-[#145C25] hover:underline">
                      Forgot password?
                    </Link>
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
