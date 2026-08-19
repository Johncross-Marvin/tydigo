import { useState } from "react";
import { PublicContent } from "@/pages/PublicContent";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/public/AuthModal";
import { resolveIcon } from "@/lib/icon-resolver";
import { getPublicPageContent } from "@/lib/public-content";
import type { UserRole } from "@/lib/api";

type PublicPlaceholderProps = {
  title: string;
  description: string;
  /** Optional primary CTA link. The href is expected to be a /signup/:role path. */
  cta?: { label: string; href: string };
  /** Key into PUBLIC_PAGE_CONTENT for rich editorial content. */
  contentKey?: string;
};

/** Extract the role from a /signup/:role href, defaulting to household. */
function roleFromHref(href?: string): UserRole {
  if (!href) return "household";
  const match = href.match(/\/signup\/([a-z_]+)/);
  return (match?.[1] as UserRole) || "household";
}

/**
 * Public informational page with rich, brand-consistent editorial content.
 * Falls back to a concise "being prepared" note when no content key is set.
 * "Get started" CTAs open the shared AuthModal (sign up / sign in).
 */
export function PublicPlaceholder({ title, description, cta, contentKey }: PublicPlaceholderProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const content = contentKey ? getPublicPageContent(contentKey) : null;

  return (
    <PublicContent title={title} description={description}>
      {content ? (
        <div className="space-y-12">
          {/* Feature grid */}
          {content.features.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.features.map((feature) => {
                const Icon = resolveIcon(feature.icon);
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-neutral-100 p-6 hover:border-[#145C25]/20 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-[#145C25]" />
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-1.5">{feature.title}</h3>
                    <p className="text-neutral-500 leading-relaxed text-sm">{feature.body}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl bg-[#0A2F14] text-white p-8 sm:p-10">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold mb-3">
                {content.ctaNote || "Ready to get started?"}
              </h2>
              <p className="text-green-200 mb-6">
                Join Tydigo and help build cleaner, smarter cities.
              </p>
              <div className="flex flex-wrap gap-3">
                {cta && (
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold text-sm"
                  >
                    {cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-white text-[#0A2F14] font-bold text-sm hover:bg-green-50"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        role={roleFromHref(cta?.href)}
      />
    </PublicContent>
  );
}
