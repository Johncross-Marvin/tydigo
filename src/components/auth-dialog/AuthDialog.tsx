/**
 * Tydigo AuthDialog
 *
 * The single shared authentication dialog for the whole public application.
 * Mounted once inside AuthDialogProvider; reads its state from context.
 *
 * Supports:
 *   - Create Account (signup) with canonical account-type preselection
 *   - Sign In for returning users
 *   - Generic role selection when no account type is provided
 *   - Authenticated-user decision state (no duplicate accounts)
 *
 * Reuses the existing `signUp` / `signIn` services so backend contracts,
 * validation, role mapping, RLS, and admin-review remain unchanged.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Phone,
  MapPin,
  AtSign,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleHomePath, type UserRole } from "@/lib/api";
import { signUp, signIn } from "@/services/auth";
import { generateUsername, isUsernameAvailable, isValidUsername } from "@/services/username";
import { getCities, getStateForCity, type City } from "@/services/cities";
import { isEmail, isPhone } from "@/services/identifier";
import { getAccountTypeConfig, type SignupField } from "@/lib/signup-config";
import { resolveIcon } from "@/lib/icon-resolver";
import { useAuth } from "@/components/auth-provider";
import { useAuthDialog, useAuthDialogState, type PublicAccountType } from "./auth-dialog-context";
import { ACCOUNT_GROUPS, getRolesByGroup } from "@/lib/site-config";

type Mode = "signup" | "signin";

export function AuthDialog() {
  const navigate = useNavigate();
  const { closeAuthDialog } = useAuthDialog();
  const state = useAuthDialogState();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("signup");
  const [selectedRole, setSelectedRole] = useState<PublicAccountType | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // ── Sign up state ──
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

  // ── Sign in state ──
  const [identifier, setIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // ── Shared ──
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Sync mode + role from context when dialog opens
  useEffect(() => {
    if (state.open) {
      setMode(state.mode);
      setSelectedRole(state.accountType);
      setShowRolePicker(!state.accountType);
      setError("");
      setSuccess(null);
    }
  }, [state.open, state.mode, state.accountType]);

  // Load cities once when dialog opens
  useEffect(() => {
    if (state.open) getCities().then(setCities);
  }, [state.open]);

  // Auto-generate username from full name
  useEffect(() => {
    if (!usernameEdited && fullName.trim()) setUsername(generateUsername(fullName));
  }, [fullName, usernameEdited]);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameAvailable(await isUsernameAvailable(username));
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Focus first field on open
  useEffect(() => {
    if (state.open && !showRolePicker) {
      const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [state.open, showRolePicker, mode]);

  // Lock body scroll while open
  useEffect(() => {
    if (state.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [state.open]);

  // Escape to close (unless submitting)
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) closeAuthDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, submitting, closeAuthDialog]);

  const config = selectedRole ? getAccountTypeConfig(selectedRole as UserRole) : undefined;
  const RoleIcon = resolveIcon(config?.icon || "Home");

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 20);
    const q = citySearch.toLowerCase();
    return cities
      .filter((c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, 10);
  }, [cities, citySearch]);

  const roleFieldsValid = useMemo(() => {
    if (!config) return true;
    return config.fields.every((f) => !f.required || (roleFields[f.key] || "").trim());
  }, [config, roleFields]);

  const signupValid = useMemo(() => {
    if (!selectedRole) return false;
    if (!fullName.trim() || fullName.trim().length < 2) return false;
    if (!email.trim() || !isEmail(email)) return false;
    if (phone.trim() && !isPhone(phone)) return false;
    if (!cityName) return false;
    if (!username || !isValidUsername(username) || usernameAvailable === false) return false;
    if (!password || password.length < 8) return false;
    if (confirmPassword && password !== confirmPassword) return false;
    if (!agreedToTerms) return false;
    if (!roleFieldsValid) return false;
    return true;
  }, [selectedRole, fullName, email, phone, cityName, username, usernameAvailable, password, confirmPassword, agreedToTerms, roleFieldsValid]);

  const signinValid = identifier.trim().length > 0 && signInPassword.length > 0;

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

  const handleSelectRole = useCallback((role: PublicAccountType) => {
    setSelectedRole(role);
    setShowRolePicker(false);
    setRoleFields({});
  }, []);

  const handleSignup = async () => {
    setError("");
    if (!config || !selectedRole) return;
    if (!signupValid) {
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
        role: selectedRole as UserRole,
        metadata: roleFields,
      });
      setSuccess("Account created");
      closeAuthDialog();
      if (!result.needsVerification) {
        navigate(roleHomePath[selectedRole as UserRole], { replace: true });
      } else {
        navigate("/check-email", { state: { email: email.trim() } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignin = async () => {
    setError("");
    if (!signinValid) {
      setError("Enter your email, username or phone number and password.");
      return;
    }
    setSubmitting(true);
    try {
      const { user: signedInUser } = await signIn(identifier, signInPassword);
      closeAuthDialog();
      navigate(roleHomePath[signedInUser.role], { replace: true });
    } catch {
      setError("Invalid login details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) {
      // Warn before losing substantial progress
      const hasData = fullName || email || phone || password || identifier || signInPassword;
      if (hasData && !success) {
        if (!window.confirm("Discard your progress and close?")) return;
      }
      closeAuthDialog();
    }
  };

  const renderField = (field: SignupField) => {
    const value = roleFields[field.key] || "";
    if (field.type === "select") {
      return (
        <div key={field.key}>
          <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <select
            value={value}
            onChange={(e) => handleRoleFieldChange(field.key, e.target.value)}
            className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#145C25] focus:border-transparent"
          >
            <option value="">{field.placeholder}</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <Input
          value={value}
          onChange={(e) => handleRoleFieldChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="h-12 rounded-xl"
        />
      </div>
    );
  };

  if (!state.open) return null;

  // ── Authenticated user decision state ──
  if (!authLoading && user) {
    const roleMatches = selectedRole && user.role === selectedRole;
    return (
      <div
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="You are signed in"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={closeAuthDialog} aria-hidden="true" />
        <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-elevation-3 animate-[modalIn_300ms_cubic-bezier(0.16,1,0.3,1)] pb-safe">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900">You're signed in</h2>
              <button onClick={closeAuthDialog} className="h-10 w-10 rounded-xl hover:bg-neutral-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5 text-neutral-700" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              You're already signed in as <strong>{user.name}</strong>.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  closeAuthDialog();
                  navigate(roleHomePath[user.role], { replace: true });
                }}
                className="w-full h-12 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-xl"
              >
                Continue to my dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {selectedRole && !roleMatches && (
                <Button
                  variant="outline"
                  onClick={closeAuthDialog}
                  className="w-full h-12 rounded-xl"
                >
                  View this programme information
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signup" ? "Create your account" : "Sign in to Tydigo"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-elevation-3 animate-[modalIn_300ms_cubic-bezier(0.16,1,0.3,1)] pb-safe"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 py-4 flex items-center justify-between border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${config?.iconBg || "bg-green-100 text-[#145C25]"} flex items-center justify-center`}>
              <RoleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 leading-tight">
                {mode === "signup"
                  ? showRolePicker
                    ? "How will you use Tydigo?"
                    : `Create your ${config?.title || "Tydigo"} account`
                  : "Welcome back"}
              </h2>
              <p className="text-xs text-neutral-500">
                {mode === "signup"
                  ? showRolePicker
                    ? "Choose an account type to continue."
                    : "Fill in your details to get started."
                  : "Sign in to continue."}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthDialog}
            className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-neutral-700" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-xl">
            <button
              onClick={() => setMode("signup")}
              className={`h-10 rounded-lg text-sm font-semibold transition-all ${
                mode === "signup" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => setMode("signin")}
              className={`h-10 rounded-lg text-sm font-semibold transition-all ${
                mode === "signin" ? "bg-white text-[#145C25] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {mode === "signup" && showRolePicker ? (
            /* ── Role selection step ── */
            <div className="space-y-6">
              {ACCOUNT_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getRolesByGroup(group.key).map((role) => {
                      const Icon = resolveIcon(role.icon);
                      return (
                        <button
                          key={role.accountType}
                          onClick={() => handleSelectRole(role.accountType as PublicAccountType)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:border-[#145C25]/30 hover:bg-green-50/40 transition-colors text-left"
                        >
                          <div className={`w-9 h-9 rounded-lg ${role.iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-900">{role.label}</p>
                            <p className="text-xs text-neutral-500 truncate">{role.summary}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : mode === "signup" ? (
            /* ── Signup form ── */
            <div className="space-y-4">
              {/* Change account type */}
              <button
                onClick={() => setShowRolePicker(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#145C25] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Change account type
              </button>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Full Name *</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <User className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    ref={firstFieldRef}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Amina Bello"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Email *</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Mail className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amina@email.com"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Phone className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">City *</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <MapPin className="w-4 h-4 text-neutral-400" />
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
                    className="pl-10 h-12 rounded-xl"
                  />
                  {cityName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCityName("");
                        setCitySearch("");
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showCityDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {filteredCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm font-medium text-neutral-700 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {city.city}, {city.state}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {config?.fields.map(renderField)}

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Username</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <AtSign className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="aminabello"
                    className="pl-10 h-12 rounded-xl"
                  />
                  {checkingUsername && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                    </div>
                  )}
                  {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {username.length >= 3 && usernameAvailable === false && (
                  <p className="text-xs text-red-500 mt-1">This username is already taken.</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Password *</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <KeyRound className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pl-10 pr-11 h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <KeyRound className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-10 h-12 rounded-xl"
                  />
                  {confirmPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {password === confirmPassword ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#145C25] focus:ring-[#145C25]"
                />
                <span className="text-sm text-neutral-600">
                  I agree to the{" "}
                  <a href="/legal/terms" className="text-[#145C25] font-semibold hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/legal/privacy" className="text-[#145C25] font-semibold hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>

              {config?.requiresVerification && (
                <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>{config.title}</strong> accounts require document verification before full
                    access. You'll be guided through this after signup.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSignup}
                disabled={submitting || !signupValid}
                className="w-full h-12 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-xl shadow-brand disabled:opacity-50"
              >
                {submitting ? "Creating account..." : `Create ${config?.title || "Tydigo"} Account`}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          ) : (
            /* ── Sign in form ── */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
                  Email, Username or Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Mail className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    ref={firstFieldRef}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Lock className="w-4 h-4 text-neutral-400" />
                  </div>
                  <Input
                    type={showSignInPassword ? "text" : "password"}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Your password"
                    className="pl-10 pr-11 h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSignin}
                disabled={submitting || !signinValid}
                className="w-full h-12 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-xl shadow-brand disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign In"}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>

              <p className="text-center text-xs text-neutral-500">
                Forgot your password?{" "}
                <a href="/forgot-password" className="text-[#145C25] font-semibold hover:underline">
                  Reset it
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
