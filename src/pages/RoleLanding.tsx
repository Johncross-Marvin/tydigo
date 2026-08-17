/**
 * Tydigo Role Landing Page
 *
 * Dedicated marketing landing page for a single account type.
 * Structure: hero → value props → how it works → requirements → FAQ → CTA.
 * The "Get started" buttons open the shared AuthModal (sign up / sign in)
 * rather than an inline form, so the marketing content stays readable.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2,
  Home, Building2, BarChart3, Truck, Recycle, Leaf, Globe, Shield,
  Clock, DollarSign, Award, Package, Users, Calendar, FileText, MapPin,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleHomePath, type UserRole } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { getAccountTypeConfig } from "@/lib/signup-config";
import { useSeo } from "@/lib/seo";
import { AuthModal } from "@/components/public/AuthModal";

const ICONS: Record<string, typeof Home> = {
  Home, Building2, BarChart3, Truck, Recycle, Leaf, Globe, Shield,
  Clock, DollarSign, Award, Package, Users, Calendar, FileText, MapPin,
};

const RoleLandingPage = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const config = getAccountTypeConfig((role as UserRole) || "household");
  const Icon = ICONS[config?.icon || "Home"] || Home;

  const [authOpen, setAuthOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useSeo({ title: `${config?.title || "Sign Up"} — Tydigo` });

  useEffect(() => {
    if (!authLoading && user) navigate(roleHomePath[user.role], { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!config) navigate("/signup", { replace: true });
  }, [config, navigate]);

  if (!config) return null;

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
            <Button variant="outline" className="rounded-xl" onClick={() => setAuthOpen(true)}>Sign In</Button>
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
                  onClick={() => setAuthOpen(true)}
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
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-extrabold text-neutral-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-neutral-500 mb-8">
            Create your {config.title} account and start today.
          </p>
          <Button
            onClick={() => setAuthOpen(true)}
            className="bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base px-10 py-6 rounded-2xl shadow-brand"
          >
            Create {config.title} Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
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

      {/* ── Auth modal (sign up / sign in) ── */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        role={config.role}
      />
    </div>
  );
};

export default RoleLandingPage;
