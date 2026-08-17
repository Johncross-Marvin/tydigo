import { useState } from "react";
import { PublicContent } from "@/pages/PublicContent";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/public/AuthModal";
import type { UserRole } from "@/lib/api";

type PublicPlaceholderProps = {
  title: string;
  description: string;
  /** Optional primary CTA link. The href is expected to be a /signup/:role path. */
  cta?: { label: string; href: string };
};

/** Extract the role from a /signup/:role href, defaulting to household. */
function roleFromHref(href?: string): UserRole {
  if (!href) return "household";
  const match = href.match(/\/signup\/([a-z_]+)/);
  return (match?.[1] as UserRole) || "household";
}

/**
 * Honest placeholder for public routes whose full content is not yet built.
 * Provides a meaningful page (not a dead link) with a clear path forward.
 * "Get started" CTAs open the shared AuthModal (sign up / sign in).
 */
export function PublicPlaceholder({ title, description, cta }: PublicPlaceholderProps) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <PublicContent title={title} description={description}>
      <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-8 max-w-2xl">
        <p className="text-neutral-600 mb-4">
          This page is being prepared. In the meantime, you can explore the
          core Tydigo experience below.
        </p>
        <div className="flex flex-wrap gap-3">
          {cta && (
            <button
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#145C25] text-white font-semibold text-sm hover:bg-[#0F4A1E]"
            >
              {cta.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-100"
          >
            Get started
          </button>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        role={roleFromHref(cta?.href)}
      />
    </PublicContent>
  );
}
