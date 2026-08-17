/**
 * Tydigo Signup — Account Type Selection
 *
 * Bolt-style "choose your product" landing page. Each account type is a
 * distinct product with its own dedicated registration flow at /signup/:role.
 */

import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Home, Building2, BarChart3, Truck,
  Recycle, Leaf, Globe, Shield, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPES } from "@/lib/signup-config";
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

const SignupPage = () => {
  useSeo({ title: "Choose Your Account Type — Tydigo" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge className="bg-green-100 text-[#145C25] mb-4 px-4 py-1.5 rounded-full text-sm">
            One platform, many ways to participate
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight mb-4">
            How will you use Tydigo?
          </h1>
          <p className="text-neutral-500 text-lg">
            Choose your account type to get started. Each account type has its
            own dedicated workspace and registration process.
          </p>
        </div>

        {/* Account type grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {ACCOUNT_TYPES.map((type) => {
            const Icon = ICONS[type.icon] || Home;
            return (
              <Link key={type.role} to={`/signup/${type.role}`} className="group">
                <Card className="border-0 shadow-md shadow-neutral-200/40 hover:shadow-brand-lg transition-all duration-300 rounded-2xl h-full hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className={`w-14 h-14 rounded-2xl ${type.iconBg} flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">
                      {type.title}
                    </h3>
                    <p className="text-sm text-neutral-500 leading-relaxed flex-1">
                      {type.description}
                    </p>
                    <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-[#145C25] group-hover:gap-2 transition-all">
                      Get started
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500 mb-8">
          {["Free to start", "Dedicated dashboard", "Secure & verified"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#145C25]" />
              {item}
            </span>
          ))}
        </div>

        <p className="text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="text-[#145C25] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
