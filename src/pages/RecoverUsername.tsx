/**
 * Tydigo Recover Username Page
 *
 * Allows users to recover their username via email or phone.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, Phone, AtSign, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { detectIdentifier } from "@/services/identifier";
import { normalizeNigerianPhone } from "@/utils/phone";

const RecoverUsernamePage = () => {
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [foundUsername, setFoundUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFoundUsername("");

    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const detected = detectIdentifier(identifier);

      if (!isSupabaseAvailable() || !supabase) {
        setFoundUsername("johndoe");
        setSent(true);
        return;
      }

      let lookupField = "";
      let lookupValue = "";

      if (detected.type === "email") {
        lookupField = "email";
        lookupValue = detected.normalized;
      } else if (detected.type === "phone") {
        lookupField = "phone";
        lookupValue = normalizeNigerianPhone(identifier);
      } else {
        setError("Please enter a valid email address or phone number.");
        setSubmitting(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq(lookupField, lookupValue)
        .maybeSingle();

      if (data?.username) {
        setFoundUsername(data.username);
      } else {
        setFoundUsername("");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to look up username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <Card className="border-0 shadow-brand-lg rounded-3xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
              <AtSign className="w-6 h-6 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {sent ? (foundUsername ? "Username Found" : "Check your details") : "Recover Username"}
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {sent
                ? foundUsername
                  ? "We found the username associated with your account."
                  : "No username was found for that email or phone. Try another."
                : "Enter your email or phone number to recover your username."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-neutral-700 mb-2 block">Email or phone number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-neutral-400" />
                    </div>
                    <Input
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                      placeholder="john@email.com or 08012345678"
                      className="pl-12 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Find Username"}
                  {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                {foundUsername ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-[#145C25]" />
                    </div>
                    <div>
                      <p className="text-neutral-600 mb-1">Your username is:</p>
                      <p className="text-2xl font-extrabold text-[#145C25]">@{foundUsername}</p>
                    </div>
                    <Button onClick={() => window.location.href = "/login"} className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
                      Go to Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                      <AtSign className="w-8 h-8 text-amber-600" />
                    </div>
                    <p className="text-neutral-600">No account found with those details.</p>
                    <Button variant="outline" onClick={() => { setSent(false); setError(""); }} className="rounded-xl">
                      Try again
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="text-center text-xs text-neutral-400">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Secure username recovery.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecoverUsernamePage;
