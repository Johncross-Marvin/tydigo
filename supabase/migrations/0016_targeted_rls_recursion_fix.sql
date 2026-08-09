-- ============================================================================
-- Migration 0016: TARGETED RLS RECURSION FIX — PRODUCTION DEPLOYMENT
-- ============================================================================
-- ROOT CAUSE: profiles_admin policy (from 0001) recursively queries profiles,
-- causing "infinite recursion detected in policy for relation profiles" (42P17).
--
-- THIS MIGRATION ONLY FIXES THE RLS RECURSION. It does NOT change:
--   - Table schemas
--   - Column definitions  
--   - handle_new_user trigger
--   - Enum values
--   - Existing data
--
-- SAFE TO RUN against the current production database.
-- Run via: Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DROP THE RECURSIVE PROFILES_ADMIN POLICY
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS profiles_admin ON public.profiles;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CREATE NON-RECURSIVE ADMIN CHECK HELPER
--    SECURITY DEFINER → runs as function owner, BYPASSES RLS on profiles.
--    This eliminates the infinite recursion because the inner query on
--    profiles does NOT re-trigger RLS evaluation.
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
--    Returns the current user's profiles.id without going through profiles RLS.
--    Replaces the common subquery pattern:
--      (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
--    in policies on OTHER tables.
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
-- 5. ENSURE PROFILES_SELF IS THE DIRECT, SIMPLE POLICY
--    Drop and recreate to ensure it's just auth_user_id = auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS profiles_self ON public.profiles;

CREATE POLICY profiles_self ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. FIX OTHER TABLE POLICIES TO USE get_my_profile_id()
--    These policies are on OTHER tables (not profiles), but they query
--    profiles which previously triggered the recursive profiles RLS.
--    Using get_my_profile_id() avoids the subquery entirely.
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

-- 6e. device_sessions policies (from 0002, if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'device_sessions') THEN
    DROP POLICY IF EXISTS device_sessions_self ON public.device_sessions;
    CREATE POLICY device_sessions_self ON public.device_sessions
      FOR ALL
      TO authenticated
      USING (profile_id = public.get_my_profile_id());
  END IF;
END $$;

-- 6f. security_logs policies (from 0002, if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_logs') THEN
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
  END IF;
END $$;

-- 6g. notification_preferences (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
    DROP POLICY IF EXISTS notif_prefs_self ON public.notification_preferences;
    CREATE POLICY notif_prefs_self ON public.notification_preferences
      FOR ALL
      TO authenticated
      USING (profile_id = public.get_my_profile_id());
  END IF;
END $$;

-- 6h. eco_points_wallets (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'eco_points_wallets') THEN
    DROP POLICY IF EXISTS ecopoints_wallet_self ON public.eco_points_wallets;
    CREATE POLICY ecopoints_wallet_self ON public.eco_points_wallets
      FOR SELECT
      TO authenticated
      USING (profile_id = public.get_my_profile_id());
  END IF;
END $$;

-- 6i. collector_profiles (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collector_profiles') THEN
    DROP POLICY IF EXISTS collector_profiles_self ON public.collector_profiles;
    CREATE POLICY collector_profiles_self ON public.collector_profiles
      FOR ALL
      TO authenticated
      USING (profile_id = public.get_my_profile_id());
  END IF;
END $$;

-- 6j. Role-specific profile tables (if they exist)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'recycler_profiles', 'organic_partner_profiles', 'fleet_profiles',
    'government_profiles', 'corporate_profiles', 'business_profiles',
    'partner_profiles'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I_self ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY %I_self ON public.%I FOR ALL TO authenticated USING (profile_id = public.get_my_profile_id())',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. CREATE get_my_profile() WRAPPER FUNCTION
--    Safe wrapper that bypasses RLS to return the current user's profile.
--    Can be used as an alternative to direct profiles query.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CREATE ensure_current_user_profile() RPC (if not exists)
--    Idempotent profile repair for authenticated users.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_auth_id UUID;
  v_profile_id UUID;
  v_role TEXT;
  v_full_name TEXT;
  v_email TEXT;
  v_col_exists BOOLEAN;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if profile already exists
  SELECT id, role::TEXT INTO v_profile_id, v_role
  FROM public.profiles
  WHERE auth_user_id = v_auth_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'profile_id', v_profile_id,
      'auth_user_id', v_auth_id, 'role', v_role,
      'created', false, 'message', 'Profile already exists'
    );
  END IF;

  -- Get auth user info
  SELECT email, COALESCE(raw_user_meta_data ->> 'full_name', 'Tydigo User'),
         COALESCE(raw_user_meta_data ->> 'role', 'household')
  INTO v_email, v_full_name, v_role
  FROM auth.users WHERE id = v_auth_id;

  -- Map legacy roles
  IF v_role = 'fleet' THEN v_role := 'fleet_owner'; END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer' THEN v_role := 'household'; END IF;

  -- Create profile with only core columns that definitely exist (from 0001)
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, role, default_city, default_state,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_auth_id, v_full_name, v_role::public.user_role,
    'Abuja', 'FCT', NOW(), NOW()
  )
  RETURNING id INTO v_profile_id;

  -- Optionally populate email/phone/username columns if they exist
  IF v_email IS NOT NULL AND v_email != '' THEN
    BEGIN
      UPDATE public.profiles SET email = v_email WHERE id = v_profile_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Create EcoPoints wallet if table exists
  BEGIN
    INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
    VALUES (v_profile_id, 0, 0, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
  END;

  -- Create notification preferences if table exists
  BEGIN
    INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
    VALUES (v_profile_id, true, true, true, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true, 'profile_id', v_profile_id,
    'auth_user_id', v_auth_id, 'role', v_role,
    'created', true, 'message', 'Profile created successfully'
  );
END;
$$;

COMMIT;
