import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Lock, Shield, Recycle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { roleHomePath } from "@/lib/api";
import { signIn, resetPassword } from "@/services/auth";
import { useAuth } from "@/components/auth-provider";
import { IMAGE_IDS, gdUrl } from "@/lib/images";

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [loading, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) { setError("Enter your email, username or phone number."); return; }
    if (!password && !resetMode) { setError("Enter your password."); return; }

    setSubmitting(true);
    try {
      if (resetMode) {
        await resetPassword(identifier);
        setResetSent(true);
      } else {
        const { user: nextUser } = await signIn(identifier, password);
        navigate(roleHomePath[nextUser.role], { replace: true });
      }
    } catch (err) {
      // Generic error — never reveal whether the account exists
      setError("Invalid login details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-brand-lg rounded-3xl">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3"><Mail className="w-6 h-6 text-[#145C25]" /></div>
            <CardTitle className="text-2xl font-extrabold">Check Your Email</CardTitle>
            <CardDescription>If an account exists, a password reset link has been sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => { setResetMode(false); setResetSent(false); setIdentifier(""); }} variant="outline" className="w-full rounded-xl">Back to Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col items-center">
          <div className="w-72 rounded-[2.5rem] overflow-hidden shadow-brand-lg border-4 border-neutral-300">
            <img src={gdUrl(IMAGE_IDS.login)} alt="Tydigo" className="w-full h-auto" />
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Recycle className="w-6 h-6 text-[#145C25]" />
              <span className="text-xl font-bold text-[#145C25]">Ty<span className="text-amber-500">digo</span></span>
            </div>
            <p className="text-sm text-neutral-500">Cleaner homes. Smarter cities.</p>
          </div>
        </div>

        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6"><ArrowLeft className="w-4 h-4" /> Back</Link>

          <Card className="border-0 shadow-brand-lg rounded-3xl">
            <CardHeader className="space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3"><Lock className="w-6 h-6 text-[#145C25]" /></div>
              <CardTitle className="text-2xl font-extrabold">{resetMode ? "Reset Password" : "Sign in to Tydigo"}</CardTitle>
              <CardDescription>{resetMode ? "Enter your account email to receive a reset link." : "Use your email, username or phone number."}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              <div className="flex gap-2">
                <Link to="/signup" className="text-sm text-[#145C25] font-semibold hover:underline">Create account</Link>
                <span className="text-neutral-300">|</span>
                <button type="button" onClick={() => { setResetMode(!resetMode); setError(""); }} className="text-sm text-neutral-500 hover:text-[#145C25]">{resetMode ? "Sign in" : "Forgot password?"}</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
                    {resetMode ? "Account Email" : "Email, Username or Phone Number"}
                  </label>
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={resetMode ? "you@example.com" : "Email, username or phone number"}
                    className="h-14 rounded-2xl"
                    required
                  />
                </div>

                {!resetMode && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="h-14 rounded-2xl pr-12"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <Button type="submit" disabled={submitting} className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold rounded-2xl shadow-brand disabled:opacity-50">
                  {submitting ? "Please wait..." : resetMode ? "Send Reset Link" : "Sign In"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>

              <div className="text-center text-xs text-neutral-400"><Shield className="w-3.5 h-3.5 inline mr-1" />Secured by Supabase Auth</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
