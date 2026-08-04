/* ============================================================
 * Tydigo Service Worker
 * ============================================================
 * Handles:
 *   - App shell caching
 *   - Static asset caching
 *   - Offline fallback
 *   - Network-first for API calls
 *   - Background sync preparation
 * 
 * SECURITY: Never caches authenticated API responses,
 * KYC documents, payment data, or private user files.
 * ============================================================ */

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `tydigo-app-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `tydigo-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";

// Assets to cache immediately on install (app shell)
const APP_SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/site.webmanifest",
  "/favicon.ico",
];

// Static asset patterns to cache on fetch
const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".woff2",
  ".woff",
  ".ico",
];

// Paths that should NEVER be cached
const NEVER_CACHE = [
  "/api/",
  "/rest/v1/",
  "/auth/v1/",
  "/storage/v1/",
];

// ─── Helpers ────────────────────────────────────────────────

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

function isApiRequest(url) {
  return NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix));
}

function isNavigation(request) {
  return request.mode === "navigate";
}

// ─── Install ────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  console.log("[Tydigo SW] Installing...");
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log("[Tydigo SW] Caching app shell...");
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log("[Tydigo SW] App shell cached.");
        return self.skipWaiting();
      })
  );
});

// ─── Activate ───────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  console.log("[Tydigo SW] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith("tydigo-") && name !== APP_SHELL_CACHE && name !== STATIC_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => {
        console.log("[Tydigo SW] Old caches cleaned.");
        return self.clients.claim();
      })
  );
});

// ─── Fetch ──────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept API or Supabase requests
  if (isApiRequest(url)) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (isNavigation(event.request)) {
    event.respondWith(
      networkFirstWithOfflineFallback(event.request, OFFLINE_PAGE)
    );
    return;
  }

  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(event.request));
    return;
  }
});

// ─── Strategies ─────────────────────────────────────────────

/**
 * Network-first strategy with offline fallback for navigation.
 * Tries network first, falls back to cache, then to offline page.
 */
async function networkFirstWithOfflineFallback(request, fallbackPath) {
  try {
    const networkResponse = await fetch(request);
    // Cache a copy for offline use
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return the offline fallback page
    const fallback = await caches.match(fallbackPath);
    if (fallback) {
      return fallback;
    }
    return new Response("You are offline. Please check your connection.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Cache-first strategy for static assets.
 * Serves from cache if available, otherwise fetches and caches.
 */
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If the request is for an image, return a placeholder
    if (request.destination === "image") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />',
        {
          status: 200,
          headers: { "Content-Type": "image/svg+xml" },
        }
      );
    }
    throw error;
  }
}

// ─── Push Notifications ─────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: payload.tag || "tydigo-notification",
      data: {
        url: payload.url || "/",
        ...payload.data,
      },
      vibrate: [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(
        payload.title || "Tydigo",
        options
      )
    );
  } catch {
    // Fallback for plain text notifications
    event.waitUntil(
      self.registration.showNotification("Tydigo", {
        body: event.data.text(),
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If a window is already open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            return client.navigate(urlToOpen);
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ─── Background Sync ────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pickup-drafts") {
    event.waitUntil(syncPickupDrafts());
  }
  if (event.tag === "sync-payment-verification") {
    event.waitUntil(syncPaymentVerification());
  }
});

async function syncPickupDrafts() {
  // Placeholder: In production, this reads from IndexedDB
  // and posts draft pickups to the API
  console.log("[Tydigo SW] Background sync: pickup drafts");
  // TODO: Implement IndexedDB draft sync
}

async function syncPaymentVerification() {
  console.log("[Tydigo SW] Background sync: payment verification");
  // TODO: Implement payment verification sync
}

// ─── Message Handling ───────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[Tydigo SW] Service Worker registered.");
