import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Building2, Truck, Recycle, Leaf,
  BarChart3, Shield, Globe, CheckCircle2, ArrowRight,
  Home, AlertTriangle, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { roleHomePath, type UserRole } from "@/lib/api";
import { getRoleLabel, getRoleDashboardPath } from "@/lib/role-registry";

const roles = [
  {
    id: "household" as UserRole,
    icon: Home,
    title: "Household",
    desc: "Schedule waste pickups, track collectors, and earn EcoPoints rewards from home.",
    color: "bg-green-100 text-[#145C25] border-green-300",
  },
  {
    id: "estate" as UserRole,
    icon: Building2,
    title: "Estate",
    desc: "Manage waste collection for your entire estate or residential community.",
    color: "bg-teal-100 text-teal-600 border-teal-300",
  },
  {
    id: "business" as UserRole,
    icon: BarChart3,
    title: "Business",
    desc: "Bulk waste management, sustainability impact reports, and dedicated support.",
    color: "bg-purple-100 text-purple-600 border-purple-300",
  },
  {
    id: "collector" as UserRole,
    icon: Truck,
    title: "Collector",
    desc: "Accept pickup jobs, navigate to locations, and grow your earnings.",
    color: "bg-blue-100 text-blue-600 border-blue-300",
  },
  {
    id: "recycler" as UserRole,
    icon: Recycle,
    title: "Recycler",
    desc: "Source recyclable materials, manage requests, and track deliveries.",
    color: "bg-amber-100 text-amber-600 border-amber-300",
  },
  {
    id: "organic_partner" as UserRole,
    icon: Leaf,
    title: "Organic Partner",
    desc: "BSF farms, compost operators, and livestock feed producers.",
    color: "bg-lime-100 text-lime-600 border-lime-300",
  },
  {
    id: "fleet_owner" as UserRole,
    icon: Truck,
    title: "Fleet Operator",
    desc: "Manage collection vehicles, routes, and driver assignments.",
    color: "bg-indigo-100 text-indigo-600 border-indigo-300",
  },
  {
    id: "corporate_partner" as UserRole,
    icon: Globe,
    title: "Corporate Partner",
    desc: "Sustainability partnerships, ESG reporting, and large-scale impact.",
    color: "bg-rose-100 text-rose-600 border-rose-300",
  },
  {
    id: "government" as UserRole,
    icon: Shield,
    title: "Government Agency",
    desc: "Agency oversight, regulatory compliance, and city-wide analytics.",
    color: "bg-slate-100 text-slate-600 border-slate-300",
  },
];

const RoleSelectionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentRole = user?.role || "household";
  const currentDashboard = getRoleDashboardPath(currentRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Link
          to={currentDashboard}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="text-center mb-8">
          <Badge className="bg-green-100 text-[#145C25] mb-3 px-4 py-1.5 rounded-full text-sm">
            Account Information
          </Badge>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2">
            Your Account Type
          </h1>
          <p className="text-neutral-500 max-w-md mx-auto">
            You are currently signed up as a{" "}
            <strong>{getRoleLabel(currentRole)}</strong>.
          </p>
        </div>

        {/* Current role highlight */}
        <Card className="border-2 border-[#145C25] bg-green-50 rounded-2xl mb-6">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#145C25] text-white flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-neutral-900 text-lg">
                {getRoleLabel(currentRole)}
              </p>
              <p className="text-sm text-neutral-600">
                This is your current Tydigo workspace
              </p>
            </div>
            <Button
              variant="outline"
              className="ml-auto rounded-xl"
              onClick={() => navigate(currentDashboard)}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Warning about role changes */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Need a different account type?</p>
            <p>
              For security and operational integrity, account types cannot be changed
              directly from your profile. To request a different account type, please
              contact Tydigo Support. Our team will review your request and guide you
              through any required documentation.
            </p>
            <a
              href="mailto:support@tydigo.com"
              className="inline-flex items-center gap-1 mt-2 text-amber-700 font-semibold hover:underline"
            >
              Contact Tydigo Support
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* All roles display (informational only) */}
        <h2 className="text-lg font-bold text-neutral-900 mb-4">All Tydigo Account Types</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => {
            const isCurrent = role.id === currentRole;
            return (
              <Card
                key={role.id}
                className={`border-2 rounded-2xl transition-all ${
                  isCurrent
                    ? `${role.color} border-2 shadow-brand`
                    : "border-neutral-200 opacity-60"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? role.color.split(" ")[0] + " " + role.color.split(" ")[1]
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <role.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-neutral-900 text-sm">{role.title}</h3>
                        {isCurrent && (
                          <Badge className="bg-green-100 text-[#145C25] text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{role.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-neutral-400">
          Admin access is invitation-only. Contact support for admin accounts.
        </p>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
