-- ============================================================================
-- Migration 0013: Disable handle_new_user Trigger + Create Profile RPC
-- ============================================================================
-- The handle_new_user trigger on auth.users has been causing persistent
-- "Database error creating new user" failures.
--
-- FIX:
--   1. Disable the trigger entirely
--   2. Create a SECURITY DEFINER RPC function that handles profile creation
--      with proper user_role enum casting
--   3. The admin-signup edge function calls this RPC after creating the auth user
-- ============================================================================

BEGIN;

-- ── 0. Ensure all user_role enum values exist ───────────────────────────────
DO $$
BEGIN
  BEGIN ALTER TYPE user_role ADD VALUE 'household'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'estate'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'recycler'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'organic_partner'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'fleet_owner'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'corporate_partner'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'government'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── 1. Disable the failing trigger ─────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ── 2. Create profile RPC function ─────────────────────────────────────────
-- This is called by the admin-signup edge function after auth user creation.
-- It handles user_role enum casting properly and creates all sub-profiles.
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  p_auth_user_id uuid,
  p_full_name text,
  p_username text,
  p_email text,
  p_phone text,
  p_phone_e164 text,
  p_role text,
  p_city text,
  p_state text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile_id uuid;
  v_canonical_role text;
  v_status text;
  v_kyc_status text;
BEGIN
  -- Normalize role
  v_canonical_role := p_role;
  IF v_canonical_role = 'fleet' THEN v_canonical_role := 'fleet_owner'; END IF;
  IF v_canonical_role = 'corporate' THEN v_canonical_role := 'corporate_partner'; END IF;
  IF v_canonical_role = 'customer' THEN v_canonical_role := 'household'; END IF;
  IF v_canonical_role = 'admin' THEN v_canonical_role := 'household'; END IF;

  -- Validate role
  IF v_canonical_role NOT IN ('household','estate','business','collector','recycler','organic_partner','fleet_owner','corporate_partner','government','partner') THEN
    v_canonical_role := 'household';
  END IF;

  -- Determine status
  v_status := CASE
    WHEN v_canonical_role IN ('government') THEN 'pending'
    WHEN v_canonical_role = 'collector' THEN 'pending'
    ELSE 'active'
  END;

  v_kyc_status := CASE
    WHEN v_canonical_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner') THEN 'pending'
    ELSE 'not_required'
  END;

  -- Generate username if empty
  IF p_username IS NULL OR p_username = '' THEN
    p_username := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g')) || floor(random() * 90000 + 10000)::text;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, username, email, phone, phone_e164,
    role, default_city, default_state, status, kyc_status,
    onboarding_status, profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_auth_user_id, p_full_name, p_username, p_email, p_phone, p_phone_e164,
    v_canonical_role::public.user_role, p_city, p_state, v_status, v_kyc_status,
    'pending', 20, NOW(), NOW()
  )
  RETURNING id INTO v_profile_id;

  -- Create sub-profiles (best-effort, failures don't break signup)
  BEGIN
    IF v_canonical_role IN ('collector', 'fleet_owner') THEN
      INSERT INTO public.collector_profiles (profile_id, is_online)
      VALUES (v_profile_id, false)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF v_canonical_role IN ('recycler', 'organic_partner') THEN
      INSERT INTO public.recycler_profiles (profile_id, organization_name)
      VALUES (v_profile_id, p_full_name)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF v_canonical_role IN ('business', 'estate', 'corporate_partner') THEN
      INSERT INTO public.business_profiles (profile_id, business_name)
      VALUES (v_profile_id, p_full_name)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
    VALUES (v_profile_id, 0, 0, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF v_canonical_role IN ('collector', 'fleet_owner') THEN
      INSERT INTO public.collector_wallets (collector_id, available_balance_ngn, pending_balance_ngn, lifetime_earnings_ngn, created_at, updated_at)
      VALUES (v_profile_id, 0, 0, 0, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
    VALUES (v_profile_id, true, true, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_profile_id;
END;
$$;

-- ── 3. Create ensure_current_user_profile RPC for profile repair ────────────
CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_auth_user_id uuid;
  v_existing_profile_id uuid;
  v_new_profile_id uuid;
  v_role text;
  v_full_name text;
  v_email text;
BEGIN
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE auth_user_id = v_auth_user_id;

  IF v_existing_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'profile_id', v_existing_profile_id,
      'created', false,
      'message', 'Profile already exists'
    );
  END IF;

  SELECT email, 
         COALESCE(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'Tydigo User'),
         COALESCE(raw_user_meta_data ->> 'role', 'household')
  INTO v_email, v_full_name, v_role
  FROM auth.users
  WHERE id = v_auth_user_id;

  IF v_role = 'fleet' THEN v_role := 'fleet_owner'; END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer' THEN v_role := 'household'; END IF;
  IF v_role = 'admin' THEN v_role := 'household'; END IF;

  INSERT INTO public.profiles (
    id, auth_user_id, full_name, email, role, status,
    default_city, default_state, kyc_status, onboarding_status,
    profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_auth_user_id, v_full_name, v_email,
    v_role::public.user_role, 'active', 'Abuja', 'FCT',
    'not_required', 'pending', 20, NOW(), NOW()
  )
  RETURNING id INTO v_new_profile_id;

  RETURN jsonb_build_object(
    'profile_id', v_new_profile_id,
    'created', true,
    'message', 'Profile created successfully'
  );
END;
$$;

COMMIT;
