-- ============================================================================
-- Migration 0017: ROLE-SPECIFIC REGISTRATION & VERIFICATION WORKFLOW
-- ============================================================================
-- Adds the auditable registration application layer and the atomic admin
-- review RPC required for verification-gated account types (collector,
-- recycler, organic_partner, fleet_owner, corporate_partner, government).
--
-- DEPENDS ON: 0016 (non-recursive RLS helpers is_admin(), get_my_profile_id()).
-- FORWARD-ONLY & IDEMPOTENT. Safe to run against production.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. ENSURE update_updated_at_column() EXISTS (idempotent safety net)
--    Referenced by triggers on profiles and role-profile tables. Defined here
--    defensively in case it was created out-of-band and not in a migration.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. registration_applications TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.registration_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type  text NOT NULL,
  status        text NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('draft','pending_review','changes_requested','approved','rejected','withdrawn')),
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_version text,
  consented_at  timestamptz,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_applications_status
  ON public.registration_applications (status);

CREATE INDEX IF NOT EXISTS idx_registration_applications_account_type
  ON public.registration_applications (account_type);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_registration_applications_updated_at ON public.registration_applications;
CREATE TRIGGER trg_registration_applications_updated_at
  BEFORE UPDATE ON public.registration_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS — registration_applications
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.registration_applications ENABLE ROW LEVEL SECURITY;

-- Owner can read their own application (non-recursive via get_my_profile_id)
DROP POLICY IF EXISTS registration_applications_owner ON public.registration_applications;
CREATE POLICY registration_applications_owner ON public.registration_applications
  FOR SELECT
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- Owner can insert their own application (but NOT approve it)
DROP POLICY IF EXISTS registration_applications_owner_insert ON public.registration_applications;
CREATE POLICY registration_applications_owner_insert ON public.registration_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = public.get_my_profile_id());

-- Admin can read all applications (non-recursive is_admin)
DROP POLICY IF EXISTS registration_applications_admin ON public.registration_applications;
CREATE POLICY registration_applications_admin ON public.registration_applications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ATOMIC REVIEW RPC
--    Confirms caller is admin, locks the application, validates the decision,
--    updates the application + profile + role profile atomically.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.review_registration_application(
  p_application_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_caller_profile_id uuid;
  v_is_admin boolean;
  v_app record;
  v_new_status text;
  v_profile_status text;
  v_kyc_status text;
BEGIN
  -- 1. Resolve caller profile id (non-recursive)
  v_caller_profile_id := public.get_my_profile_id();
  IF v_caller_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Confirm caller is admin
  SELECT public.is_admin() INTO v_is_admin;
  IF v_is_admin IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: admin only');
  END IF;

  -- 3. Validate decision
  IF p_decision NOT IN ('approved', 'rejected', 'changes_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  -- 4. Lock and load the application
  SELECT * INTO v_app
  FROM public.registration_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  -- 5. Map decision to statuses
  IF p_decision = 'approved' THEN
    v_new_status := 'approved';
    v_profile_status := 'active';
    v_kyc_status := 'approved';
  ELSIF p_decision = 'rejected' THEN
    v_new_status := 'rejected';
    v_profile_status := 'rejected';
    v_kyc_status := 'rejected';
  ELSE -- changes_requested
    v_new_status := 'changes_requested';
    v_profile_status := 'pending';
    v_kyc_status := 'pending';
  END IF;

  -- 6. Update the application
  UPDATE public.registration_applications
  SET status = v_new_status,
      reviewed_at = now(),
      reviewed_by = v_caller_profile_id,
      review_notes = p_notes,
      updated_at = now()
  WHERE id = p_application_id;

  -- 7. Update the canonical profile
  UPDATE public.profiles
  SET status = v_profile_status,
      kyc_status = v_kyc_status,
      updated_at = now()
  WHERE id = v_app.profile_id;

  -- 8. Update the matching role profile verification flag (best-effort)
  IF v_app.account_type = 'collector' THEN
    UPDATE public.collector_profiles SET kyc_status = v_kyc_status::public.kyc_status WHERE profile_id = v_app.profile_id;
  ELSIF v_app.account_type = 'recycler' THEN
    UPDATE public.recycler_profiles SET verification_status = CASE WHEN p_decision = 'approved' THEN 'verified' ELSE 'level_0' END WHERE profile_id = v_app.profile_id;
  ELSIF v_app.account_type = 'organic_partner' THEN
    UPDATE public.organic_partner_profiles SET verified = (p_decision = 'approved') WHERE profile_id = v_app.profile_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'status', v_new_status,
    'profile_id', v_app.profile_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_registration_application(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_registration_application(uuid, text, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX profiles_admin_all SECURITY RISK
--    The existing policy checks auth.jwt() -> 'user_metadata' ->> 'role',
--    which is client-manipulable. Replace with the non-recursive is_admin().
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
