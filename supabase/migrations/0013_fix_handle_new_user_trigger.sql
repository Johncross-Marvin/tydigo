-- ============================================================================
-- Migration 0013: Fix handle_new_user Trigger - Root Cause Repair
-- ============================================================================
-- Fixes the critical Auth 500 error caused by:
--   1. v_role declared as user_role type - cast fails for enum values not yet added
--   2. Sub-profile inserts use NEW.id (auth.users.id) instead of profiles.id
--   3. Missing columns in sub-profile inserts (rating_average, business_name, etc.)
--   4. Missing columns in eco_points_wallets insert
--   5. No error isolation - any sub-profile failure kills the entire signup
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

-- ── 1. Drop existing triggers and function ──────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();

-- ── 2. Create robust handle_new_user ────────────────────────────────────────
-- CRITICAL: v_role is TEXT (not user_role) to avoid cast failures.
-- Cast to user_role only at INSERT time, after validation.
-- All sub-profile inserts are wrapped in exception blocks so they never
-- cause the auth signup to fail.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_role text;
  v_status text;
  v_username text;
  v_full_name text;
  v_phone text;
  v_phone_e164 text;
  v_city text;
  v_state text;
  v_email text;
  v_profile_id UUID;
  v_valid_roles text[] := ARRAY[
    'household','estate','business','collector','recycler',
    'organic_partner','fleet_owner','corporate_partner','government',
    'admin','partner','customer'
  ];
BEGIN
  -- Extract and normalize role (TEXT, not user_role - avoids cast failures)
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'household');

  -- Map legacy aliases to canonical values
  IF v_role = 'fleet' THEN v_role := 'fleet_owner'; END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer' THEN v_role := 'household'; END IF;

  -- Validate against allowed set; default to household if unknown
  IF NOT (v_role = ANY(v_valid_roles)) THEN
    v_role := 'household';
  END IF;

  -- Never allow public admin signup
  IF v_role = 'admin' THEN
    v_role := 'household';
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    'Tydigo User'
  );

  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    LOWER(REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9]', '', 'g')) || floor(random() * 90000 + 10000)::text
  );

  v_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  v_phone_e164 := COALESCE(NEW.raw_user_meta_data ->> 'phone_e164', v_phone);
  v_city := COALESCE(NEW.raw_user_meta_data ->> 'city', 'Abuja');
  v_state := COALESCE(NEW.raw_user_meta_data ->> 'state', 'FCT');
  v_email := COALESCE(NEW.email, '');

  v_status := CASE
    WHEN v_role IN ('admin', 'government') THEN 'pending'
    WHEN v_role = 'collector' THEN 'pending'
    ELSE 'active'
  END;

  -- ── CRITICAL: Insert profile (the ONE thing that MUST succeed) ────────────
  -- Cast v_role to user_role here, after validation
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, username, email, phone, phone_e164, role,
    default_city, default_state, status, kyc_status, onboarding_status,
    profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), NEW.id, v_full_name, v_username, v_email, v_phone,
    v_phone_e164, v_role::public.user_role, v_city, v_state, v_status,
    CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner')
         THEN 'pending' ELSE 'not_required' END,
    'pending', 20, NOW(), NOW()
  )
  RETURNING id INTO v_profile_id;

  -- ── Sub-profiles: BEST-EFFORT (failures must NOT break signup) ────────────

  -- Collector profile (for collector and fleet_owner roles)
  BEGIN
    IF v_role IN ('collector', 'fleet_owner') THEN
      INSERT INTO public.collector_profiles (profile_id, is_online)
      VALUES (v_profile_id, false)
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Recycler / Organic Partner profile
  BEGIN
    IF v_role IN ('recycler', 'organic_partner') THEN
      INSERT INTO public.recycler_profiles (profile_id, organization_name)
      VALUES (v_profile_id, v_full_name)
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Business / Estate / Corporate profile
  BEGIN
    IF v_role IN ('business', 'estate', 'corporate_partner') THEN
      INSERT INTO public.business_profiles (profile_id, business_name)
      VALUES (v_profile_id, v_full_name)
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- EcoPoints wallet
  BEGIN
    INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
    VALUES (v_profile_id, 0, 0, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Collector wallet
  BEGIN
    IF v_role IN ('collector', 'fleet_owner') THEN
      INSERT INTO public.collector_wallets (collector_id, available_balance_ngn, pending_balance_ngn, lifetime_earnings_ngn, created_at, updated_at)
      VALUES (v_profile_id, 0, 0, 0, NOW(), NOW())
      ON CONFLICT (collector_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Notification preferences
  BEGIN
    INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
    VALUES (v_profile_id, true, true, true, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

-- ── 3. Re-create trigger ────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Create handle_user_update (unchanged logic, just re-created) ─────────
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', profiles.full_name),
    username = COALESCE(NEW.raw_user_meta_data ->> 'username', profiles.username),
    phone = COALESCE(NEW.raw_user_meta_data ->> 'phone', profiles.phone),
    phone_e164 = COALESCE(NEW.raw_user_meta_data ->> 'phone_e164', profiles.phone_e164),
    email = COALESCE(NEW.email, profiles.email),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, profiles.email_verified),
    updated_at = NOW()
  WHERE auth_user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

COMMIT;
