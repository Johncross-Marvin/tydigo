/**
 * Tydigo Storage Service
 *
 * Handles file uploads to Supabase Storage buckets.
 * Falls back to mock (local object URLs) when Supabase is not configured.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// ─── Bucket Names ─────────────────────────────────────────────

export const BUCKETS = {
  WASTE_PHOTOS: "waste-photos",
  PICKUP_PROOF: "pickup-proof",
  KYC_DOCUMENTS: "kyc-documents",
  AVATARS: "avatars",
  PARTNER_PROOF: "partner-proof",
  COMPLAINT_EVIDENCE: "complaint-evidence",
} as const;

// ─── Upload ───────────────────────────────────────────────────

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<{ url: string; path: string }> {
  if (isSupabaseAvailable() && supabase) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

      // For private buckets, use signed URLs
    const isPrivate = bucket === BUCKETS.KYC_DOCUMENTS || bucket === BUCKETS.COMPLAINT_EVIDENCE;
    let url: string;

    if (isPrivate) {
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 3600); // 1 hour
      url = signedData?.signedUrl || "";
    } else {
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      url = publicData.publicUrl;
    }

    return { url, path: data.path };
  }

  // Mock fallback — create local object URL
  const objectUrl = URL.createObjectURL(file);
  return { url: objectUrl, path: `mock/${Date.now()}-${file.name}` };
}

// ─── Upload Waste Photo ───────────────────────────────────────

export async function uploadWastePhoto(
  userId: string,
  pickupId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const fileName = `${userId}/${pickupId}/${Date.now()}-${file.name}`;
  return uploadFile(BUCKETS.WASTE_PHOTOS, fileName, file);
}

// ─── Upload Pickup Proof ──────────────────────────────────────

export async function uploadPickupProof(
  collectorId: string,
  pickupId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const sanitizedExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const uuid = crypto.randomUUID();
  const fileName = `${collectorId}/${pickupId}/${uuid}.${sanitizedExt}`;
  return uploadFile(BUCKETS.PICKUP_PROOF, fileName, file);
}

// ─── Upload Draft Photo ───────────────────────────────────────

export async function uploadDraftPhoto(
  userId: string,
  draftId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const sanitizedExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const uuid = crypto.randomUUID();
  const fileName = `drafts/${userId}/${draftId}/${uuid}.${sanitizedExt}`;
  return uploadFile(BUCKETS.WASTE_PHOTOS, fileName, file);
}

// ─── Associate Draft Photos with Pickup ───────────────────────

export async function associateDraftPhotos(
  userId: string,
  draftId: string,
  pickupId: string,
): Promise<string[]> {
  if (!isSupabaseAvailable() || !supabase) return [];

  const draftPrefix = `drafts/${userId}/${draftId}/`;
  const targetPrefix = `${userId}/${pickupId}/`;

  // List all draft files
  const { data: files } = await supabase.storage
    .from(BUCKETS.WASTE_PHOTOS)
    .list(draftPrefix);

  if (!files?.length) return [];

  const newPaths: string[] = [];

  for (const file of files) {
    const oldPath = `${draftPrefix}${file.name}`;
    const newPath = `${targetPrefix}${file.name}`;

    // Copy file to canonical path
    const { error: copyError } = await supabase.storage
      .from(BUCKETS.WASTE_PHOTOS)
      .copy(oldPath, newPath);

    if (!copyError) {
      newPaths.push(newPath);

      // Record in pickup_images
      await supabase.from("pickup_images").insert({
        pickup_request_id: pickupId,
        storage_path: newPath,
        bucket: BUCKETS.WASTE_PHOTOS,
        uploaded_by: userId,
        created_at: new Date().toISOString(),
      });

      // Delete draft file
      await supabase.storage
        .from(BUCKETS.WASTE_PHOTOS)
        .remove([oldPath]);
    }
  }

  return newPaths;
}

// ─── Upload Avatar ────────────────────────────────────────────

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/avatar-${Date.now()}.${ext}`;
  return uploadFile(BUCKETS.AVATARS, fileName, file);
}

// ─── Delete File ──────────────────────────────────────────────

export async function deleteFile(
  bucket: string,
  path: string,
): Promise<void> {
  if (isSupabaseAvailable() && supabase) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return;
  }

  // For mock URLs created via createObjectURL, we can't really delete them
  console.log("[Tydigo Storage] Mock delete (no-op):", path);
}

// ─── Get Signed URL ───────────────────────────────────────────

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  if (isSupabaseAvailable() && supabase) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  return path; // Mock — return path as-is (it's an object URL)
}
