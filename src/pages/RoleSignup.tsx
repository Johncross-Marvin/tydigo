/**
 * Tydigo Role-Specific Signup Page
 *
 * Dedicated registration flow for a single account type. Renders common
 * identity fields (name, email, phone, city, username, password) plus
 * role-specific fields defined in the signup config registry.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Phone, Mail, MapPin,
  AtSign, Eye, EyeOff, KeyRound, Loader2, AlertCircle, X,
  Home, Building2, BarChart3, Truck, Recycle, Leaf, Globe, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signUp } from "@/services/auth";
import { generateUsername, isUsernameAvailable, isValidUsername } from "@/services/username";
import { getCities, getStateForCity, type City } from "@/services/cities";
import { isEmail, isPhone } from "@/services/identifier";
import { useAuth } from "@/components/auth-provider";
import { getAccountTypeConfig, type SignupField } from "@/lib/signup-config";
import { useSeo } from "@/lib/seo";

const ICONS: Record<string, typeof Home> = {
  Home,
  Building2,
  BarChart3,
  Truck,
  Recycle,
  Leaf,
  Globe,
  Shield,
};

type StrengthLevel = { label: string; color: string; pct: number };

function getPasswordStrength(pw: string): StrengthLevel {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", pct: 25 };
  if (score <= 3) return { label: "Fair", color: "bg-orange-500", pct: 50 };
  if (score <= 4) return { label: "Good", color: "bg-yellow-500", pct: 75 };
  return { label: "Strong", color: "bg-green-500", pct: 100 };
}

const RoleSignupPage = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const config = getAccountTypeConfig((role as UserRole) || "household");
  const Icon = ICONS[config?.icon || "Home"] || Home;

  useSeo({ title: `${config?.title || "Sign Up"} — Tydigo` });

  // Common identity fields
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Role-specific fields
  const [roleFields, setRoleFields] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [authLoading, navigate, user]);

  // Redirect if invalid role
  useEffect(() => {
    if (!config) navigate("/signup", { replace: true });
  }, [config, navigate]);

  // Load cities
  useEffect(() => {
    getCities().then(setCities);
  }, []);

  // Auto-generate username
  useEffect(() => {
    if (!usernameEdited && fullName.trim()) {
      setUsername(generateUsername(fullName));
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

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 20);
    const q = citySearch.toLowerCase();
    return cities.filter(
      (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [cities, citySearch]);

  const roleFieldsValid = useMemo(() => {
    if (!config) return true;
    return config.fields.every((f) => !f.required || (roleFields[f.key] || "").trim());
  }, [config, roleFields]);

  const formValid = useMemo(() => {
    if (!fullName.trim() || fullName.trim().length < 2) return false;
    if (!email.trim() || !isEmail(email)) return false;
    if (phone.trim() && !isPhone(phone)) return false;
    if (!cityName) return false;
    if (!username || !isValidUsername(username) || usernameAvailable === false) return false;
    if (!password || password.length < 8) return false;
    if (password && confirmPassword && password !== confirmPassword) return false;
    if (!agreedToTerms) return false;
    if (!roleFieldsValid) return false;
    return true;
  }, [fullName, email, phone, cityName, username, usernameAvailable, password, confirmPassword, agreedToTerms, roleFieldsValid]);

  const handleCitySelect = useCallback((city: City) => {
    setCityName(city.city);
    setCitySearch("");
    setShowCityDropdown(false);
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    setUsernameEdited(true);
    setUsername(value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30));
  }, []);

  const handleRoleFieldChange = useCallback((key: string, value: string) => {
    setRoleFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!config) return;

    if (!formValid) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        username,
        email: email.trim(),
        phone: phone.trim(),
        password,
        city: cityName,
        state: getStateForCity(cityName, cities),
        role: config.role,
        metadata: roleFields,
      });

      if (!result.needsVerification) {
        navigate(roleHomePath[config.role], { replace: true });
      } else {
        navigate("/check-email", { state: { email: email.trim() } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) return null;

  const renderField = (field: SignupField) => {
    const value = roleFields[field.key] || "";
    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
            {field.label}{field.required ? " *" : ""}
          </label>
          <select
            value={value}
            onChange={(e) => handleRoleFieldChange(field.key, e.target.value)}
            className="w-full h-14 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#145C25] focus:border-transparent"
          >
            <option value="">{field.placeholder}</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
          {field.label}{field.required ? " *" : ""}
        </label>
        <Input
          value={value}
          onChange={(e) => handleRoleFieldChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="h-14 rounded-2xl"
        />
        {field.hint && <p className="text-xs text-neutral-400 mt-1">{field.hint}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> All account types
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">{config.heroTitle}</h1>
            <p className="text-sm text-neutral-500">{config.heroSubtitle}</p>
          </div>
        </div>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-neutral-900">
                Create your {config.title} account
              </h2>

              {/* Full Name */}
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Amina Bello"
                  className="h-14 rounded-2xl"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Email *</label>
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
                  {cityName && (
                    <button
                      type="button"
                      onClick={() => { setCityName(""); setCitySearch(""); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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

              {/* Role-specific fields */}
              {config.fields.map(renderField)}

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
                  {!checkingUsername && usernameAvailable === false && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {username.length >= 3 && usernameAvailable === false && (
                  <p className="text-xs text-red-500 mt-1">This username is already taken.</p>
                )}
              </div>

              {/* Password */}
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
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength.pct >= i * 25 ? passwordStrength.color : "bg-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Strength: <span className="font-semibold">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <KeyRound className="w-5 h-5 text-neutral-400" />
                  </div>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-12 h-14 rounded-2xl"
                  />
                  {confirmPassword && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#145C25] focus:ring-[#145C25]"
                />
                <span className="text-sm text-neutral-600">
                  I agree to the{" "}
                  <Link to="/terms" className="text-[#145C25] font-semibold hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-[#145C25] font-semibold hover:underline">Privacy Policy</Link>
                </span>
              </label>

              {/* Verification notice */}
              {config.requiresVerification && (
                <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>{config.title}</strong> accounts require document verification
                    before full access. You'll be guided through this after signup.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || !formValid}
                className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand disabled:opacity-50"
              >
                {submitting ? "Creating account..." : `Create ${config.title} Account`}
                {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
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

export default RoleSignupPage;
