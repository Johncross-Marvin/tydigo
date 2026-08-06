/**
 * Tydigo Offline Service
 *
 * IndexedDB-backed persistence for onboarding progress, offline queue,
 * and cross-device sync support. Ensures onboarding works without
 * internet and syncs when connectivity returns.
 */

const DB_NAME = "tydigo_offline";
const DB_VERSION = 1;

type OfflineAction = {
  id: string;
  action: "complete_step" | "skip_step" | "grant_reward";
  payload: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
};

type CachedState = {
  profileId: string;
  journeyId: string;
  currentStepIdx: number;
  completionPct: number;
  updatedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("offline_queue")) {
        db.createObjectStore("offline_queue", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("cached_state")) {
        db.createObjectStore("cached_state", { keyPath: "profileId" });
      }

      if (!db.objectStoreNames.contains("cached_journeys")) {
        db.createObjectStore("cached_journeys", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Offline Queue ────────────────────────────────────────

export async function enqueueOfflineAction(action: Omit<OfflineAction, "id" | "timestamp" | "synced">): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("offline_queue", "readwrite");
    const store = tx.objectStore("offline_queue");

    const record: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false,
    };

    store.add(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB not available (SSR or private browsing)
  }
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction("offline_queue", "readonly");
    const store = tx.objectStore("offline_queue");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function markOfflineActionSynced(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("offline_queue", "readwrite");
    const store = tx.objectStore("offline_queue");
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // noop
  }
}

export async function syncOfflineQueue(
  syncFn: (action: OfflineAction) => Promise<void>,
): Promise<number> {
  const queue = await getOfflineQueue();
  let synced = 0;

  for (const action of queue) {
    try {
      await syncFn(action);
      await markOfflineActionSynced(action.id);
      synced++;
    } catch {
      // Will retry on next sync
    }
  }

  return synced;
}

// ─── Cached State ─────────────────────────────────────────

export async function cacheOnboardingState(state: CachedState): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("cached_state", "readwrite");
    const store = tx.objectStore("cached_state");
    store.put({ ...state, updatedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // noop
  }
}

export async function getCachedState(profileId: string): Promise<CachedState | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("cached_state", "readonly");
    const store = tx.objectStore("cached_state");
    const request = store.get(profileId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

// ─── Cached Journeys ──────────────────────────────────────

export async function cacheJourney(journey: Record<string, unknown>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("cached_journeys", "readwrite");
    const store = tx.objectStore("cached_journeys");
    store.put({ ...journey, cachedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // noop
  }
}

export async function getCachedJourney(id: string): Promise<Record<string, unknown> | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("cached_journeys", "readonly");
    const store = tx.objectStore("cached_journeys");
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

// ─── Online Status ────────────────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onOnlineChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback(navigator.onLine);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);

  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}
