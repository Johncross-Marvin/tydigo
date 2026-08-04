/**
 * PWA Service Worker Registration
 *
 * Registers the service worker and provides utilities for
 * install prompts, push notifications, and background sync.
 */

// ─── Service Worker Registration ────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.log("[Tydigo PWA] Service workers not supported in this browser.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[Tydigo PWA] Service worker registered:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("[Tydigo PWA] New content available — refresh to update.");
          // Dispatch a custom event so the UI can show an update banner
          window.dispatchEvent(new CustomEvent("sw-update-available"));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error("[Tydigo PWA] Service worker registration failed:", error);
    return null;
  }
}

export function listenForServiceWorkerUpdates(callback: () => void) {
  window.addEventListener("sw-update-available", callback);
  return () => window.removeEventListener("sw-update-available", callback);
}

// ─── Install Prompt ─────────────────────────────────────────

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function listenForInstallPrompt(
  onAvailable: () => void,
  onDismissed?: () => void
): () => void {
  const handler = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    onAvailable();
  };

  window.addEventListener("beforeinstallprompt", handler);

  window.addEventListener("appinstalled", () => {
    console.log("[Tydigo PWA] App installed successfully.");
    deferredPrompt = null;
  });

  return () => {
    window.removeEventListener("beforeinstallprompt", handler);
  };
}

export async function showInstallPrompt(): Promise<{
  outcome: "accepted" | "dismissed";
  platform: string;
} | null> {
  if (!deferredPrompt) {
    return null;
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice;
  } catch (error) {
    console.error("[Tydigo PWA] Install prompt failed:", error);
    return null;
  }
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

export function getInstallInstructions(): {
  platform: string;
  steps: string[];
} | null {
  const ua = navigator.userAgent.toLowerCase();

  // iOS Safari
  if (/iphone|ipad/.test(ua) && /safari/.test(ua) && !/crios/.test(ua)) {
    return {
      platform: "iOS Safari",
      steps: [
        'Tap the <strong>Share</strong> button in Safari\'s toolbar (the square with an arrow).',
        'Scroll down and tap <strong>"Add to Home Screen"</strong>.',
        'Tap <strong>"Add"</strong> in the top right.',
      ],
    };
  }

  // Android Chrome
  if (/android/.test(ua) && /chrome/.test(ua)) {
    return {
      platform: "Android Chrome",
      steps: [
        'Tap the <strong>⋮</strong> menu in the top right.',
        'Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.',
        'Follow the on-screen instructions.',
      ],
    };
  }

  // Desktop Chrome / Edge
  if (/chrome|edg/.test(ua)) {
    return {
      platform: "Desktop Browser",
      steps: [
        'Click the <strong>Install</strong> icon (⊕) in the address bar.',
        'Click <strong>"Install"</strong> in the dialog.',
      ],
    };
  }

  return null;
}

// ─── Push Notifications ─────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPushNotifications(
  serviceWorkerRegistration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) {
    console.log("[Tydigo PWA] Push messaging not supported.");
    return null;
  }

  try {
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log("[Tydigo PWA] Push subscription created:", subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error("[Tydigo PWA] Push subscription failed:", error);
    return null;
  }
}

export async function getExistingPushSubscription(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;
  return serviceWorkerRegistration.pushManager.getSubscription();
}

export async function unsubscribeFromPushNotifications(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<boolean> {
  const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
  if (!subscription) return true;

  try {
    await subscription.unsubscribe();
    console.log("[Tydigo PWA] Unsubscribed from push notifications.");
    return true;
  } catch (error) {
    console.error("[Tydigo PWA] Unsubscribe failed:", error);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ─── Network Status ─────────────────────────────────────────

export type NetworkStatus = "online" | "offline";

export function listenForNetworkChanges(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const onlineHandler = () => onOnline();
  const offlineHandler = () => onOffline();

  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  return () => {
    window.removeEventListener("online", onlineHandler);
    window.removeEventListener("offline", offlineHandler);
  };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

// ─── Background Sync ────────────────────────────────────────

export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    console.log("[Tydigo PWA] Background sync not supported.");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // SyncManager is not fully typed in all TS libs
    const syncReg = registration as ServiceWorkerRegistration & {
      sync: { register: (tag: string) => Promise<void> };
    };
    if (!syncReg.sync) {
      console.log("[Tydigo PWA] Background sync not supported.");
      return false;
    }
    await syncReg.sync.register(tag);
    console.log(`[Tydigo PWA] Background sync registered: ${tag}`);
    return true;
  } catch (error) {
    console.error(`[Tydigo PWA] Background sync failed: ${tag}`, error);
    return false;
  }
}
