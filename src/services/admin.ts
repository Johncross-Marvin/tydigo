/**
 * Tydigo Admin Service
 *
 * Admin operations: user management, pricing configuration,
 * platform KPIs, audit logs, and batch management.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import type { UserRole } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

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
  auth_user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: UserRole;
  kyc_verified: boolean;
  rating: number;
  total_pickups: number;
  ecopoints: number;
  created_at: string;
  last_login?: string;
  suspended: boolean;
};

export type PricingConfig = {
  id: string;
  name?: string;
  tier_name?: string;
  waste_type: string;
  min_kg: number;
  max_kg: number | null;
  base_price_ngn: number;
  per_kg_price_ngn: number;
  is_active?: boolean;
  active?: boolean;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
};

// ─── Platform KPIs ────────────────────────────────────────────

export async function getPlatformKpis(): Promise<PlatformKpi> {
  if (!isSupabaseAvailable() || !supabase) {
    return {
      totalUsers: 0,
      activeCollectors: 0,
      wasteCollectedKg: 0,
      totalPickups: 0,
      revenueNgn: 0,
      ecopointsIssued: 0,
      pendingKyc: 0,
    };
  }

  const [
    { count: totalUsers },
    { count: activeCollectors },
    { data: wasteData },
    { count: totalPickups },
    { data: revenueData },
    { data: ecopointsData },
    { count: pendingKyc },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["collector", "fleet_owner"]),
    supabase.from("pickup_requests").select("estimated_weight_kg").eq("status", "completed"),
    supabase.from("pickup_requests").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("amount_ngn").eq("status", "paid"),
    supabase.from("ecopoint_transactions").select("points").eq("status", "confirmed"),
    supabase.from("kyc_documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const wasteCollectedKg = (wasteData ?? []).reduce(
    (sum: number, r: { estimated_weight_kg?: number }) => sum + (r.estimated_weight_kg ?? 0),
    0,
  );
  const revenueNgn = (revenueData ?? []).reduce(
    (sum: number, r: { amount_ngn?: number }) => sum + (r.amount_ngn ?? 0),
    0,
  );
  const ecopointsIssued = (ecopointsData ?? []).reduce(
    (sum: number, r: { points?: number }) => sum + (r.points ?? 0),
    0,
  );

  return {
    totalUsers: totalUsers ?? 0,
    activeCollectors: activeCollectors ?? 0,
    wasteCollectedKg,
    totalPickups: totalPickups ?? 0,
    revenueNgn,
    ecopointsIssued,
    pendingKyc: pendingKyc ?? 0,
  };
}

// ─── User Management ──────────────────────────────────────────

export async function listUsers(options?: {
  search?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<AdminUser[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.or(
      `full_name.ilike.%${options.search}%,phone.ilike.%${options.search}%,email.ilike.%${options.search}%`,
    );
  }
  if (options?.role) {
    query = query.eq("role", options.role);
  }

  query = query.range(
    options?.offset ?? 0,
    (options?.offset ?? 0) + (options?.limit ?? 50) - 1,
  );

  const { data, error } = await query;
  if (error || !data) return [];
  return data as AdminUser[];
}

export async function suspendUser(userId: string, suspend: boolean): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("profiles")
    .update({ status: suspend ? "suspended" : "active", updated_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function getUserDetails(userId: string): Promise<AdminUser | null> {
  if (!isSupabaseAvailable() || !supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data as AdminUser | null;
}

// ─── Pricing Configuration ────────────────────────────────────

export async function getPricingConfigs(): Promise<PricingConfig[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("min_kg");

  if (error || !data) return [];
  return data as PricingConfig[];
}

export async function updatePricingConfig(
  configId: string,
  updates: Partial<Pick<PricingConfig, "base_price_ngn" | "per_kg_price_ngn" | "is_active" | "active">>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  // Map legacy `active` -> `is_active` for the pricing_rules table
  const dbUpdates: Record<string, unknown> = { ...updates };
  if (dbUpdates.active !== undefined) {
    dbUpdates.is_active = dbUpdates.active;
    delete dbUpdates.active;
  }

  await supabase
    .from("pricing_rules")
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq("id", configId);
}

export async function createPricingConfig(config: Omit<PricingConfig, "id" | "updated_at">): Promise<PricingConfig> {
  if (!isSupabaseAvailable() || !supabase) throw new Error("Not available offline.");

  const { data, error } = await supabase
    .from("pricing_rules")
    .insert({ ...config, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create pricing config.");
  return data as PricingConfig;
}

// ─── EcoPoints Configuration ──────────────────────────────────

export async function getEcopointsConfig(): Promise<{
  ecopoints_per_naira: number;
  max_discount_percent: number;
}> {
  if (!isSupabaseAvailable() || !supabase) {
    return { ecopoints_per_naira: 10, max_discount_percent: 50 };
  }

  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["ecopoints_per_naira", "max_discount_percent"]);

  const config: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: unknown }) => {
    config[row.key] = String(row.value);
  });

  return {
    ecopoints_per_naira: Number(config.ecopoints_per_naira) || 10,
    max_discount_percent: Number(config.max_discount_percent) || 50,
  };
}

export async function updateEcopointsConfig(config: {
  ecopoints_per_naira?: number;
  max_discount_percent?: number;
}): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  const entries = Object.entries(config).filter(([, v]) => v !== undefined);
  for (const [key, value] of entries) {
    await supabase
      .from("system_settings")
      .upsert(
        { key, value: String(value), value_type: "number", updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
  }
}

// ─── Audit Logs ───────────────────────────────────────────────

export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  targetType?: string;
  adminId?: string;
}): Promise<AuditLog[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  let query = supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.targetType) query = query.eq("target_type", options.targetType);
  if (options?.adminId) query = query.eq("admin_id", options.adminId);

  query = query.range(
    options?.offset ?? 0,
    (options?.offset ?? 0) + (options?.limit ?? 50) - 1,
  );

  const { data, error } = await query;
  if (error || !data) return [];
  return data as AuditLog[];
}

export async function createAuditLog(params: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase.from("admin_audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    details: params.details ?? {},
    created_at: new Date().toISOString(),
  });
}

// ─── Batch Management ─────────────────────────────────────────

export type WasteBatch = {
  id: string;
  batch_reference: string | null;
  partner_id: string | null;
  material_type: string;
  quantity_kg: number;
  quality_grade: string | null;
  contamination_pct: number | null;
  source_pickup_ids: string[] | null;
  source_zone: string | null;
  delivered_at: string | null;
  received_by: string | null;
  verified: boolean;
  proof_photos: string[] | null;
  status: string;
  custodian_profile_id: string | null;
  custodian_type: string | null;
  destination_type: string | null;
  destination_id: string | null;
  destination_assigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listBatches(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<WasteBatch[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  let query = supabase
    .from("waste_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);

  query = query.range(
    options?.offset ?? 0,
    (options?.offset ?? 0) + (options?.limit ?? 50) - 1,
  );

  const { data, error } = await query;
  if (error || !data) return [];
  return data as WasteBatch[];
}

export async function updateBatchStatus(
  batchId: string,
  status: string,
  updates?: Partial<WasteBatch>,
): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  await supabase
    .from("waste_batches")
    .update({ status, ...updates, updated_at: new Date().toISOString() })
    .eq("id", batchId);
}

// ─── Notification Broadcast ───────────────────────────────────

export async function broadcastNotification(params: {
  title: string;
  body: string;
  targetRoles?: UserRole[];
  targetUserIds?: string[];
}): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  if (params.targetUserIds?.length) {
    const notifications = params.targetUserIds.map((profileId) => ({
      profile_id: profileId,
      title: params.title,
      body: params.body,
      type: "system",
      data: {},
      read: false,
      created_at: new Date().toISOString(),
    }));

    await supabase.from("notifications").insert(notifications);
    return;
  }

  if (params.targetRoles?.length) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .in("role", params.targetRoles);

    if (users?.length) {
      const notifications = users.map((u: { id: string }) => ({
        profile_id: u.id,
        title: params.title,
        body: params.body,
        type: "system",
        data: {},
        read: false,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("notifications").insert(notifications);
    }
  }
}
