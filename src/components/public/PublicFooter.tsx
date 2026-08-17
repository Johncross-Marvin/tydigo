import { Link } from "react-router-dom";
import { Recycle, Leaf } from "lucide-react";
import { FOOTER_GROUPS, LEGAL_LINKS, SOCIAL_LINKS, FEATURE_FLAGS } from "@/lib/site-config";

export function PublicFooter() {
  return (
    <footer className="bg-[#0A2F14] text-green-200">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Recycle className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xl font-bold text-white">
                Ty<span className="text-amber-400">digo</span>
              </span>
            </Link>
            <p className="text-sm text-green-300 leading-relaxed max-w-xs">
              Technology-enabled waste collection, recycling, and recovery for
              cleaner Nigerian cities.
            </p>
          </div>

          {/* Link groups */}
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="font-semibold text-white mb-4 text-sm">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-green-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-green-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social (only if verified) */}
        {FEATURE_FLAGS.socialLinks && SOCIAL_LINKS.length > 0 && (
          <div className="flex gap-3 mb-8">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-white text-sm"
              >
                {social.label}
              </a>
            ))}
          </div>
        )}

        <div className="border-t border-green-700/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-green-400">
          <p>
            &copy; {new Date().getFullYear()} Tydigo. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Built with <Leaf className="w-3.5 h-3.5 inline text-green-400" /> in Africa.
          </p>
        </div>
      </div>
    </footer>
  );
}
