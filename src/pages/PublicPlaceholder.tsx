import { PublicContent } from "@/pages/PublicContent";
import { ArrowRight } from "lucide-react";
import { AuthTrigger, type PublicAccountType } from "@/components/auth-dialog";

type PublicPlaceholderProps = {
  title: string;
  description: string;
  /** Optional primary CTA. */
  cta?: { label: string; accountType?: PublicAccountType; href?: string };
};

/**
 * Honest placeholder for public routes whose full content is not yet built.
 * Provides a meaningful page (not a dead link) with a clear path forward.
 * Authentication-intent CTAs open the shared dialog instead of navigating away.
 */
export function PublicPlaceholder({ title, description, cta }: PublicPlaceholderProps) {
  return (
    <PublicContent title={title} description={description}>
      <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-8 max-w-2xl">
        <p className="text-neutral-600 mb-4">
          This page is being prepared. In the meantime, you can explore the
          core Tydigo experience below.
        </p>
        <div className="flex flex-wrap gap-3">
          {cta && cta.accountType && (
            <AuthTrigger
              mode="signup"
              accountType={cta.accountType}
              source={`placeholder-${cta.accountType}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#145C25] text-white font-semibold text-sm hover:bg-[#0F4A1E]"
            >
              {cta.label}
              <ArrowRight className="w-4 h-4" />
            </AuthTrigger>
          )}
          <AuthTrigger
            mode="signup"
            source="placeholder-generic"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-100"
          >
            Get started
          </AuthTrigger>
        </div>
      </div>
    </PublicContent>
  );
}
