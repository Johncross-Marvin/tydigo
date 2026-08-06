export type UserRole =
  | "customer"
  | "household"
  | "estate"
  | "business"
  | "collector"
  | "recycler"
  | "organic_partner"
  | "fleet"
  | "corporate"
  | "government"
  | "partner"
  | "admin";

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  address?: string;
  city?: string;
  state?: string;
  ecopoints?: number;
  rating?: number;
};

export type Pickup = {
  id: string;
  waste_type: string;
  weight_kg: number;
  address: string;
  schedule_window: string;
  payment_method: string;
  payment_status: string;
  price_ngn: number;
  status: string;
  pickup_code: string;
  collector_name: string;
  eta_minutes?: number | null;
  created_at: string;
  updated_at: string;
};

export type PartnerMaterialRequest = {
  id: string;
  material: string;
  quantity_kg: number;
  price_per_kg_ngn: number;
  delivery_address: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DashboardData = {
  user: AuthUser;
  stats: {
    ecopoints: number;
    totalPickups: number;
    wasteRecycledKg: number;
    rating: number;
  };
  activePickup?: Pickup | null;
  recentPickups: Pickup[];
  partnerRequests: PartnerMaterialRequest[];
  challenges: Array<{ title: string; progress: number; points: number }>;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const SESSION_TOKEN_KEY = "tydigo_session_token";

export const roleHomePath: Record<UserRole, string> = {
  customer: "/household/dashboard",
  household: "/household/dashboard",
  estate: "/business/dashboard",
  business: "/business/dashboard",
  collector: "/collector/dashboard",
  recycler: "/partner/dashboard",
  organic_partner: "/partner/dashboard",
  fleet: "/collector/dashboard",
  corporate: "/business/dashboard",
  government: "/admin/dashboard",
  partner: "/partner/dashboard",
  admin: "/admin/dashboard",
};

export function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getSessionToken();
  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) clearSessionToken();
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export const api = {
  startAuth: (payload: { mode: "signin" | "signup"; phone: string; name?: string; role?: UserRole }) =>
    requestJson<{
      verificationId: string;
      maskedPhone: string;
      expiresInSeconds: number;
      delivery: string;
      verificationCode?: string;
    }>("/api/auth/start", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    }),

  verifyAuth: (payload: { verificationId: string; code: string }) =>
    requestJson<{ token: string; user: AuthUser }>("/api/auth/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    }),

  logout: () =>
    requestJson<{ ok: true }>("/api/auth/logout", {
      method: "POST",
    }),

  me: () => requestJson<{ user: AuthUser }>("/api/me"),

  updateMe: (payload: Partial<AuthUser> & { adminInviteCode?: string }) =>
    requestJson<{ user: AuthUser }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  dashboard: () => requestJson<DashboardData>("/api/dashboard"),

  listPickups: () => requestJson<{ pickups: Pickup[] }>("/api/pickups"),

  createPickup: (payload: {
    wasteType: string;
    weightKg: number;
    address: string;
    scheduleWindow: string;
    paymentMethod: string;
  }) =>
    requestJson<{ pickup: Pickup }>("/api/pickups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createPayment: (payload: { pickupId: string; method: string }) =>
    requestJson<{
      payment: { reference: string; amountNgn: number; status: string };
      pickup: Pickup;
      pointsEarned: number;
      alreadyPaid?: boolean;
    }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listPartnerRequests: () => requestJson<{ requests: PartnerMaterialRequest[] }>("/api/partner-requests"),

  createPartnerRequest: (payload: {
    material: string;
    quantityKg: number;
    pricePerKgNgn: number;
    deliveryAddress: string;
  }) =>
    requestJson<{ request: PartnerMaterialRequest }>("/api/partner-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminOverview: () =>
    requestJson<{
      kpis: {
        totalUsers: number;
        activeCollectors: number;
        wasteCollectedKg: number;
        pickups: number;
        revenueNgn: number;
        ecopointsIssued: number;
        pendingKyc: number;
      };
      pendingKyc: Array<{ id: string; name: string; role: string; document_type: string; created_at: string }>;
    }>("/api/admin/overview"),
};

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWeight(value: number) {
  return `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(value)} kg`;
}
