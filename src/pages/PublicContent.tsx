import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { useSeo } from "@/lib/seo";

type PublicContentProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/**
 * Reusable shell for public informational pages (services, company, safety,
 * support, cities, legal). Provides consistent header/footer and a simple
 * editorial content area. Specific pages can pass richer children.
 */
export function PublicContent({ title, description, children }: PublicContentProps) {
  useSeo({ title, description });

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="pt-16">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className="text-h1 font-extrabold text-neutral-900 mb-4">{title}</h1>
          {description && (
            <p className="text-lg text-neutral-500 max-w-2xl mb-10">{description}</p>
          )}
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
