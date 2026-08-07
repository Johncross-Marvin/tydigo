-- Migration: Storage Bucket RLS Policies
-- Configures storage bucket policies for all canonical buckets.
-- All waste/pickup evidence buckets are PRIVATE with signed URL access.
-- Avatars are public (intentionally exposed).

BEGIN;

-- =====================================================================
-- BUCKET: waste-photos (PRIVATE)
-- Customer waste photos — may reveal home environment, people, documents.
-- =====================================================================

-- Upload policy: authenticated users can upload to their own prefix
CREATE POLICY "waste_photos_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'waste-photos'
  AND (
    -- Customer uploads to their own profile prefix
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Draft uploads to drafts/{user_id}/...
    ((storage.foldername(name))[1] = 'drafts' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Read policy: customer reads own photos, assigned collector reads related pickup photos
CREATE POLICY "waste_photos_read_authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'waste-photos'
  AND (
    -- Owner access
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Draft owner
    ((storage.foldername(name))[1] = 'drafts' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR
    -- Assigned collector for the pickup
    EXISTS (
      SELECT 1 FROM pickup_requests pr
      JOIN profiles p ON p.id = pr.collector_id
      WHERE p.auth_user_id = auth.uid()
        AND (storage.foldername(name))[2] = pr.id::text
        AND pr.status IN ('collector_assigned', 'collector_en_route', 'collector_arrived', 'pickup_verified', 'waste_picked', 'in_transit_to_destination', 'delivered_to_partner', 'completed')
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Delete policy: only owner can delete draft photos
CREATE POLICY "waste_photos_delete_own_drafts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'waste-photos'
  AND (storage.foldername(name))[1] = 'drafts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- =====================================================================
-- BUCKET: pickup-proof (PRIVATE)
-- Collector proof of collection/delivery.
-- =====================================================================

CREATE POLICY "pickup_proof_upload_collector"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pickup-proof'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "pickup_proof_read_authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pickup-proof'
  AND (
    -- Collector who uploaded
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Customer whose pickup this proof belongs to
    EXISTS (
      SELECT 1 FROM pickup_requests pr
      JOIN profiles p ON p.id = pr.customer_id
      WHERE p.auth_user_id = auth.uid()
        AND (storage.foldername(name))[2] = pr.id::text
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- =====================================================================
-- BUCKET: kyc-documents (PRIVATE)
-- Identity documents — highly sensitive.
-- =====================================================================

CREATE POLICY "kyc_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "kyc_read_own_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- =====================================================================
-- BUCKET: avatars (PUBLIC)
-- Display avatars — intentionally public.
-- =====================================================================

CREATE POLICY "avatars_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_read_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================
-- BUCKET: partner-proof (PRIVATE)
-- Recycler/partner evidence.
-- =====================================================================

CREATE POLICY "partner_proof_upload_authorized"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'partner-proof'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('recycler', 'organic_partner', 'corporate_partner', 'admin')
  )
);

CREATE POLICY "partner_proof_read_authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'partner-proof'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('recycler', 'organic_partner', 'corporate_partner', 'admin', 'government')
  )
);

-- =====================================================================
-- BUCKET: complaint-evidence (PRIVATE)
-- Dispute/support evidence.
-- =====================================================================

CREATE POLICY "complaint_evidence_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'complaint-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "complaint_evidence_read_own_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'complaint-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'government')
    )
  )
);

COMMIT;
