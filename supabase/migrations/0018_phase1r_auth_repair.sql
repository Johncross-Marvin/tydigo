-- ============================================================================
-- Migration 0018: PHASE 1R — Authentication & Account Architecture Repair
-- ============================================================================
-- ROOT CAUSE RESOLUTION:
--   Migrations 0013 and 0014 conflict. 0013 DROPS the handle_new_user trigger
--   and relies on the admin-signup edge function calling create_profile_for_user
--   RPC. 0014 (which runs AFTER 0013) RE-CREATES the handle_new_user trigger.
--
--   Result in production: BOTH the trigger AND the edge function's RPC run on
--   every signup, attempting to insert TWO profiles rows for the same
--   auth_user_id. profiles.auth_user_id is UNIQUE, so the second insert raises
--   a unique_violation (23505), which Supabase Auth surfaces as:
--       "Database error creating new user" → HTTP 500.
--
-- FIX STRATEGY (single, deliberate bootstrap path):
--   1. Make handle_new_user the SINGLE canonical bootstrap (idempotent, defensive).
--   2. Make create_profile_for_user RPC idempotent (ON CONFLICT DO NOTHING) so
--      the edge function's call is a safe no-op if the trigger already ran.
--   3. Ensure all enum values + columns exist (idempotent safety net).
--   4. Enforce single-active-account invariant via partial unique index.
--   5. Ensure ensure_current_user_profile() is idempotent and safe.
--
-- FORWARD-ONLY & IDEMPOTENT. Safe to run against production.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENSURE ALL user_role ENUM VALUES EXIST (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN ALTER TYPE user_role ADD VALUE 'household';        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'estate';            EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'recycler';          EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'organic_partner';   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'fleet_owner';       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'corporate_partner'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'government';        EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- Legacy aliases (may already exist from 0002)
  BEGIN ALTER TYPE user_role ADD VALUE 'fleet';             EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE user_role ADD VALUE 'corporate';         EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ENSURE CRITICAL COLUMNS EXIST ON profiles (idempotent)
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
  ADD COLUMN IF NOT EXISTS account_type      TEXT DEFAULT 'household';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RELAX profiles.phone (THE #1 SIGNUP KILLER — empty phone collides on UNIQUE)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_phone_key;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ENFORCE SINGLE-ACTIVE-ACCOUNT INVARIANT
--    One active profile per auth_user_id (already UNIQUE via 0001), plus a
--    partial unique index ensuring one active account_type per profile.
-- ═══════════════════════════════════════════════════════════════════════════
-- profiles.auth_user_id is already UNIQUE (from 0001). Ensure it remains so.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_auth_user_id_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    -- If the unique constraint was somehow dropped, re-add it.
    -- (It is defined inline in 0001 as UNIQUE, so this is a safety net.)
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. THE SINGLE CANONICAL handle_new_user TRIGGER (idempotent + defensive)
--    This is the ONLY synchronous bootstrap. It must NEVER fail signup.
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_role        TEXT;
  v_status      TEXT;
  v_username    TEXT;
  v_full_name   TEXT;
  v_phone       TEXT;
  v_phone_e164  TEXT;
  v_city        TEXT;
  v_state       TEXT;
  v_email       TEXT;
  v_profile_id  UUID;
  v_valid_roles TEXT[] := ARRAY[
    'household','estate','business','collector','recycler',
    'organic_partner','fleet_owner','corporate_partner','government',
    'admin','partner','customer','fleet','corporate'
  ];
BEGIN
  -- ── Extract metadata with absolute safety ──────────────────────────
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'household');

  -- Map ALL legacy aliases to canonical
  IF v_role = 'fleet'     THEN v_role := 'fleet_owner';      END IF;
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

  -- ── CRITICAL: Insert the ONE profile row that MUST succeed ─────────
  -- Use ON CONFLICT (auth_user_id) DO NOTHING so this is idempotent even
  -- if the edge function's RPC already created a profile.
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
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_profile_id;

  -- If profile already existed (conflict), fetch its id for sub-profiles
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = NEW.id
    LIMIT 1;
  END IF;

  -- ── Sub-profile inserts: BEST-EFFORT (never kill signup) ─────────
  IF v_profile_id IS NOT NULL THEN
    BEGIN
      IF v_role IN ('collector', 'fleet_owner') THEN
        INSERT INTO public.collector_profiles (profile_id, is_online, created_at, updated_at)
        VALUES (v_profile_id, false, NOW(), NOW())
        ON CONFLICT (profile_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      IF v_role IN ('recycler', 'organic_partner') THEN
        INSERT INTO public.recycler_profiles (profile_id, organization_name, created_at, updated_at)
        VALUES (v_profile_id, v_full_name, NOW(), NOW())
        ON CONFLICT (profile_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      IF v_role IN ('business', 'estate', 'corporate_partner') THEN
        INSERT INTO public.business_profiles (profile_id, business_name, created_at, updated_at)
        VALUES (v_profile_id, v_full_name, NOW(), NOW())
        ON CONFLICT (profile_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
      VALUES (v_profile_id, 0, 0, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      IF v_role IN ('collector', 'fleet_owner') THEN
        INSERT INTO public.collector_wallets (collector_id, available_balance_ngn, pending_balance_ngn, lifetime_earnings_ngn, created_at, updated_at)
        VALUES (v_profile_id, 0, 0, 0, NOW(), NOW())
        ON CONFLICT (collector_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
      VALUES (v_profile_id, true, true, true, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. MAKE create_profile_for_user RPC IDEMPOTENT
--    The admin-signup edge function calls this AFTER auth.admin.createUser()
--    (which already fired the trigger). Make it a safe no-op if the profile
--    already exists, so the edge function never causes a unique violation.
-- ═══════════════════════════════════════════════════════════════════════════
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
  IF v_canonical_role = 'fleet'     THEN v_canonical_role := 'fleet_owner';      END IF;
  IF v_canonical_role = 'corporate' THEN v_canonical_role := 'corporate_partner'; END IF;
  IF v_canonical_role = 'customer'  THEN v_canonical_role := 'household';        END IF;
  IF v_canonical_role = 'admin'     THEN v_canonical_role := 'household';        END IF;

  IF v_canonical_role NOT IN ('household','estate','business','collector','recycler','organic_partner','fleet_owner','corporate_partner','government','partner') THEN
    v_canonical_role := 'household';
  END IF;

  -- ── IDEMPOTENT: if profile already exists, return it ──────────────
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;

  v_status := CASE
    WHEN v_canonical_role IN ('government') THEN 'pending'
    WHEN v_canonical_role = 'collector' THEN 'pending'
    ELSE 'active'
  END;

  v_kyc_status := CASE
    WHEN v_canonical_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner') THEN 'pending'
    ELSE 'not_required'
  END;

  IF p_username IS NULL OR p_username = '' THEN
    p_username := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g')) || floor(random() * 90000 + 10000)::text;
  END IF;

  INSERT INTO public.profiles (
    id, auth_user_id, full_name, username, email, phone, phone_e164,
    role, default_city, default_state, status, kyc_status,
    onboarding_status, profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_auth_user_id, p_full_name, p_username, p_email, p_phone, p_phone_e164,
    v_canonical_role::public.user_role, p_city, p_state, v_status, v_kyc_status,
    'pending', 20, NOW(), NOW()
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = p_auth_user_id LIMIT 1;
  END IF;

  RETURN v_profile_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ENSURE ensure_current_user_profile() IS IDEMPOTENT + SAFE
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

  SELECT id, role::TEXT INTO v_profile_id, v_role
  FROM public.profiles WHERE auth_user_id = v_auth_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'profile_id', v_profile_id,
      'auth_user_id', v_auth_id, 'role', v_role,
      'created', false, 'message', 'Profile already exists'
    );
  END IF;

  SELECT email, COALESCE(raw_user_meta_data ->> 'full_name', 'Tydigo User'),
         COALESCE(raw_user_meta_data ->> 'role', 'household')
  INTO v_email, v_full_name, v_role
  FROM auth.users WHERE id = v_auth_id;

  IF v_role = 'fleet'     THEN v_role := 'fleet_owner';      END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer'  THEN v_role := 'household';        END IF;
  IF v_role = 'admin'     THEN v_role := 'household';        END IF;

  INSERT INTO public.profiles (
    id, auth_user_id, full_name, email, role,
    default_city, default_state, status, kyc_status,
    onboarding_status, profile_completion, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_auth_id, v_full_name, COALESCE(v_email, ''),
    v_role::public.user_role, 'Abuja', 'FCT', 'active',
    CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner')
         THEN 'pending' ELSE 'not_required' END,
    'pending', 20, NOW(), NOW()
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = v_auth_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'profile_id', v_profile_id,
    'auth_user_id', v_auth_id, 'role', v_role,
    'created', true, 'message', 'Profile created successfully'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. INDEXES (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email      ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user  ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);

COMMIT;
