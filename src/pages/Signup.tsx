/**
 * Tydigo Multi-Step Signup Page
 *
 * Step 1: Full Name + Contact (email/phone) + City + Username
 * Step 2: Select Account Type (9 role cards)
 * Step 3: Verification (OTP or email confirmation)
 *
 * Mobile-first, accessible, with progress indicator and inline validation.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Phone, Mail, User,
  Shield, MapPin, AtSign, Building2, Home, Truck, Recycle,
  Leaf, BarChart3, Globe, Eye, EyeOff, KeyRound, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signUp, signInWithPhone } from "@/services/auth";
import { generateUsername, isUsernameAvailable, isValidUsername } from "@/services/username";
import { getCities, getStateForCity, type City } from "@/services/cities";
import { isEmail, isPhone } from "@/services/identifier";
import { useAuth } from "@/components/auth-provider";
import { normalizeNigerianPhone } from "@/utils/phone";

// ─── Constants ────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Your Details", "Account Type", "Verify"];

const ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
  desc: string;
  icon: typeof Home;
  color: string;
}> = [
  { value: "household", label: "Household", desc: "Schedule waste pickups at home", icon: Home, color: "bg-green-100 text-[#145C25] border-green-300" },
  { value: "estate", label: "Estate", desc: "Manage waste for your estate", icon: Building2, color: "bg-teal-100 text-teal-600 border-teal-300" },
  { value: "business", label: "Business", desc: "Bulk waste management & reports", icon: BarChart3, color: "bg-purple-100 text-purple-600 border-purple-300" },
  { value: "collector", label: "Collector", desc: "Accept jobs & earn", icon: Truck, color: "bg-blue-100 text-blue-600 border-blue-300" },
  { value: "recycler", label: "Recycler", desc: "Source recyclable materials", icon: Recycle, color: "bg-amber-100 text-amber-600 border-amber-300" },
  { value: "organic_partner", label: "Organic Partner", desc: "BSF farms & compost", icon: Leaf, color: "bg-lime-100 text-lime-600 border-lime-300" },
  { value: "fleet", label: "Fleet Operator", desc: "Manage collection vehicles", icon: Truck, color: "bg-indigo-100 text-indigo-600 border-indigo-300" },
  { value: "corporate", label: "Corporate", desc: "Sustainability partnerships", icon: Globe, color: "bg-rose-100 text-rose-600 border-rose-300" },
  { value: "government", label: "Government", desc: "Agency oversight & reports", icon: Shield, color: "bg-slate-100 text-slate-600 border-slate-300" },
];

// ─── Component ────────────────────────────────────────────────

const SignupPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Step state
  const [step, setStep] = useState(0);

  // Step 1: Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityName, setCityName] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Role
  const [role, setRole] = useState<UserRole>("household");

  // Shared
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [authLoading, navigate, user]);

  // Load cities
  useEffect(() => {
    getCities().then(setCities);
  }, []);

  // Auto-generate username from full name
  useEffect(() => {
    if (!usernameEdited && fullName.trim()) {
      const generated = generateUsername(fullName);
      setUsername(generated);
    }
  }, [fullName, usernameEdited]);

  // Check username availability (debounced)
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const available = await isUsernameAvailable(username);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Filtered cities for dropdown
  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 20);
    const q = citySearch.toLowerCase();
    return cities.filter(
      (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [cities, citySearch]);

  // ── Validation ──────────────────────────────────────────

  const step1Valid = useMemo(() => {
    if (!fullName.trim() || fullName.trim().length < 2) return false;
    if (!email.trim() && !phone.trim()) return false;
    if (email.trim() && !isEmail(email)) return false;
    if (phone.trim() && !isPhone(phone)) return false;
    if (!cityName) return false;
    if (!username || !isValidUsername(username) || usernameAvailable === false) return false;
    if (email.trim() && !password.trim()) return false;
    if (password && password.length < 8) return false;
    return true;
  }, [fullName, email, phone, cityName, username, usernameAvailable, password]);

  // ── Handlers ────────────────────────────────────────────

  const handleCitySelect = useCallback((city: City) => {
    setCityName(city.city);
    setCitySearch("");
    setShowCityDropdown(false);
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    setUsernameEdited(true);
    setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30));
  }, []);

  const handleNext = useCallback(() => {
    setError("");
    if (step === 0 && !step1Valid) {
      if (!fullName.trim()) setError("Please enter your full name.");
      else if (!email.trim() && !phone.trim()) setError("Please provide an email or phone number.");
      else if (email.trim() && !isEmail(email)) setError("Please enter a valid email address.");
      else if (!cityName) setError("Please select your city.");
      else if (!username || !isValidUsername(username)) setError("Username must be 3-30 lowercase letters/numbers.");
      else if (usernameAvailable === false) setError("This username is already taken.");
      else if (email.trim() && !password.trim()) setError("Please create a password.");
      else if (password && password.length < 8) setError("Password must be at least 8 characters.");
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  }, [step, step1Valid, fullName, email, phone, cityName, username, usernameAvailable, password]);

  const handleBack = useCallback(() => {
    setError("");
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const hasEmail = email.trim() && isEmail(email);
      const hasPhone = phone.trim() && isPhone(phone);

      if (hasPhone && !hasEmail) {
        // Phone-only signup → OTP flow
        const normalizedPhone = normalizeNigerianPhone(phone);
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
          city: cityName,
          username,
        };
        sessionStorage.setItem("tydigo_pending_auth", JSON.stringify(pendingAuth));
        navigate("/otp", { state: pendingAuth });
      } else if (hasEmail) {
        // Email signup
        await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: hasPhone ? phone.trim() : undefined,
          password,
          city: cityName,
          state: getStateForCity(cityName, cities),
          role,
        });
        navigate("/role-selection");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-[#145C25] text-white" :
                  i === step ? "bg-[#145C25] text-white ring-4 ring-green-100" :
                  "bg-neutral-200 text-neutral-500"
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${
                  i <= step ? "text-[#145C25]" : "text-neutral-400"
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progressPct} className="h-2 rounded-full bg-neutral-200 [&>div]:bg-[#145C25]" />
        </div>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardContent className="p-6">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Create your account</h2>
                <p className="text-sm text-neutral-500">Fill in your details to get started with Tydigo.</p>

                {/* Full Name */}
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Full Name *</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Amina Bello"
                    className="h-14 rounded-2xl"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Email</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="amina@email.com"
                      className="pl-12 h-14 rounded-2xl"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Phone className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      className="pl-12 h-14 rounded-2xl"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">At least one of email or phone is required.</p>
                </div>

                {/* City */}
                <div className="relative">
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">City *</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <MapPin className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      value={citySearch || cityName}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setCityName("");
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      placeholder="Search your city..."
                      className="pl-12 h-14 rounded-2xl"
                    />
                  </div>
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => handleCitySelect(city)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm font-medium text-neutral-700 first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          {city.city}, {city.state}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Username</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <AtSign className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="aminabello"
                      className="pl-12 h-14 rounded-2xl"
                    />
                    {checkingUsername && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                      </div>
                    )}
                    {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  {username.length >= 3 && usernameAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">This username is already taken.</p>
                  )}
                  {username.length >= 3 && usernameAvailable === true && (
                    <p className="text-xs text-green-600 mt-1">Username available!</p>
                  )}
                </div>

                {/* Password (for email signups) */}
                {email.trim() && isEmail(email) && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Password *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <KeyRound className="w-5 h-5 text-neutral-400" />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="pl-12 pr-12 h-14 rounded-2xl"
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
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Select Account Type</h2>
                <p className="text-sm text-neutral-500">Choose how you'll use Tydigo. You can change this later.</p>

                <div className="grid gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        role === opt.value
                          ? `${opt.color} border-2 shadow-brand`
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        role === opt.value ? opt.color.split(" ")[0] + " " + opt.color.split(" ")[1] : "bg-neutral-100 text-neutral-500"
                      }`}>
                        <opt.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-neutral-900">{opt.label}</p>
                        <p className="text-sm text-neutral-500">{opt.desc}</p>
                      </div>
                      {role === opt.value && <CheckCircle2 className="w-5 h-5 text-[#145C25]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-900">Ready to go!</h2>
                <p className="text-sm text-neutral-500">Review your details and create your account.</p>

                <div className="bg-neutral-50 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Name</span>
                    <span className="font-semibold">{fullName}</span>
                  </div>
                  {email && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Email</span>
                      <span className="font-semibold">{email}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Phone</span>
                      <span className="font-semibold">{phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">City</span>
                    <span className="font-semibold">{cityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Username</span>
                    <span className="font-semibold">@{username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Account Type</span>
                    <Badge className="bg-green-100 text-[#145C25]">
                      {ROLE_OPTIONS.find((r) => r.value === role)?.label}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  {phone && !email
                    ? "We'll send a verification code to your phone."
                    : "We'll send a verification email to confirm your account."}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={handleBack} className="rounded-xl" disabled={submitting}>
                  Back
                </Button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={step === 0 && !step1Valid}
                  className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl shadow-brand disabled:opacity-50"
                >
                  {submitting ? "Creating account..." : "Create Account"}
                  {!submitting && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-[#145C25] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
