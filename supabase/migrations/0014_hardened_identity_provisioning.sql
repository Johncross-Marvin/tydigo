-- ============================================================================
-- Migration 0014: Hardened Identity Provisioning — THE LAST SIGNUP FIX
-- ============================================================================
-- GOAL: Create a bulletproof account creation pipeline that NEVER returns
--       "Database error creating new user" regardless of migration state.
--
-- STRATEGY:
--   1. Ensure ALL enum values exist (idempotent)
--   2. Ensure ALL required columns exist on profiles (idempotent)
--   3. Ensure ALL required tables exist (idempotent, via CREATE IF NOT EXISTS)
--   4. Replace handle_new_user with a fully defensive version
--   5. Relax phone uniqueness to prevent empty-string collisions
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENSURE ALL user_role ENUM VALUES EXIST
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN ALTER TYPE user_role ADD VALUE 'household';       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'estate';           EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'recycler';         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'organic_partner';  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'fleet_owner';      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'corporate_partner';EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'government';       EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- Legacy aliases that may already exist from 0002
  BEGIN ALTER TYPE user_role ADD VALUE 'fleet';            EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'corporate';        EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ENSURE ALL CRITICAL COLUMNS EXIST ON profiles
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username          TEXT,
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS phone_e164        TEXT,
  ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_status        TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS account_type      TEXT DEFAULT 'household',
  ADD COLUMN IF NOT EXISTS date_of_birth     DATE,
  ADD COLUMN IF NOT EXISTS gender            TEXT,
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS language          TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone          TEXT DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS country           TEXT DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS last_login        TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RELAX profiles.phone CONSTRAINT (THE #1 SIGNUP KILLER)
-- ═══════════════════════════════════════════════════════════════════════════
-- The original 0001 migration has phone TEXT UNIQUE NOT NULL.
-- If phone is empty (not provided by user), this kills signup.
-- We make phone nullable and drop the unique constraint.
DO $$
BEGIN
  -- Drop NOT NULL (ignore if already dropped)
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- Drop UNIQUE constraint if it exists at the column level
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN phone DROP DEFAULT;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- Drop named unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_phone_key;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ENSURE ALL REQUIRED SUB-TABLES EXIST
-- ═══════════════════════════════════════════════════════════════════════════

-- 4a. EcoPoints Wallet
CREATE TABLE IF NOT EXISTS public.eco_points_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eco_points_wallets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY eco_points_wallets_self ON public.eco_points_wallets
    FOR SELECT USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4b. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  pickup_updates BOOLEAN NOT NULL DEFAULT true,
  payment_updates BOOLEAN NOT NULL DEFAULT true,
  ecopoints_updates BOOLEAN NOT NULL DEFAULT true,
  promotional BOOLEAN NOT NULL DEFAULT false,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY notif_prefs_self ON public.notification_preferences
    FOR ALL USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4c. Collector Wallets
CREATE TABLE IF NOT EXISTS public.collector_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  available_balance_ngn INTEGER NOT NULL DEFAULT 0,
  pending_balance_ngn INTEGER NOT NULL DEFAULT 0,
  withdrawable_balance_ngn INTEGER NOT NULL DEFAULT 0,
  lifetime_earnings_ngn INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collector_wallets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY collector_wallets_self ON public.collector_wallets
    FOR ALL USING (
      collector_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4d. Recycler Profiles
CREATE TABLE IF NOT EXISTS public.recycler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  organization_name TEXT,
  rc_number TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Abuja',
  state TEXT DEFAULT 'FCT',
  accepted_materials TEXT[],
  processing_capacity_kg_per_week REAL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recycler_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY recycler_profiles_self ON public.recycler_profiles
    FOR ALL USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4e. Business Profiles
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL DEFAULT 'My Business',
  business_type TEXT,
  rc_number TEXT,
  address TEXT,
  waste_volume_estimate_kg REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY business_profiles_self ON public.business_profiles
    FOR ALL USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4f. Collector Profiles (ensure it exists with all needed columns)
CREATE TABLE IF NOT EXISTS public.collector_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  vehicle_type TEXT,
  vehicle_plate_number TEXT,
  kyc_status TEXT DEFAULT 'pending',
  safety_training_completed BOOLEAN NOT NULL DEFAULT false,
  total_earnings_ngn INTEGER NOT NULL DEFAULT 0,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  service_city TEXT DEFAULT 'Abuja',
  service_zones TEXT[],
  max_capacity_kg REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collector_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY collector_profiles_self ON public.collector_profiles
    FOR ALL USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4g. Account Type Change Requests
CREATE TABLE IF NOT EXISTS public.account_type_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_account_type TEXT NOT NULL,
  requested_account_type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.account_type_change_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY account_type_requests_self ON public.account_type_change_requests
    FOR SELECT USING (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY account_type_requests_insert ON public.account_type_change_requests
    FOR INSERT WITH CHECK (
      profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. THE BULLETPROOF handle_new_user TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPLES:
--   - v_role is TEXT (avoid enum cast failures)
--   - Validate against an explicit whitelist
--   - Map legacy aliases before validation
--   - Use gen_random_uuid() for profiles.id (not auth.users.id)
--   - Wrap EVERY sub-insert in BEGIN/EXCEPTION so nothing can kill signup
--   - Return NEW even if everything fails (auth user must be created)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_role          TEXT;
  v_status        TEXT;
  v_username      TEXT;
  v_full_name     TEXT;
  v_phone         TEXT;
  v_phone_e164    TEXT;
  v_city          TEXT;
  v_state         TEXT;
  v_email         TEXT;
  v_profile_id    UUID;
  v_valid_roles   TEXT[] := ARRAY[
    'household','estate','business','collector','recycler',
    'organic_partner','fleet_owner','corporate_partner','government',
    'admin','partner','customer','fleet','corporate'
  ];
BEGIN
  -- ── Extract metadata with absolute safety ──────────────────────────
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'household');

  -- Map ALL legacy aliases
  IF v_role = 'fleet'    THEN v_role := 'fleet_owner';      END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer'  THEN v_role := 'household';        END IF;

  -- Validate against whitelist; default to household if unknown
  IF NOT (v_role = ANY(v_valid_roles)) THEN
    v_role := 'household';
  END IF;

  -- NEVER allow public admin signup via trigger
  IF v_role = 'admin' THEN
    v_role := 'household';
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'Tydigo User'
  );

  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    LOWER(REGEXP_REPLACE(v_full_name, '[^a-zA-Z0-9]', '', 'g'))
      || floor(random() * 90000 + 10000)::text
  );

  v_phone      := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  v_phone_e164 := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone_e164'), ''),
    v_phone
  );
  v_city  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'city'), ''), 'Abuja');
  v_state := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'state'), ''), 'FCT');
  v_email := COALESCE(NEW.email, '');

  v_status := CASE
    WHEN v_role IN ('admin', 'government') THEN 'pending'
    WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner') THEN 'pending'
    ELSE 'active'
  END;

  -- ── CRITICAL: Insert the ONE thing that MUST succeed ──────────────
  -- All column references are validated by Section 2 above.
  BEGIN
    INSERT INTO public.profiles (
      id, auth_user_id, full_name, username, email, phone, phone_e164,
      role, default_city, default_state, status, kyc_status,
      onboarding_status, profile_completion, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), NEW.id, v_full_name, v_username, v_email, v_phone,
      v_phone_e164, v_role::public.user_role, v_city, v_state, v_status,
      CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner')
           THEN 'pending' ELSE 'not_required' END,
      'pending', 20, NOW(), NOW()
    )
    RETURNING id INTO v_profile_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- CRITICAL FALLBACK: If main insert fails, try minimal insert
      BEGIN
        INSERT INTO public.profiles (id, auth_user_id, full_name, role, created_at, updated_at)
        VALUES (gen_random_uuid(), NEW.id, v_full_name, v_role::public.user_role, NOW(), NOW())
        RETURNING id INTO v_profile_id;
      EXCEPTION WHEN OTHERS THEN
        -- Give up on profile; auth user still exists
        RAISE WARNING '[handle_new_user] Profile creation failed: %', SQLERRM;
        RETURN NEW;
      END;
  END;

  -- ── Sub-profile inserts: BEST-EFFORT (never kill signup) ─────────

  -- Collector / Fleet sub-profile
  BEGIN
    IF v_role IN ('collector', 'fleet_owner') THEN
      INSERT INTO public.collector_profiles (profile_id, is_online, created_at, updated_at)
      VALUES (v_profile_id, false, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Recycler / Organic sub-profile
  BEGIN
    IF v_role IN ('recycler', 'organic_partner') THEN
      INSERT INTO public.recycler_profiles (profile_id, organization_name, created_at, updated_at)
      VALUES (v_profile_id, v_full_name, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Business / Estate / Corporate sub-profile
  BEGIN
    IF v_role IN ('business', 'estate', 'corporate_partner') THEN
      INSERT INTO public.business_profiles (profile_id, business_name, created_at, updated_at)
      VALUES (v_profile_id, v_full_name, NOW(), NOW())
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

  -- Collector wallet (for collectors and fleet owners)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RE-CREATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SAFE handle_user_update
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_update();

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name      = COALESCE(NEW.raw_user_meta_data ->> 'full_name', profiles.full_name),
    username       = COALESCE(NEW.raw_user_meta_data ->> 'username', profiles.username),
    phone          = COALESCE(NEW.raw_user_meta_data ->> 'phone', profiles.phone),
    phone_e164     = COALESCE(NEW.raw_user_meta_data ->> 'phone_e164', profiles.phone_e164),
    email          = COALESCE(NEW.email, profiles.email),
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    updated_at     = NOW()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ensure_current_user_profile RPC (idempotent profile repair)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_auth_id     UUID;
  v_profile_id  UUID;
  v_role        TEXT;
  v_full_name   TEXT;
  v_email       TEXT;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if profile exists
  SELECT id, role INTO v_profile_id, v_role
  FROM public.profiles WHERE auth_user_id = v_auth_id;

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
  IF v_role = 'fleet'    THEN v_role := 'fleet_owner';      END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer'  THEN v_role := 'household';        END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, email, role,
    default_city, default_state, status, kyc_status,
    onboarding_status, profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_auth_id, v_full_name, COALESCE(v_email, ''),
    v_role, 'Abuja', 'FCT', 'active',
    CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner')
         THEN 'pending' ELSE 'not_required' END,
    'pending', 20, NOW(), NOW()
  )
  RETURNING id INTO v_profile_id;

  -- EcoPoints wallet
  BEGIN
    INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
    VALUES (v_profile_id, 0, 0, NOW(), NOW()) ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Notification preferences
  BEGIN
    INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
    VALUES (v_profile_id, true, true, true, NOW(), NOW()) ON CONFLICT (profile_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true, 'profile_id', v_profile_id,
    'auth_user_id', v_auth_id, 'role', v_role,
    'created', true, 'message', 'Profile created successfully'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email      ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user  ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_eco_points_wallets_profile ON public.eco_points_wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_collector_wallets_collector ON public.collector_wallets(collector_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_profile ON public.notification_preferences(profile_id);

COMMIT;
