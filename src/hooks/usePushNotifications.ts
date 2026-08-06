import { useState, useEffect, useCallback } from "react";
import { hasVapidKey, VAPID_PUBLIC_KEY, ENABLE_PUSH_NOTIFICATIONS } from "@/lib/env";

type PushState = {
  supported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  error: string | null;
};

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

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "default",
    subscription: null,
    error: null,
  });

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setState((prev) => ({ ...prev, supported }));

    if (supported && "permission" in Notification) {
      setState((prev) => ({ ...prev, permission: Notification.permission }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      setState((prev) => ({ ...prev, error: "Notifications not supported." }));
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Permission request failed.",
      }));
      return "denied";
    }
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.supported || !ENABLE_PUSH_NOTIFICATIONS || !hasVapidKey()) {
      setState((prev) => ({ ...prev, error: "Push notifications not configured." }));
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setState((prev) => ({ ...prev, subscription, error: null }));
      return subscription;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Subscription failed.",
      }));
      return null;
    }
  }, [state.supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return false;

    try {
      await state.subscription.unsubscribe();
      setState((prev) => ({ ...prev, subscription: null }));
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unsubscribe failed.",
      }));
      return false;
    }
  }, [state.subscription]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/icons/icon-192x192.svg",
          badge: "/icons/badge-72x72.svg",
          ...options,
        });
      });
    }
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
