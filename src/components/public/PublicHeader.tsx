import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Recycle,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Globe,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { roleHomePath } from "@/lib/api";
import {
  MENU_CATEGORIES,
  ACCOUNT_GROUPS,
  getRolesByGroup,
  LANGUAGES,
  FEATURE_FLAGS,
  type RoleExperience,
} from "@/lib/site-config";
import { resolveIcon } from "@/lib/icon-resolver";

type PublicHeaderProps = {
  /** Whether the header starts transparent over a dark hero. */
  transparent?: boolean;
};

export function PublicHeader({ transparent = false }: PublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(MENU_CATEGORIES[0].key);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleRegister = useCallback(() => {
    setMenuOpen(false);
    setRegisterOpen(true);
  }, []);

  const handleSelectRole = useCallback(
    (role: RoleExperience) => {
      setRegisterOpen(false);
      navigate(role.signupRoute);
    },
    [navigate],
  );

  const solid = scrolled || menuOpen || !transparent;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          solid
            ? "bg-white/95 backdrop-blur-md border-b border-neutral-200/70"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5" aria-label="Tydigo home">
              <div className="w-9 h-9 rounded-xl bg-[#145C25] flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span
                className={`text-xl font-bold tracking-tight ${
                  solid ? "text-neutral-900" : "text-white"
                }`}
              >
                Ty<span className="text-amber-500">digo</span>
              </span>
            </Link>

            {/* Desktop controls */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                    solid ? "text-neutral-600 hover:bg-neutral-100" : "text-white/90 hover:bg-white/10"
                  }`}
                  aria-label="Select language"
                  aria-expanded={langOpen}
                >
                  <Globe className="w-4 h-4" />
                  English
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-elevation-3 border border-neutral-100 p-1.5 z-50">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLangOpen(false)}
                        disabled={lang.status !== "active"}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <span>
                          <span className="font-medium text-neutral-800">{lang.nativeName}</span>
                          {lang.status !== "active" && (
                            <span className="ml-2 text-xs text-neutral-400">
                              {lang.status === "beta" ? "Beta" : "Coming soon"}
                            </span>
                          )}
                        </span>
                        {lang.status === "active" && <Check className="w-4 h-4 text-[#145C25]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Support */}
              <Link
                to="/support"
                className={`flex items-center h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                  solid ? "text-neutral-600 hover:bg-neutral-100" : "text-white/90 hover:bg-white/10"
                }`}
              >
                Support
              </Link>

              {/* Register */}
              <Button
                onClick={handleRegister}
                className="h-10 px-5 rounded-xl bg-[#145C25] hover:bg-[#0F4A1E] text-white font-semibold"
              >
                Register
              </Button>

              {/* Menu */}
              <button
                onClick={() => setMenuOpen(true)}
                className="flex items-center justify-center h-10 w-10 rounded-xl transition-colors hover:bg-neutral-100"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="mega-menu"
              >
                <Menu className={`w-5 h-5 ${solid ? "text-neutral-700" : "text-white"}`} />
              </button>
            </div>

            {/* Mobile controls */}
            <div className="flex lg:hidden items-center gap-1">
              <Link
                to="/support"
                className={`flex items-center justify-center h-10 w-10 rounded-xl ${
                  solid ? "text-neutral-600" : "text-white/90"
                }`}
                aria-label="Support"
              >
                <Globe className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setMenuOpen(true)}
                className="flex items-center justify-center h-10 w-10 rounded-xl"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="mega-menu"
              >
                <Menu className={`w-5 h-5 ${solid ? "text-neutral-700" : "text-white"}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mega menu overlay ── */}
      {menuOpen && (
        <div
          id="mega-menu"
          className="fixed inset-0 z-[60] bg-white overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Menu header */}
            <div className="flex items-center justify-between h-16">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#145C25] flex items-center justify-center">
                  <Recycle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-neutral-900">
                  Ty<span className="text-amber-500">digo</span>
                </span>
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-neutral-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-neutral-700" />
              </button>
            </div>

            {/* Desktop layout */}
            <div className="hidden lg:grid grid-cols-[1fr_320px] gap-8 py-8">
              {/* Category tabs + links */}
              <div>
                <div className="flex gap-1 mb-6 flex-wrap">
                  {MENU_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === cat.key
                          ? "bg-[#145C25] text-white"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                      aria-pressed={activeCategory === cat.key}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {MENU_CATEGORIES.find((c) => c.key === activeCategory)?.links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900 group-hover:text-[#145C25] transition-colors">
                          {link.label}
                        </p>
                        {link.description && (
                          <p className="text-sm text-neutral-500 mt-0.5">{link.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#145C25] mt-1" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right rail: account types */}
              <div className="bg-neutral-50 rounded-2xl p-5">
                <p className="text-sm font-semibold text-neutral-500 mb-4">Choose your path</p>
                <div className="space-y-4">
                  {ACCOUNT_GROUPS.map((group) => (
                    <div key={group.key}>
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {getRolesByGroup(group.key).map((role) => {
                          const Icon = resolveIcon(role.icon);
                          return (
                            <button
                              key={role.accountType}
                              onClick={() => handleSelectRole(role)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors text-left"
                            >
                              <div className={`w-9 h-9 rounded-lg ${role.iconBg} flex items-center justify-center shrink-0`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-neutral-800">{role.label}</p>
                                <p className="text-xs text-neutral-500 truncate">{role.summary}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-neutral-300" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="lg:hidden py-6 pb-safe">
              <div className="space-y-1">
                {MENU_CATEGORIES.map((cat) => (
                  <details key={cat.key} className="group">
                    <summary className="flex items-center justify-between py-3 px-2 text-base font-semibold text-neutral-900 cursor-pointer list-none">
                      {cat.label}
                      <ChevronRight className="w-5 h-5 text-neutral-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="pl-4 pb-2 space-y-1">
                      {cat.links.map((link) => (
                        <Link
                          key={link.label}
                          to={link.href}
                          onClick={() => setMenuOpen(false)}
                          className="block py-2.5 text-neutral-600"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-100 space-y-3">
                <Button
                  onClick={handleRegister}
                  className="w-full h-12 rounded-xl bg-[#145C25] hover:bg-[#0F4A1E] text-white font-semibold"
                >
                  Register
                </Button>
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-12 rounded-xl">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Register role dialog ── */}
      {registerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your account type"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRegisterOpen(false);
          }}
        >
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto pb-safe">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 flex items-center justify-between border-b border-neutral-100">
              <h2 className="text-lg font-bold text-neutral-900">How will you use Tydigo?</h2>
              <button
                onClick={() => setRegisterOpen(false)}
                className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-neutral-700" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {ACCOUNT_GROUPS.map((group) => (
                  <div key={group.key}>
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                      {group.label}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {getRolesByGroup(group.key).map((role) => {
                        const Icon = resolveIcon(role.icon);
                        return (
                          <button
                            key={role.accountType}
                            onClick={() => handleSelectRole(role)}
                            className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-neutral-100 hover:border-[#145C25]/30 hover:bg-green-50/40 transition-colors text-left"
                          >
                            <div className={`w-10 h-10 rounded-xl ${role.iconBg} flex items-center justify-center`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 text-sm">{role.label}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{role.summary}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-neutral-500 mt-6">
                Already have an account?{" "}
                <Link
                  to="/login"
                  onClick={() => setRegisterOpen(false)}
                  className="text-[#145C25] font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
