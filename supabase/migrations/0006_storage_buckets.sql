-- ============================================================================
-- Tydigo Storage Buckets & Policies
-- ============================================================================
-- Storage buckets must be created via Supabase Dashboard or Management API.
-- This migration documents the required bucket configuration.
--
-- Buckets to create:
--   1. waste-photos       — public read, authenticated upload
--   2. pickup-proof       — public read, authenticated upload
--   3. kyc-documents      — private, authenticated upload, owner-only read
--   4. avatars            — public read, authenticated upload
--   5. partner-proof      — public read, authenticated upload
--   6. complaint-evidence — private, authenticated upload, owner-only read
--
-- Run these SQL policies AFTER creating buckets via Dashboard.
-- ============================================================================

-- ── waste-photos ──────────────────────────────────────────────
-- Policy: Anyone can view waste photos (public)
-- Policy: Authenticated users can upload to their own folder
-- Path pattern: {user_id}/{pickup_id}/{filename}

-- ── pickup-proof ──────────────────────────────────────────────
-- Policy: Anyone can view pickup proof (public)
-- Policy: Authenticated collectors can upload to their assigned pickups
-- Path pattern: {collector_id}/{pickup_id}/{filename}

-- ── kyc-documents ─────────────────────────────────────────────
-- Policy: Owner-only read (private)
-- Policy: Authenticated users can upload their own KYC docs
-- Path pattern: {user_id}/{filename}

-- ── avatars ───────────────────────────────────────────────────
-- Policy: Anyone can view avatars (public)
-- Policy: Authenticated users can upload their own avatar
-- Path pattern: {user_id}/{filename}

-- ── partner-proof ─────────────────────────────────────────────
-- Policy: Anyone can view partner proof (public)
-- Policy: Authenticated partners can upload proof for their batches
-- Path pattern: {partner_id}/{batch_id}/{filename}

-- ── complaint-evidence ────────────────────────────────────────
-- Policy: Owner-only read (private)
-- Policy: Authenticated users can upload complaint evidence
-- Path pattern: {user_id}/{complaint_id}/{filename}

-- NOTE: Storage bucket policies are managed via Supabase Dashboard
-- or the Management API. They cannot be created via SQL migrations.
-- See: https://supabase.com/docs/guides/storage/security
