import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ACCOUNT_GROUPS, getRolesByGroup } from "@/lib/site-config";
import { resolveIcon } from "@/lib/icon-resolver";

export function RolePathways() {
  return (
    <div className="space-y-10">
      {ACCOUNT_GROUPS.map((group) => {
        const roles = getRolesByGroup(group.key);
        return (
          <div key={group.key}>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-neutral-900">{group.label}</h3>
              <p className="text-sm text-neutral-500">{group.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map((role) => {
                const Icon = resolveIcon(role.icon);
                return (
                  <Link
                    key={role.accountType}
                    to={role.signupRoute}
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-neutral-100 hover:border-[#145C25]/30 hover:bg-green-50/40 transition-colors"
                  >
                    <div className={`w-11 h-11 rounded-xl ${role.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 group-hover:text-[#145C25] transition-colors">
                        {role.label}
                      </p>
                      <p className="text-sm text-neutral-500 mt-0.5">{role.summary}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-[#145C25] mt-1 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
