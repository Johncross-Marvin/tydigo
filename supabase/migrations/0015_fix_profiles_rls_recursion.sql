-- ============================================================================
-- Migration 0015: Fix Profile RLS Recursion — Critical 500 Repair
-- ============================================================================
-- ROOT CAUSE: profiles_admin policy queries profiles from within a policy
-- on profiles, causing infinite RLS recursion → 500 on every profiles query.
--
-- FIX:
--   1. Replace recursive profiles_admin with SECURITY DEFINER helper function
--      that bypasses RLS, avoiding recursion entirely.
--   2. Create get_my_profile_id() helper to eliminate common subquery pattern
--      that re-triggers profiles RLS from other table policies.
--   3. Ensure profiles_self is the direct, non-recursive policy.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DROP THE RECURSIVE PROFILES_ADMIN POLICY
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS profiles_admin ON public.profiles;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CREATE NON-RECURSIVE ADMIN CHECK HELPER
--    SECURITY DEFINER → runs as function owner, bypasses RLS on profiles.
--    This is the key: avoids the infinite recursion because the inner
--    query on profiles does NOT re-evaluate RLS policies.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
STABLE
PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Revoke public execute; only allow authenticated users
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CREATE NON-RECURSIVE PROFILE ID HELPER
--    Returns the current user's profile.id without going through profiles RLS.
--    Replaces the common pattern:
--      (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
--    in policies on OTHER tables (pickups, kyc, payments, etc.)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
STABLE
PARALLEL SAFE
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RECREATE PROFILES_ADMIN — SAFE, NON-RECURSIVE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE POLICY profiles_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENSURE PROFILES_SELF EXISTS AND IS DIRECT
--    (It may have been dropped accidentally; ensure it's the simple version)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS profiles_self ON public.profiles;

CREATE POLICY profiles_self ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. FIX OTHER TABLE POLICIES THAT RECURSE THROUGH PROFILES RLS
--    These policies are on OTHER tables (not profiles), so they don't
--    cause DIRECT recursion. But they query profiles, which triggers
--    profiles RLS evaluation. With the recursive profiles_admin now
--    fixed, these will work. We also optimize them to use the helper.
-- ═══════════════════════════════════════════════════════════════════════════

-- 6a. pickup_requests policies
DROP POLICY IF EXISTS pickups_customer ON public.pickup_requests;
CREATE POLICY pickups_customer ON public.pickup_requests
  FOR ALL
  TO authenticated
  USING (customer_id = public.get_my_profile_id());

DROP POLICY IF EXISTS pickups_collector ON public.pickup_requests;
CREATE POLICY pickups_collector ON public.pickup_requests
  FOR SELECT
  TO authenticated
  USING (
    collector_id = public.get_my_profile_id()
    OR (
      status = 'requested'
      AND EXISTS (
        SELECT 1 FROM public.collector_profiles cp
        WHERE cp.profile_id = public.get_my_profile_id()
      )
    )
  );

DROP POLICY IF EXISTS pickups_admin ON public.pickup_requests;
CREATE POLICY pickups_admin ON public.pickup_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 6b. payments policies
DROP POLICY IF EXISTS payments_self ON public.payments;
CREATE POLICY payments_self ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    payer_id = public.get_my_profile_id()
    OR payee_id = public.get_my_profile_id()
  );

-- 6c. kyc_documents policies
DROP POLICY IF EXISTS kyc_owner ON public.kyc_documents;
CREATE POLICY kyc_owner ON public.kyc_documents
  FOR SELECT
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS kyc_admin ON public.kyc_documents;
CREATE POLICY kyc_admin ON public.kyc_documents
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 6d. push_subscriptions policies
DROP POLICY IF EXISTS push_subs_self ON public.push_subscriptions;
CREATE POLICY push_subs_self ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6e. device_sessions policies (from 0002)
DROP POLICY IF EXISTS device_sessions_self ON public.device_sessions;
CREATE POLICY device_sessions_self ON public.device_sessions
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6f. security_logs policies (from 0002)
DROP POLICY IF EXISTS security_logs_self ON public.security_logs;
CREATE POLICY security_logs_self ON public.security_logs
  FOR SELECT
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS security_logs_insert ON public.security_logs;
CREATE POLICY security_logs_insert ON public.security_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = public.get_my_profile_id());

-- 6g. notification_preferences (from 0002)
DROP POLICY IF EXISTS notif_prefs_self ON public.notification_preferences;
CREATE POLICY notif_prefs_self ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6h. eco_points_wallets (from 0002)
DROP POLICY IF EXISTS ecopoints_wallet_self ON public.eco_points_wallets;
CREATE POLICY ecopoints_wallet_self ON public.eco_points_wallets
  FOR SELECT
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6i. recycler_profiles (from 0002)
DROP POLICY IF EXISTS recycler_profiles_self ON public.recycler_profiles;
CREATE POLICY recycler_profiles_self ON public.recycler_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6j. organic_partner_profiles (from 0002)
DROP POLICY IF EXISTS organic_partner_profiles_self ON public.organic_partner_profiles;
CREATE POLICY organic_partner_profiles_self ON public.organic_partner_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6k. fleet_profiles (from 0002)
DROP POLICY IF EXISTS fleet_profiles_self ON public.fleet_profiles;
CREATE POLICY fleet_profiles_self ON public.fleet_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6l. government_profiles (from 0002)
DROP POLICY IF EXISTS government_profiles_self ON public.government_profiles;
CREATE POLICY government_profiles_self ON public.government_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6m. corporate_profiles (from 0002)
DROP POLICY IF EXISTS corporate_profiles_self ON public.corporate_profiles;
CREATE POLICY corporate_profiles_self ON public.corporate_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- 6n. collector_profiles (from 0001)
DROP POLICY IF EXISTS collector_profiles_self ON public.collector_profiles;
CREATE POLICY collector_profiles_self ON public.collector_profiles
  FOR ALL
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. FIX profiles.auth.ts ERROR HANDLING
--    The auth service currently ignores Supabase query errors.
--    We create a safe profile-fetch wrapper function.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
STABLE
PARALLEL SAFE
AS $$
  SELECT *
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMIT;
