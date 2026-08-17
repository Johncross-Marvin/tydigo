/**
 * Tydigo Role Landing Page
 *
 * Bolt-style dedicated marketing landing page for a single account type.
 * Structure mirrors Bolt's product pages: hero → value props → how it works →
 * requirements → FAQ → registration CTA. Each account type gets its own
 * landing page with distinct copy, then funnels into its dedicated dashboard.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Phone, Mail, MapPin,
  AtSign, Eye, EyeOff, KeyRound, Loader2, AlertCircle, X,
  Home, Building2, BarChart3, Truck, Recycle, Leaf, Globe, Shield,
  Clock, DollarSign, Award, Package, Users, Calendar, FileText,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signUp } from "@/services/auth";
import { generateUsername, isUsernameAvailable, isValidUsername } from "@/services/username";
import { getCities, getStateForCity, type City } from "@/services/cities";
import { isEmail, isPhone } from "@/services/identifier";
import { useAuth } from "@/components/auth-provider";
import { getAccountTypeConfig, type SignupField } from "@/lib/signup-config";
import { useSeo } from "@/lib/seo";

const ICONS: Record<string, typeof Home> = {
  Home, Building2, BarChart3, Truck, Recycle, Leaf, Globe, Shield,
  Clock, DollarSign, Award, Package, Users, Calendar, FileText, MapPin,
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

const RoleLandingPage = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const config = getAccountTypeConfig((role as UserRole) || "household");
  const Icon = ICONS[config?.icon || "Home"] || Home;

  useSeo({ title: `${config?.title || "Sign Up"} — Tydigo` });

  // Registration form state
  const [showForm, setShowForm] = useState(false);
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
  const [roleFields, setRoleFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  useEffect(() => {
    if (!authLoading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!config) navigate("/signup", { replace: true });
  }, [config, navigate]);

  useEffect(() => {
    getCities().then(setCities);
  }, []);

  useEffect(() => {
    if (!usernameEdited && fullName.trim()) setUsername(generateUsername(fullName));
  }, [fullName, usernameEdited]);

  useEffect(() => {
    if (!username || username.length < 3) { setUsernameAvailable(null); return; }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameAvailable(await isUsernameAvailable(username));
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 20);
    const q = citySearch.toLowerCase();
    return cities.filter((c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)).slice(0, 10);
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
    if (!formValid) { setError("Please complete all required fields."); return; }
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
      if (!result.needsVerification) navigate(roleHomePath[config.role], { replace: true });
      else navigate("/check-email", { state: { email: email.trim() } });
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
          <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">{field.label}{field.required ? " *" : ""}</label>
          <select
            value={value}
            onChange={(e) => handleRoleFieldChange(field.key, e.target.value)}
            className="w-full h-14 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#145C25] focus:border-transparent"
          >
            <option value="">{field.placeholder}</option>
            {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">{field.label}{field.required ? " *" : ""}</label>
        <Input value={value} onChange={(e) => handleRoleFieldChange(field.key, e.target.value)} placeholder={field.placeholder} className="h-14 rounded-2xl" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0A2F14] flex items-center justify-center">
              <Recycle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xl font-bold text-neutral-900">Ty<span className="text-[#145C25]">digo</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/signup" className="text-sm text-neutral-500 hover:text-neutral-900 hidden sm:block">All account types</Link>
            <Link to="/login">
              <Button variant="outline" className="rounded-xl">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All account types
          </Link>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className={`w-16 h-16 rounded-2xl ${config.iconBg} flex items-center justify-center mb-6`}>
                <Icon className="w-8 h-8" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight mb-4">
                {config.heroTitle}
              </h1>
              <p className="text-lg text-neutral-600 max-w-lg leading-relaxed mb-8">
                {config.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base px-8 py-6 rounded-2xl shadow-brand"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a href="#how-it-works">
                  <Button variant="outline" className="rounded-2xl px-8 py-6">How it works</Button>
                </a>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white rounded-3xl shadow-brand-lg p-8 border border-neutral-100">
                <div className="space-y-4">
                  {config.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-[#145C25] flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p className="font-semibold text-neutral-800">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-12">
            Why {config.title} with Tydigo?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.valueProps.map((prop) => {
              const PropIcon = ICONS[prop.icon] || CheckCircle2;
              return (
                <Card key={prop.title} className="border-0 shadow-md shadow-neutral-200/40 rounded-2xl">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mb-4`}>
                      <PropIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-2">{prop.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{prop.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config.steps.map((step, i) => (
              <div key={i} className="relative">
                <Card className="border-0 shadow-md shadow-neutral-200/40 rounded-2xl h-full">
                  <CardContent className="p-6 pt-8">
                    <div className="absolute top-0 right-0 text-6xl font-black text-neutral-100">{String(i + 1).padStart(2, "0")}</div>
                    <div className="w-10 h-10 rounded-full bg-[#145C25] text-white flex items-center justify-center font-bold mb-4">
                      {i + 1}
                    </div>
                    <p className="font-bold text-neutral-900">{step}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-8">
            What you need to get started
          </h2>
          <Card className="border-0 shadow-md shadow-neutral-200/40 rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <ul className="space-y-3">
                {config.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#145C25] flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-20 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {config.faqs.map((faq, i) => (
              <Card key={i} className="border-0 shadow-sm rounded-2xl overflow-hidden">
                <button
                  className="w-full text-left p-5 flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-neutral-900">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-neutral-600 text-sm leading-relaxed">{faq.answer}</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Registration CTA ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          {!showForm ? (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4">
                Ready to get started?
              </h2>
              <p className="text-neutral-500 mb-8">
                Create your {config.title} account and start today.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base px-10 py-6 rounded-2xl shadow-brand"
              >
                Create {config.title} Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          ) : (
            <Card className="border-0 shadow-brand-lg rounded-3xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Create your {config.title} account</h2>
                    <p className="text-sm text-neutral-500">Fill in your details to get started.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Full Name *</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amina Bello" className="h-14 rounded-2xl" />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Email *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><Mail className="w-5 h-5 text-neutral-400" /></div>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amina@email.com" className="pl-12 h-14 rounded-2xl" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><Phone className="w-5 h-5 text-neutral-400" /></div>
                      <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="pl-12 h-14 rounded-2xl" />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">City *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><MapPin className="w-5 h-5 text-neutral-400" /></div>
                      <Input
                        value={citySearch || cityName}
                        onChange={(e) => { setCitySearch(e.target.value); setCityName(""); setShowCityDropdown(true); }}
                        onFocus={() => setShowCityDropdown(true)}
                        placeholder="Search your city..."
                        className="pl-12 h-14 rounded-2xl"
                      />
                      {cityName && (
                        <button type="button" onClick={() => { setCityName(""); setCitySearch(""); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredCities.map((city) => (
                          <button key={city.id} type="button" onClick={() => handleCitySelect(city)} className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm font-medium text-neutral-700 first:rounded-t-2xl last:rounded-b-2xl">
                            {city.city}, {city.state}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {config.fields.map(renderField)}

                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Username</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><AtSign className="w-5 h-5 text-neutral-400" /></div>
                      <Input value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="aminabello" className="pl-12 h-14 rounded-2xl" />
                      {checkingUsername && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 text-neutral-400 animate-spin" /></div>}
                      {!checkingUsername && usernameAvailable === true && username.length >= 3 && <div className="absolute right-4 top-1/2 -translate-y-1/2"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>}
                      {!checkingUsername && usernameAvailable === false && <div className="absolute right-4 top-1/2 -translate-y-1/2"><AlertCircle className="w-4 h-4 text-red-500" /></div>}
                    </div>
                    {username.length >= 3 && usernameAvailable === false && <p className="text-xs text-red-500 mt-1">This username is already taken.</p>}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Password *</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><KeyRound className="w-5 h-5 text-neutral-400" /></div>
                      <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className="pl-12 pr-12 h-14 rounded-2xl" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength.pct >= i * 25 ? passwordStrength.color : "bg-neutral-200"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-500">Strength: <span className="font-semibold">{passwordStrength.label}</span></p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2"><KeyRound className="w-5 h-5 text-neutral-400" /></div>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="pl-12 h-14 rounded-2xl" />
                      {confirmPassword && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                        </div>
                      )}
                    </div>
                    {confirmPassword && !passwordsMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#145C25] focus:ring-[#145C25]" />
                    <span className="text-sm text-neutral-600">
                      I agree to the <Link to="/terms" className="text-[#145C25] font-semibold hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-[#145C25] font-semibold hover:underline">Privacy Policy</Link>
                    </span>
                  </label>

                  {config.requiresVerification && (
                    <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p><strong>{config.title}</strong> accounts require document verification before full access. You'll be guided through this after signup.</p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                  )}

                  <Button onClick={handleSubmit} disabled={submitting || !formValid} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand disabled:opacity-50">
                    {submitting ? "Creating account..." : `Create ${config.title} Account`}
                    {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0A2F14] text-green-200 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Recycle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xl font-bold text-white">Ty<span className="text-amber-400">digo</span></span>
          </div>
          <p className="text-sm text-green-300">Cleaner homes. Smarter cities.</p>
        </div>
      </footer>
    </div>
  );
};

export default RoleLandingPage;
