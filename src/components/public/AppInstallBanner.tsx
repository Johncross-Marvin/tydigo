import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Recycle } from "lucide-react";
import {
  listenForInstallPrompt,
  showInstallPrompt,
  getInstallInstructions,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";
import { FEATURE_FLAGS } from "@/lib/site-config";

/**
 * Pre-footer app install callout. Uses the PWA beforeinstallprompt when
 * available; otherwise shows iOS "Add to Home Screen" guidance. Native
 * store badges are hidden until real URLs are configured.
 */
export function AppInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect standalone/installed state
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const cleanup = listenForInstallPrompt(
      (e) => setDeferredPrompt(e),
      () => setDeferredPrompt(null),
    );
    return cleanup;
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      const result = await showInstallPrompt();
      if (result?.outcome === "accepted") {
        setDeferredPrompt(null);
      } else {
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0A2F14] rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 items-center">
            <div className="p-8 sm:p-12">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-green-300">Install Tydigo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                Get the Tydigo app
              </h2>
              <p className="text-green-200 mb-6 max-w-md">
                Install Tydigo on your device for faster access, offline
                support, and a smoother experience.
              </p>
              <Button
                onClick={handleInstall}
                className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A2F14] font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Install now
              </Button>

              {/* Native store badges hidden until real URLs configured */}
              {FEATURE_FLAGS.appStoreLinks && (
                <div className="flex gap-3 mt-4">
                  {/* Store badges would render here when configured */}
                </div>
              )}
            </div>

            {/* Device visual placeholder */}
            <div className="hidden md:flex items-center justify-center p-8">
              <div className="w-48 h-80 rounded-[2rem] bg-white/10 border border-white/15 flex items-center justify-center">
                <Recycle className="w-12 h-12 text-green-300/50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS instructions */}
      {showInstructions && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6">
            <h3 className="font-bold text-neutral-900 mb-2">Install Tydigo</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {getInstallInstructions()?.platform === "ios"
                ? "On iPhone, tap the Share button and choose 'Add to Home Screen'."
                : "Use your browser's menu to install Tydigo on your device."}
            </p>
            <Button
              onClick={() => setShowInstructions(false)}
              className="w-full rounded-xl bg-[#145C25] hover:bg-[#0F4A1E] text-white"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
