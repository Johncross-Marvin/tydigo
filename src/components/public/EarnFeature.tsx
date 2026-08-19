import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getRolesByGroup } from "@/lib/site-config";
import { BrandMark } from "@/components/BrandMark";

export function EarnFeature() {
  const earnRoles = getRolesByGroup("earn_operate").concat(getRolesByGroup("process_materials"));

  return (
    <section className="bg-[#0A2F14] text-white">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl mb-12">
          <p className="text-amber-400 font-semibold text-sm mb-3">Earn with Tydigo</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Turn waste into income
          </h2>
          <p className="text-green-200 text-lg">
            Join the network of collectors, recyclers, organic recovery
            partners, and fleet operators building cleaner cities.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {earnRoles.map((role) => {
            return (
              <Link
                key={role.accountType}
                to={role.signupRoute}
                className="group rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <BrandMark size={32} />
                </div>
                <h3 className="font-bold text-white mb-1">{role.label}</h3>
                <p className="text-sm text-green-200/80 mb-4">{role.summary}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400 group-hover:gap-2 transition-all">
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
