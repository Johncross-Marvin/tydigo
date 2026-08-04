import { useState, useEffect, useCallback } from "react";
import {
  listenForInstallPrompt,
  showInstallPrompt,
  getInstallInstructions,
  isOnline as checkOnline,
  listenForNetworkChanges,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Wifi, WifiOff, X, Share2 } from "lucide-react";

const INSTALL_DISMISSED_KEY = "tydigo_install_dismissed";

// ─── Install Prompt Banner ──────────────────────────────────

export function InstallPromptBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState<{
    platform: string;
    steps: string[];
  } | null>(null);

  useEffect(() => {
    // Don't show if previously dismissed
    if (localStorage.getItem(INSTALL_DISMISSED_KEY)) {
      return;
    }

    const cleanup = listenForInstallPrompt(
      () => setShowBanner(true),
      () => setShowBanner(false)
    );

    return cleanup;
  }, []);

  const handleInstall = useCallback(async () => {
    const result = await showInstallPrompt();
    if (result?.outcome === "accepted") {
      setShowBanner(false);
    } else if (result?.outcome === "dismissed") {
      // Show manual instructions as fallback
      const instr = getInstallInstructions();
      if (instr) {
        setInstructions(instr);
        setShowInstructions(true);
      }
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  }, []);

  const handleShowInstructions = useCallback(() => {
    const instr = getInstallInstructions();
    if (instr) {
      setInstructions(instr);
      setShowInstructions(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <>
      {/* Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-brand rounded-2xl p-4 shadow-brand-lg flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Install Tydigo</p>
            <p className="text-white/80 text-xs mt-0.5">
              Add to Home Screen for quick access
            </p>
          </div>
          <Button
            size="sm"
            className="bg-white text-brand-600 hover:bg-white/90 font-semibold text-xs h-9"
            onClick={handleInstall}
          >
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/60 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Manual Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-brand-500" />
              Install Tydigo
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install Tydigo on your{" "}
              {instructions?.platform}:
            </DialogDescription>
          </DialogHeader>
          {instructions && (
            <ol className="space-y-3 mt-2">
              {instructions.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span
                    className="text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: step }}
                  />
                </li>
              ))}
            </ol>
          )}
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setShowInstructions(false)}
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Offline Banner ─────────────────────────────────────────

export function OfflineBanner() {
  const [offline, setOffline] = useState(!checkOnline());

  useEffect(() => {
    const cleanup = listenForNetworkChanges(
      () => setOffline(false),
      () => setOffline(true)
    );
    return cleanup;
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white">
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You're offline — changes will sync when connected</span>
        <Wifi className="h-4 w-4 opacity-0" />
      </div>
    </div>
  );
}

// ─── Network Status Hook ────────────────────────────────────

export function useNetworkStatus() {
  const [online, setOnline] = useState(checkOnline());

  useEffect(() => {
    const cleanup = listenForNetworkChanges(
      () => setOnline(true),
      () => setOnline(false)
    );
    return cleanup;
  }, []);

  return online;
}

// ─── Update Available Banner ────────────────────────────────

export function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-brand-500 text-white">
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
        <span>A new version is available.</span>
        <button
          onClick={() => window.location.reload()}
          className="underline font-semibold"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
