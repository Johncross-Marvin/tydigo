/**
 * Tydigo KYC Service
 *
 * Manages KYC document uploads, verification status,
 * and admin review workflows.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────

export type KycDocument = {
  id: string;
  profile_id: string;
  document_type: "national_id" | "drivers_license" | "passport" | "voter_card" | "vehicle_registration";
  document_url: string;
  status: "pending" | "approved" | "rejected";
  reviewer_id?: string;
  review_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
};

export type KycStatus = {
  is_verified: boolean;
  documents: KycDocument[];
  pending_count: number;
  approved_count: number;
  rejected_count: number;
};

// ─── Upload KYC Document ──────────────────────────────────────

export async function uploadKycDocument(params: {
  profileId: string;
  documentType: KycDocument["document_type"];
  file: File;
}): Promise<KycDocument> {
  if (!isSupabaseAvailable() || !supabase) {
    throw new Error("KYC upload is not available in offline mode.");
  }

  // Upload file to storage
  const fileName = `kyc/${params.profileId}/${Date.now()}-${params.file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("kyc-documents")
    .upload(fileName, params.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from("kyc-documents")
    .getPublicUrl(uploadData.path);

  // Create KYC record
  const { data, error } = await supabase
    .from("kyc_documents")
    .insert({
      profile_id: params.profileId,
      document_type: params.documentType,
      document_url: urlData.publicUrl,
      status: "pending",
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`KYC record creation failed: ${error.message}`);
  if (!data) throw new Error("Failed to create KYC record.");

  return data as KycDocument;
}

// ─── Get KYC Status ───────────────────────────────────────────

export async function getKycStatus(profileId: string): Promise<KycStatus> {
  if (!isSupabaseAvailable() || !supabase) {
    return { is_verified: false, documents: [], pending_count: 0, approved_count: 0, rejected_count: 0 };
  }

  const { data, error } = await supabase
    .from("kyc_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("submitted_at", { ascending: false });

  if (error || !data) {
    return { is_verified: false, documents: [], pending_count: 0, approved_count: 0, rejected_count: 0 };
  }

  const docs = data as KycDocument[];
  return {
    is_verified: docs.some((d) => d.status === "approved"),
    documents: docs,
    pending_count: docs.filter((d) => d.status === "pending").length,
    approved_count: docs.filter((d) => d.status === "approved").length,
    rejected_count: docs.filter((d) => d.status === "rejected").length,
  };
}

// ─── Admin: List Pending KYC ──────────────────────────────────

export async function listPendingKyc(options?: {
  limit?: number;
  offset?: number;
}): Promise<KycDocument[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const { data, error } = await supabase
    .from("kyc_documents")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50) - 1);

  if (error || !data) return [];
  return data as KycDocument[];
}

// ─── Admin: Review KYC ────────────────────────────────────────

export async function reviewKyc(params: {
  documentId: string;
  status: "approved" | "rejected";
  reviewerId: string;
  notes?: string;
}): Promise<KycDocument> {
  if (!isSupabaseAvailable() || !supabase) {
    throw new Error("KYC review is not available in offline mode.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("kyc_documents")
    .update({
      status: params.status,
      reviewer_id: params.reviewerId,
      review_notes: params.notes ?? null,
      reviewed_at: now,
    })
    .eq("id", params.documentId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Review failed: ${error.message}`);
  if (!data) throw new Error("KYC document not found.");

  // If approved, update profile KYC status (kyc_status column, not kyc_verified)
  if (params.status === "approved") {
    await supabase
      .from("profiles")
      .update({ kyc_status: "approved", updated_at: now })
      .eq("id", data.profile_id);
  }

  return data as KycDocument;
}

// ─── Get KYC Stats (Admin) ────────────────────────────────────

export async function getKycStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  if (!isSupabaseAvailable() || !supabase) {
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }

  const { data, error } = await supabase
    .from("kyc_documents")
    .select("status");

  if (error || !data) return { total: 0, pending: 0, approved: 0, rejected: 0 };

  const docs = data as { status: string }[];
  return {
    total: docs.length,
    pending: docs.filter((d) => d.status === "pending").length,
    approved: docs.filter((d) => d.status === "approved").length,
    rejected: docs.filter((d) => d.status === "rejected").length,
  };
}
