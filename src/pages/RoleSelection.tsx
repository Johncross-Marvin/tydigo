import { type KeyboardEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Truck,
  BarChart3,
  Recycle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { roleHomePath, type UserRole } from "@/lib/api";

const roles = [
  {
    id: "household",
    icon: Users,
    title: "Household",
    desc: "Schedule waste pickups, track collectors, and earn EcoPoints rewards.",
    color: "bg-green-100 text-[#145C25] border-green-300",
    hoverColor: "hover:border-[#145C25] hover:bg-green-50",
    route: "/household/dashboard",
  },
  {
    id: "collector",
    icon: Truck,
    title: "Collector",
    desc: "Accept pickup jobs, navigate to locations, and grow your earnings.",
    color: "bg-blue-100 text-blue-600 border-blue-300",
    hoverColor: "hover:border-blue-500 hover:bg-blue-50",
    route: "/collector/dashboard",
  },
  {
    id: "business",
    icon: BarChart3,
    title: "Business",
    desc: "Bulk waste management, impact reports, and dedicated account support.",
    color: "bg-purple-100 text-purple-600 border-purple-300",
    hoverColor: "hover:border-purple-500 hover:bg-purple-50",
    route: "/business/dashboard",
  },
  {
    id: "partner",
    icon: Recycle,
    title: "Recycling Partner",
    desc: "Source recyclable materials, manage requests, and track deliveries.",
    color: "bg-amber-100 text-amber-600 border-amber-300",
    hoverColor: "hover:border-amber-500 hover:bg-amber-50",
    route: "/partner/dashboard",
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
      const nextUser = await updateRole(role.id as UserRole);
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
      <div className="w-full max-w-2xl">
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
          <p className="text-neutral-500">
            Select how you want to use WastiGo. Admin access is invitation-only.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
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
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      selected === role.id
                        ? role.color.replace("border-", "bg-").split(" ")[0] +
                          " " +
                          role.color.split(" ")[1]
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    <role.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900">
                        {role.title}
                      </h3>
                      {selected === role.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#145C25] shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {role.desc}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <Button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full h-14 bg-[#145C25] hover:bg-[#0F4A1E] text-white font-bold text-base rounded-2xl shadow-brand disabled:opacity-50"
        >
          {saving ? "Saving..." : `Continue as ${selected ? roles.find((r) => r.id === selected)?.title : "..."}`}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
