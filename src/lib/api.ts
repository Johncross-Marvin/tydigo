export type UserRole =
  | "customer"
  | "household"
  | "estate"
  | "business"
  | "collector"
  | "recycler"
  | "organic_partner"
  | "fleet_owner"
  | "corporate_partner"
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
  rating?: number | null;
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

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: "pickup_update" | "payment" | "ecopoints" | "system" | "kyc" | "promo";
  read: boolean;
  created_at: string;
};

export type KycDocument = {
  id: string;
  document_type: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes?: string;
  created_at: string;
};

export type PlatformKpi = {
  totalUsers: number;
  activeCollectors: number;
  wasteCollectedKg: number;
  totalPickups: number;
  revenueNgn: number;
  ecopointsIssued: number;
  pendingKyc: number;
};

export type AdminUser = {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: UserRole;
  kyc_verified: boolean;
  rating: number;
  total_pickups: number;
  ecopoints: number;
  created_at: string;
  suspended: boolean;
};

export type AuditLog = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown>;
  created_at: string;
};

export type WasteBatch = {
  id: string;
  pickup_id: string;
  waste_type: string;
  weight_kg: number;
  status: string;
  partner_id?: string;
  price_per_kg_ngn?: number;
  created_at: string;
};

export type CollectorJob = {
  id: string;
  pickup_code: string;
  waste_type: string;
  weight_kg: number;
  address: string;
  schedule_window: string;
  price_ngn: number;
  payment_status: string;
  status: string;
  distance_km?: number;
  customer_name: string;
  created_at: string;
};

export type FleetCollector = {
  id: string;
  full_name: string;
  phone: string;
  rating: number;
  total_pickups: number;
  active_job_id?: string;
  is_online: boolean;
  last_location?: { lat: number; lng: number };
};

export type ImpactReport = {
  total_waste_kg: number;
  recycled_kg: number;
  landfill_diverted_kg: number;
  carbon_offset_kg: number;
  trees_saved: number;
  period: string;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const SESSION_TOKEN_KEY = "tydigo_session_token";

export const roleHomePath: Record<UserRole, string> = {
  customer: "/household/dashboard",
  household: "/household/dashboard",
  estate: "/estate/dashboard",
  business: "/business/dashboard",
  collector: "/collector/dashboard",
  recycler: "/recycler/dashboard",
  organic_partner: "/organic/dashboard",
  fleet_owner: "/fleet/dashboard",
  corporate_partner: "/corporate/dashboard",
  government: "/government/dashboard",
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
  // ─── Auth ────────────────────────────────────────────────
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

  // ─── Dashboard ───────────────────────────────────────────
  dashboard: () => requestJson<DashboardData>("/api/dashboard"),

  // ─── Pickups ─────────────────────────────────────────────
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

  getPickup: (pickupId: string) =>
    requestJson<{ pickup: Pickup }>(`/api/pickups/${pickupId}`),

  updatePickupStatus: (pickupId: string, status: string, notes?: string) =>
    requestJson<{ pickup: Pickup }>(`/api/pickups/${pickupId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  assignCollector: (pickupId: string, collectorId: string) =>
    requestJson<{ pickup: Pickup }>(`/api/pickups/${pickupId}/assign`, {
      method: "POST",
      body: JSON.stringify({ collectorId }),
    }),

  // ─── Collector Jobs ──────────────────────────────────────
  listAvailableJobs: (lat?: number, lng?: number, radiusKm?: number) =>
    requestJson<{ jobs: CollectorJob[] }>("/api/collector/jobs", {
      method: "POST",
      body: JSON.stringify({ lat, lng, radiusKm }),
    }),

  acceptJob: (jobId: string) =>
    requestJson<{ job: CollectorJob }>(`/api/collector/jobs/${jobId}/accept`, {
      method: "POST",
    }),

  updateJobProgress: (jobId: string, status: string, data?: Record<string, unknown>) =>
    requestJson<{ job: CollectorJob }>(`/api/collector/jobs/${jobId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...data }),
    }),

  getMyJobs: () =>
    requestJson<{ jobs: CollectorJob[] }>("/api/collector/my-jobs"),

  // ─── Payments ────────────────────────────────────────────
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

  verifyPayment: (reference: string) =>
    requestJson<{ status: string; amountNgn: number }>(`/api/payments/verify/${reference}`),

  getPaymentHistory: () =>
    requestJson<{ payments: Array<{ reference: string; amountNgn: number; status: string; created_at: string }> }>("/api/payments/history"),

  // ─── Wallet ──────────────────────────────────────────────
  getWallet: () =>
    requestJson<{ wallet: { balanceNgn: number; totalEarnedNgn: number } }>("/api/wallet"),

  getWalletTransactions: (limit?: number) =>
    requestJson<{ transactions: Array<{ id: string; amountNgn: number; type: string; description: string; created_at: string }> }>(
      `/api/wallet/transactions?limit=${limit ?? 20}`,
    ),

  requestWithdrawal: (amountNgn: number, bankDetails: Record<string, string>) =>
    requestJson<{ withdrawal: { id: string; status: string } }>("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amountNgn, bankDetails }),
    }),

  // ─── EcoPoints ───────────────────────────────────────────
  getEcopointsBalance: () =>
    requestJson<{ balance: number; lifetime: number }>("/api/ecopoints/balance"),

  getEcopointsHistory: (limit?: number) =>
    requestJson<{ transactions: Array<{ id: string; points: number; reason: string; created_at: string }> }>(
      `/api/ecopoints/history?limit=${limit ?? 20}`,
    ),

  redeemEcopoints: (optionId: string) =>
    requestJson<{ redemption: { id: string; points: number; valueNgn: number; status: string } }>("/api/ecopoints/redeem", {
      method: "POST",
      body: JSON.stringify({ optionId }),
    }),

  // ─── Notifications ───────────────────────────────────────
  listNotifications: (limit?: number, unreadOnly?: boolean) =>
    requestJson<{ notifications: Notification[] }>(
      `/api/notifications?limit=${limit ?? 50}&unread=${unreadOnly ?? false}`,
    ),

  getUnreadCount: () =>
    requestJson<{ count: number }>("/api/notifications/unread-count"),

  markNotificationRead: (notificationId: string) =>
    requestJson<{ ok: true }>(`/api/notifications/${notificationId}/read`, { method: "POST" }),

  markAllNotificationsRead: () =>
    requestJson<{ ok: true }>("/api/notifications/read-all", { method: "POST" }),

  getNotificationPreferences: () =>
    requestJson<{ preferences: Record<string, boolean> }>("/api/notifications/preferences"),

  updateNotificationPreferences: (prefs: Record<string, boolean>) =>
    requestJson<{ ok: true }>("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),

  // ─── KYC ─────────────────────────────────────────────────
  getKycStatus: () =>
    requestJson<{ status: { isVerified: boolean; documents: KycDocument[] } }>("/api/kyc/status"),

  uploadKycDocument: (formData: FormData) =>
    requestJson<{ document: KycDocument }>("/api/kyc/upload", {
      method: "POST",
      body: formData,
    }),

  // ─── Partner Requests ────────────────────────────────────
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

  // ─── Fleet Management ────────────────────────────────────
  getFleetCollectors: () =>
    requestJson<{ collectors: FleetCollector[] }>("/api/fleet/collectors"),

  assignFleetJob: (jobId: string, collectorId: string) =>
    requestJson<{ ok: true }>(`/api/fleet/assign`, {
      method: "POST",
      body: JSON.stringify({ jobId, collectorId }),
    }),

  getFleetAnalytics: () =>
    requestJson<{
      totalCollectors: number;
      activeCollectors: number;
      totalJobs: number;
      completedJobs: number;
      totalRevenue: number;
      avgRating: number;
    }>("/api/fleet/analytics"),

  // ─── Business / Corporate ────────────────────────────────
  getBusinessLocations: () =>
    requestJson<{ locations: Array<{ id: string; address: string; label: string }> }>("/api/business/locations"),

  addBusinessLocation: (address: string, label: string) =>
    requestJson<{ location: { id: string; address: string; label: string } }>("/api/business/locations", {
      method: "POST",
      body: JSON.stringify({ address, label }),
    }),

  scheduleBulkPickup: (payload: {
    locationIds: string[];
    wasteType: string;
    weightKg: number;
    scheduleWindow: string;
    frequency?: "once" | "daily" | "weekly" | "monthly";
  }) =>
    requestJson<{ pickups: Pickup[] }>("/api/business/bulk-pickup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getImpactReport: (period?: string) =>
    requestJson<{ report: ImpactReport }>(`/api/business/impact?period=${period ?? "month"}`),

  // ─── Admin ───────────────────────────────────────────────
  adminOverview: () =>
    requestJson<{
      kpis: PlatformKpi;
      pendingKyc: Array<{ id: string; name: string; role: string; document_type: string; created_at: string }>;
    }>("/api/admin/overview"),

  adminListUsers: (search?: string, role?: UserRole, limit?: number, offset?: number) =>
    requestJson<{ users: AdminUser[]; total: number }>(
      `/api/admin/users?search=${search ?? ""}&role=${role ?? ""}&limit=${limit ?? 50}&offset=${offset ?? 0}`,
    ),

  adminSuspendUser: (userId: string, suspend: boolean) =>
    requestJson<{ ok: true }>(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ suspend }),
    }),

  adminReviewKyc: (documentId: string, status: "approved" | "rejected", notes?: string) =>
    requestJson<{ ok: true }>(`/api/admin/kyc/${documentId}/review`, {
      method: "POST",
      body: JSON.stringify({ status, notes }),
    }),

  adminGetPricing: () =>
    requestJson<{ configs: Array<{ id: string; waste_type: string; tier_name: string; base_price_ngn: number; per_kg_price_ngn: number; active: boolean }> }>("/api/admin/pricing"),

  adminUpdatePricing: (configId: string, updates: Record<string, unknown>) =>
    requestJson<{ ok: true }>(`/api/admin/pricing/${configId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  adminGetAuditLogs: (limit?: number, offset?: number) =>
    requestJson<{ logs: AuditLog[]; total: number }>(
      `/api/admin/audit-logs?limit=${limit ?? 50}&offset=${offset ?? 0}`,
    ),

  adminListBatches: (status?: string) =>
    requestJson<{ batches: WasteBatch[] }>(`/api/admin/batches?status=${status ?? ""}`),

  adminBroadcastNotification: (payload: { title: string; body: string; targetRoles?: UserRole[] }) =>
    requestJson<{ ok: true }>("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ─── Onboarding ──────────────────────────────────────────

  getOnboardingJourney: (role: UserRole) =>
    requestJson<{
      journey: { id: string; role: string; title: string; description: string | null; is_active: boolean };
      steps: Array<{
        id: string; step_number: number; title: string; subtitle: string | null;
        description: string | null; icon: string | null; illustration: string | null;
        video_url: string | null; estimated_minutes: number; action_type: string;
        action_value: string | null; is_required: boolean; sort_order: number;
      }>;
      progress: Array<{
        id: string; step_id: string; completed: boolean; completed_at: string | null;
        time_spent: number; skipped: boolean;
      }>;
      completionPct: number;
      completedCount: number;
      totalSteps: number;
      estimatedMinutes: number;
    }>(`/api/onboarding/journey?role=${role}`),

  completeOnboardingStep: (stepId: string, timeSpent?: number) =>
    requestJson<{ ok: true; completedAt: string }>("/api/onboarding/complete-step", {
      method: "POST",
      body: JSON.stringify({ stepId, timeSpent }),
    }),

  skipOnboardingStep: (stepId: string) =>
    requestJson<{ ok: true }>("/api/onboarding/skip-step", {
      method: "POST",
      body: JSON.stringify({ stepId }),
    }),

  grantOnboardingReward: (points: number, reason: string) =>
    requestJson<{ ok: true; pointsAwarded: number }>("/api/onboarding/grant-reward", {
      method: "POST",
      body: JSON.stringify({ points, reason }),
    }),

  getOnboardingProgress: () =>
    requestJson<{
      completed: boolean;
      completionPct: number;
      completedCount: number;
      totalSteps: number;
    }>("/api/onboarding/progress"),

  // ─── Government ──────────────────────────────────────────
  getRegionalAnalytics: () =>
    requestJson<{
      regions: Array<{ name: string; wasteCollectedKg: number; recyclingRate: number; activeCollectors: number }>;
    }>("/api/government/regional"),

  getComplianceData: () =>
    requestJson<{
      registeredCollectors: number;
      licensedOperators: number;
      complianceRate: number;
    }>("/api/government/compliance"),

  getEnvironmentalImpact: () =>
    requestJson<{
      totalWasteDivertedKg: number;
      recyclingRate: number;
      carbonOffsetKg: number;
      landfillSavedKg: number;
    }>("/api/government/environmental"),

  generatePublicReport: (period?: string) =>
    requestJson<{ reportUrl: string }>("/api/government/report", {
      method: "POST",
      body: JSON.stringify({ period: period ?? "month" }),
    }),
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
