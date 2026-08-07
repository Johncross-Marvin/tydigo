-- Migration: Fix Profile Creation Trigger
-- Ensures handle_new_user properly provisions profiles for ALL role types.
-- Maps raw_user_meta_data to the canonical profiles columns.
-- Sets appropriate initial status based on role.

BEGIN;

-- Drop existing trigger and function to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function: handle_new_user
-- Provisions a profile row when a new auth.users record is created.
-- Maps all relevant metadata fields from the signup process.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_role user_role;
  v_status text;
  v_username text;
  v_full_name text;
  v_phone text;
  v_phone_e164 text;
  v_city text;
  v_state text;
  v_email text;
BEGIN
  -- Extract metadata with safe defaults
  v_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::user_role,
    'customer'::user_role
  );

  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    'Tydigo User'
  );

  v_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    LOWER(REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9]', '', 'g')) || FLOOR(RANDOM() * 1000)::TEXT
  );

  v_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  v_phone_e164 := COALESCE(NEW.raw_user_meta_data ->> 'phone_e164', v_phone);
  v_city := COALESCE(NEW.raw_user_meta_data ->> 'city', 'Abuja');
  v_state := COALESCE(NEW.raw_user_meta_data ->> 'state', 'FCT');
  v_email := COALESCE(NEW.email, '');

  -- Determine initial status based on role
  -- Admin and government require manual approval
  -- Collectors require KYC verification
  -- Others are active immediately after email verification
  v_status := CASE
    WHEN v_role IN ('admin', 'government') THEN 'pending'
    WHEN v_role = 'collector' THEN 'pending'
    ELSE 'active'
  END;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    full_name,
    username,
    email,
    phone,
    phone_e164,
    role,
    default_city,
    default_state,
    status,
    kyc_status,
    onboarding_status,
    profile_completion,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    v_full_name,
    v_username,
    v_email,
    v_phone,
    v_phone_e164,
    v_role,
    v_city,
    v_state,
    v_status,
    CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner') THEN 'pending' ELSE 'not_required' END,
    'pending',
    20, -- Basic info provided during signup
    NOW(),
    NOW()
  );

  -- Create role-specific sub-profiles
  IF v_role IN ('collector', 'fleet_owner') THEN
    INSERT INTO collector_profiles (profile_id, is_online, rating_average, created_at, updated_at)
    VALUES (NEW.id, false, 5.0, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF v_role IN ('recycler', 'organic_partner') THEN
    INSERT INTO recycler_profiles (profile_id, business_name, created_at, updated_at)
    VALUES (NEW.id, v_full_name, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF v_role IN ('business', 'estate', 'corporate_partner') THEN
    INSERT INTO business_profiles (profile_id, business_name, created_at, updated_at)
    VALUES (NEW.id, v_full_name, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Create EcoPoints wallet
  INSERT INTO eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
  VALUES (NEW.id, 0, 0, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  -- Create collector wallet for collectors
  IF v_role IN ('collector', 'fleet_owner') THEN
    INSERT INTO collector_wallets (collector_id, available_balance_ngn, pending_balance_ngn, lifetime_earnings_ngn, created_at, updated_at)
    VALUES (NEW.id, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (collector_id) DO NOTHING;
  END IF;

  -- Create notification preferences
  INSERT INTO notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
  VALUES (NEW.id, true, true, true, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to handle profile updates when user metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Sync relevant metadata changes to profiles
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

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

COMMIT;
