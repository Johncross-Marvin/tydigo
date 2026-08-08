import { type KeyboardEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Building2, Truck, Recycle, Leaf,
  BarChart3, Shield, Globe, CheckCircle2, ArrowRight,
  Home,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { roleHomePath, type UserRole } from "@/lib/api";

const roles = [
  {
    id: "household" as UserRole,
    icon: Home,
    title: "Household",
    desc: "Schedule waste pickups, track collectors, and earn EcoPoints rewards from home.",
    color: "bg-green-100 text-[#145C25] border-green-300",
    hoverColor: "hover:border-[#145C25] hover:bg-green-50",
  },
  {
    id: "estate" as UserRole,
    icon: Building2,
    title: "Estate",
    desc: "Manage waste collection for your entire estate or residential community.",
    color: "bg-teal-100 text-teal-600 border-teal-300",
    hoverColor: "hover:border-teal-500 hover:bg-teal-50",
  },
  {
    id: "business" as UserRole,
    icon: BarChart3,
    title: "Business",
    desc: "Bulk waste management, sustainability impact reports, and dedicated support.",
    color: "bg-purple-100 text-purple-600 border-purple-300",
    hoverColor: "hover:border-purple-500 hover:bg-purple-50",
  },
  {
    id: "collector" as UserRole,
    icon: Truck,
    title: "Collector",
    desc: "Accept pickup jobs, navigate to locations, and grow your earnings.",
    color: "bg-blue-100 text-blue-600 border-blue-300",
    hoverColor: "hover:border-blue-500 hover:bg-blue-50",
  },
  {
    id: "recycler" as UserRole,
    icon: Recycle,
    title: "Recycler",
    desc: "Source recyclable materials, manage requests, and track deliveries.",
    color: "bg-amber-100 text-amber-600 border-amber-300",
    hoverColor: "hover:border-amber-500 hover:bg-amber-50",
  },
  {
    id: "organic_partner" as UserRole,
    icon: Leaf,
    title: "Organic Partner",
    desc: "BSF farms, compost operators, and livestock feed producers.",
    color: "bg-lime-100 text-lime-600 border-lime-300",
    hoverColor: "hover:border-lime-500 hover:bg-lime-50",
  },
  {
    id: "fleet_owner" as UserRole,
    icon: Truck,
    title: "Fleet Operator",
    desc: "Manage collection vehicles, routes, and driver assignments.",
    color: "bg-indigo-100 text-indigo-600 border-indigo-300",
    hoverColor: "hover:border-indigo-500 hover:bg-indigo-50",
  },
  {
    id: "corporate_partner" as UserRole,
    icon: Globe,
    title: "Corporate Partner",
    desc: "Sustainability partnerships, ESG reporting, and large-scale impact.",
    color: "bg-rose-100 text-rose-600 border-rose-300",
    hoverColor: "hover:border-rose-500 hover:bg-rose-50",
  },
  {
    id: "government" as UserRole,
    icon: Shield,
    title: "Government Agency",
    desc: "Agency oversight, regulatory compliance, and city-wide analytics.",
    color: "bg-slate-100 text-slate-600 border-slate-300",
    hoverColor: "hover:border-slate-500 hover:bg-slate-50",
  },
];

const RoleSelectionPage = () => {
  const { user, updateRole } = useAuth();
  const [selected, setSelected] = useState<string | null>(user?.role ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleContinue = async () => {
    const role = roles.find((r) => r.id === selected);
    if (!role) return;

    setSaving(true);
    setError("");

    try {
      const nextUser = await updateRole(role.id);
      navigate(roleHomePath[nextUser.role]);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Unable to update your account role.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleKeyDown = (event: KeyboardEvent, roleId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(roleId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8">
          <Badge className="bg-green-100 text-[#145C25] mb-3 px-4 py-1.5 rounded-full text-sm">
            Account Setup
          </Badge>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2">
            Choose Your Role
          </h1>
          <p className="text-neutral-500 max-w-md mx-auto">
            Select how you want to use Tydigo. You can change this later in settings.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => (
            <Card
              key={role.id}
              onClick={() => setSelected(role.id)}
              onKeyDown={(event) => handleRoleKeyDown(event, role.id)}
              role="button"
              tabIndex={0}
              aria-pressed={selected === role.id}
              className={`cursor-pointer border-2 rounded-2xl transition-all duration-200 ${
                selected === role.id
                  ? `${role.color} border-2 shadow-brand`
                  : `border-neutral-200 ${role.hoverColor}`
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selected === role.id
                        ? role.color.split(" ")[0] + " " + role.color.split(" ")[1]
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    <role.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-neutral-900 text-sm">{role.title}</h3>
                      {selected === role.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#145C25] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{role.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : `Continue as ${selected ? roles.find((r) => r.id === selected)?.title : "..."}`}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Admin access is invitation-only. Contact support for admin accounts.
        </p>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
