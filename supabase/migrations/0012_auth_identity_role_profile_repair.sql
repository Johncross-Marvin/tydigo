-- ============================================================================
-- Migration 0012: Auth, Identity, Role & Profile Repair
-- ============================================================================
-- Fixes critical defects discovered during production audit:
--   1. handle_new_user uses auth.users.id as profile_id for sub-profiles
--      but profiles.id is gen_random_uuid(). This breaks all sub-profile FKs.
--   2. collector_wallets table missing (referenced in code but never created).
--   3. profiles.phone UNIQUE NOT NULL constraint blocks signups with empty phone.
--   4. ensure_current_user_profile RPC missing (needed for orphan repair).
--   5. user_role enum expansion uses ADD VALUE IF NOT EXISTS (invalid PG syntax).
--   6. handle_user_update references profiles.status which may not exist.
-- ============================================================================

BEGIN;

-- ── 0. Safe user_role enum expansion ────────────────────────────────────────
-- The 0002 migration uses ADD VALUE IF NOT EXISTS which is invalid PG syntax.
-- This safely adds any missing enum values.
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

-- ── 1. Fix profiles.phone constraint ────────────────────────────────────────
-- Phone is contact info, not identity. Allow null/empty for signups.
ALTER TABLE public.profiles
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN phone DROP DEFAULT;

-- Drop the UNIQUE constraint on phone if it exists (may have been added in 0001)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_phone_key;
  END IF;
END $$;

-- ── 2. Add missing columns to profiles (if not already added) ───────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'household';

-- ── 3. Create missing collector_wallets table ───────────────────────────────
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

CREATE POLICY collector_wallets_self ON public.collector_wallets
  FOR ALL USING (
    collector_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- ── 4. Create collector_performance table (if missing) ──────────────────────
CREATE TABLE IF NOT EXISTS public.collector_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_pickups INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  cancelled_jobs INTEGER NOT NULL DEFAULT 0,
  average_rating REAL NOT NULL DEFAULT 5.0,
  acceptance_rate REAL NOT NULL DEFAULT 100,
  completion_rate REAL NOT NULL DEFAULT 100,
  on_time_rate REAL NOT NULL DEFAULT 100,
  average_response_time REAL NOT NULL DEFAULT 30,
  total_distance_km REAL NOT NULL DEFAULT 0,
  total_ecopoints INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collector_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY collector_performance_self ON public.collector_performance
  FOR SELECT USING (
    collector_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- ── 5. Create collector_vehicles table (if missing) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.collector_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  plate_number TEXT,
  capacity_kg REAL DEFAULT 100,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collector_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY collector_vehicles_self ON public.collector_vehicles
  FOR ALL USING (
    collector_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- ── 6. Create collector_assignments table (if missing) ──────────────────────
CREATE TABLE IF NOT EXISTS public.collector_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id UUID REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  distance_km REAL,
  estimated_arrival_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'offered',
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collector_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY collector_assignments_self ON public.collector_assignments
  FOR SELECT USING (
    collector_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY collector_assignments_customer ON public.collector_assignments
  FOR SELECT USING (
    pickup_request_id IN (
      SELECT id FROM public.pickup_requests
      WHERE customer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    )
  );

-- ── 7. Create domain_events table (if missing) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id),
  payload JSONB,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ── 8. Create analytics_events table (if missing) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id),
  entity_type TEXT,
  entity_id UUID,
  properties JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 9. Create security_events table (if missing) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_events_self ON public.security_events
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY security_events_insert ON public.security_events
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- ── 10. Create pickup_images table (referenced in code) ─────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id UUID REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  image_url TEXT,
  storage_path TEXT NOT NULL,
  bucket TEXT DEFAULT 'waste-photos',
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY pickup_images_self ON public.pickup_images
  FOR SELECT USING (
    pickup_request_id IN (
      SELECT id FROM public.pickup_requests
      WHERE customer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    )
  );

-- ── 11. Create digital_receipts table (referenced in code) ──────────────────
CREATE TABLE IF NOT EXISTS public.digital_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id UUID REFERENCES public.pickup_requests(id) ON DELETE CASCADE UNIQUE,
  receipt_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY digital_receipts_self ON public.digital_receipts
  FOR SELECT USING (
    pickup_request_id IN (
      SELECT id FROM public.pickup_requests
      WHERE customer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    )
  );

-- ── 12. Create pickup_items table (referenced in code) ──────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id UUID REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  waste_category_id UUID REFERENCES public.waste_categories(id),
  estimated_weight_kg REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 13. Fix handle_new_user trigger ─────────────────────────────────────────
-- The critical bug: sub-profiles were inserted with profile_id = NEW.id
-- (auth.users.id), but profiles.id is gen_random_uuid().
-- We need to capture the generated profiles.id and use it for sub-profiles.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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
BEGIN
  -- Extract metadata with safe defaults
  v_role := COALESCE(
    NEW.raw_user_meta_data ->> 'role',
    'household'
  );

  -- Map legacy role aliases to canonical
  IF v_role = 'fleet' THEN v_role := 'fleet_owner'; END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer' THEN v_role := 'household'; END IF;

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
  v_status := CASE
    WHEN v_role IN ('admin', 'government') THEN 'pending'
    WHEN v_role = 'collector' THEN 'pending'
    ELSE 'active'
  END;

  -- Insert profile and capture the generated UUID
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
    CASE WHEN v_role IN ('collector', 'recycler', 'organic_partner', 'fleet_owner')
         THEN 'pending' ELSE 'not_required' END,
    'pending',
    20,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_profile_id;

  -- Create role-specific sub-profiles using the CORRECT profile_id
  IF v_role IN ('collector', 'fleet_owner') THEN
    INSERT INTO public.collector_profiles (profile_id, is_online, created_at, updated_at)
    VALUES (v_profile_id, false, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF v_role IN ('recycler', 'organic_partner') THEN
    INSERT INTO public.recycler_profiles (profile_id, business_name, created_at, updated_at)
    VALUES (v_profile_id, v_full_name, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF v_role IN ('business', 'estate', 'corporate_partner') THEN
    INSERT INTO public.business_profiles (profile_id, business_name, created_at, updated_at)
    VALUES (v_profile_id, v_full_name, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Create EcoPoints wallet
  INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
  VALUES (v_profile_id, 0, 0, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  -- Create collector wallet for collectors/fleet owners
  IF v_role IN ('collector', 'fleet_owner') THEN
    INSERT INTO public.collector_wallets (collector_id, available_balance_ngn, pending_balance_ngn, lifetime_earnings_ngn, created_at, updated_at)
    VALUES (v_profile_id, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (collector_id) DO NOTHING;
  END IF;

  -- Create notification preferences
  INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
  VALUES (v_profile_id, true, true, true, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 14. Fix handle_user_update trigger ──────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_update();

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
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    updated_at = NOW()
  WHERE auth_user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ── 15. Create ensure_current_user_profile RPC ──────────────────────────────
-- Idempotent profile repair for authenticated users whose profile is missing.
CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_auth_id UUID;
  v_profile_id UUID;
  v_role text;
  v_full_name text;
  v_email text;
BEGIN
  v_auth_id := auth.uid();

  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if profile already exists
  SELECT id, role INTO v_profile_id, v_role
  FROM public.profiles
  WHERE auth_user_id = v_auth_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'profile_id', v_profile_id,
      'auth_user_id', v_auth_id,
      'role', v_role,
      'created', false,
      'message', 'Profile already exists'
    );
  END IF;

  -- Get user info from auth
  SELECT email, COALESCE(raw_user_meta_data ->> 'full_name', 'Tydigo User'),
         COALESCE(raw_user_meta_data ->> 'role', 'household')
  INTO v_email, v_full_name, v_role
  FROM auth.users
  WHERE id = v_auth_id;

  -- Map legacy roles
  IF v_role = 'fleet' THEN v_role := 'fleet_owner'; END IF;
  IF v_role = 'corporate' THEN v_role := 'corporate_partner'; END IF;
  IF v_role = 'customer' THEN v_role := 'household'; END IF;

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

  -- Create EcoPoints wallet
  INSERT INTO public.eco_points_wallets (profile_id, balance, lifetime_earned, created_at, updated_at)
  VALUES (v_profile_id, 0, 0, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  -- Create notification preferences
  INSERT INTO public.notification_preferences (profile_id, push_enabled, email_enabled, sms_enabled, created_at, updated_at)
  VALUES (v_profile_id, true, true, true, NOW(), NOW())
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'auth_user_id', v_auth_id,
    'role', v_role,
    'created', true,
    'message', 'Profile created successfully'
  );
END;
$$;

-- ── 16. Add RLS for new tables ──────────────────────────────────────────────
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;

-- ── 17. Add indexes for new tables ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_collector_wallets_collector ON public.collector_wallets(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_collector ON public.collector_performance(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_vehicles_collector ON public.collector_vehicles(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_pickup ON public.collector_assignments(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_collector ON public.collector_assignments(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_status ON public.collector_assignments(status);
CREATE INDEX IF NOT EXISTS idx_pickup_images_pickup ON public.pickup_images(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_pickup ON public.digital_receipts(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_security_events_profile ON public.security_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name, occurred_at DESC);

COMMIT;
