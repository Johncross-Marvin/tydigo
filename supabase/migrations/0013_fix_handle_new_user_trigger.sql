-- ============================================================================
-- Migration 0013: Disable handle_new_user Trigger + Fix user_role Enum
-- ============================================================================
-- The handle_new_user trigger on auth.users has been causing persistent
-- "Database error creating new user" failures. Root cause: the trigger
-- declares v_role as user_role type and casts raw_user_meta_data directly,
-- which fails when enum values are missing or metadata is malformed.
--
-- FIX: Disable the trigger entirely. Profile creation is now handled
-- explicitly by the admin-signup edge function using the service_role key,
-- which bypasses RLS and provides reliable, idempotent profile provisioning.
--
-- This also fixes:
--   1. Sub-profile inserts using wrong IDs (NEW.id vs profiles.id)
--   2. Missing enum values (household, estate, fleet_owner, etc.)
--   3. No error isolation in sub-profile creation
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
-- Profile creation is now handled by the admin-signup edge function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for reference but it won't be called automatically
-- The function can be dropped entirely once the edge function is verified

-- ── 2. Create ensure_current_user_profile RPC for profile repair ────────────
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
