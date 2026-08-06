-- ============================================================================
-- Tydigo Phase 1: Authentication & Identity Platform
-- ============================================================================
-- Adds: countries, states, cities, device_sessions, security_logs,
--       notification_preferences, eco_points_wallets tables.
-- Updates: profiles with new columns, expands user_role enum.
-- ============================================================================

-- ── Expand user_role enum ────────────────────────────────────────────────────

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'household';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'estate';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'recycler';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organic_partner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fleet';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'corporate';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'government';

-- ── Countries ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,       -- ISO 3166-1 alpha-2
  code_alpha3 TEXT NOT NULL UNIQUE, -- ISO 3166-1 alpha-3
  currency TEXT NOT NULL DEFAULT 'NGN',
  phone_code TEXT NOT NULL DEFAULT '+234',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── States ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,                       -- State abbreviation
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, name)
);

-- ── Cities ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state_id, name)
);

-- ── Update profiles table ────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES states(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ── Device Sessions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Security Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'login', 'logout', 'password_change', 'phone_change',
                             -- 'email_change', 'failed_login', 'otp_request',
                             -- 'role_change', 'suspicious_activity'
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notification Preferences ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
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

-- ── EcoPoints Wallet ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eco_points_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Role Profile Tables ──────────────────────────────────────────────────────

-- Recycler Profiles
CREATE TABLE IF NOT EXISTS recycler_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
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

-- Organic Partner Profiles
CREATE TABLE IF NOT EXISTS organic_partner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  organization_name TEXT,
  partner_subtype TEXT,  -- 'bsf_farmer', 'compost_producer', 'livestock_feed'
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

-- Fleet Profiles
CREATE TABLE IF NOT EXISTS fleet_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  organization_name TEXT,
  rc_number TEXT,
  fleet_size INTEGER DEFAULT 0,
  vehicle_types TEXT[],
  service_cities TEXT[],
  total_collectors INTEGER DEFAULT 0,
  active_collectors INTEGER DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Government Profiles
CREATE TABLE IF NOT EXISTS government_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  agency_name TEXT,
  agency_type TEXT,  -- 'federal', 'state', 'local', 'regulatory'
  jurisdiction TEXT,
  department TEXT,
  official_email TEXT,
  official_phone TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corporate Profiles
CREATE TABLE IF NOT EXISTS corporate_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  organization_name TEXT,
  rc_number TEXT,
  industry TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Abuja',
  state TEXT DEFAULT 'FCT',
  employee_count INTEGER,
  sustainability_goals TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles(state_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_device_sessions_profile ON device_sessions(profile_id, is_current);
CREATE INDEX IF NOT EXISTS idx_device_sessions_auth ON device_sessions(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_profile ON security_logs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_auth ON security_logs(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type, created_at DESC);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_points_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organic_partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_profiles ENABLE ROW LEVEL SECURITY;

-- Public read for location data
CREATE POLICY countries_public_read ON countries FOR SELECT USING (true);
CREATE POLICY states_public_read ON states FOR SELECT USING (true);
CREATE POLICY cities_public_read ON cities FOR SELECT USING (true);

-- Device sessions: owner only
CREATE POLICY device_sessions_self ON device_sessions
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Security logs: owner read, system insert
CREATE POLICY security_logs_self ON security_logs
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY security_logs_insert ON security_logs
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Notification preferences: owner only
CREATE POLICY notif_prefs_self ON notification_preferences
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- EcoPoints wallet: owner read, system manage
CREATE POLICY ecopoints_wallet_self ON eco_points_wallets
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Role profile tables: owner + admin
CREATE POLICY recycler_profiles_self ON recycler_profiles
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY organic_partner_profiles_self ON organic_partner_profiles
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY fleet_profiles_self ON fleet_profiles
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY government_profiles_self ON government_profiles
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY corporate_profiles_self ON corporate_profiles
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ── Seed Data: Countries ─────────────────────────────────────────────────────

INSERT INTO countries (name, code, code_alpha3, currency, phone_code) VALUES
  ('Nigeria', 'NG', 'NGA', 'NGN', '+234')
ON CONFLICT (name) DO NOTHING;

-- ── Seed Data: Nigerian States ───────────────────────────────────────────────

DO $$
DECLARE
  ng_id UUID;
BEGIN
  SELECT id INTO ng_id FROM countries WHERE code = 'NG';

  INSERT INTO states (country_id, name, code) VALUES
    (ng_id, 'Abia', 'AB'), (ng_id, 'Adamawa', 'AD'), (ng_id, 'Akwa Ibom', 'AK'),
    (ng_id, 'Anambra', 'AN'), (ng_id, 'Bauchi', 'BA'), (ng_id, 'Bayelsa', 'BY'),
    (ng_id, 'Benue', 'BE'), (ng_id, 'Borno', 'BO'), (ng_id, 'Cross River', 'CR'),
    (ng_id, 'Delta', 'DE'), (ng_id, 'Ebonyi', 'EB'), (ng_id, 'Edo', 'ED'),
    (ng_id, 'Ekiti', 'EK'), (ng_id, 'Enugu', 'EN'), (ng_id, 'FCT', 'FC'),
    (ng_id, 'Gombe', 'GO'), (ng_id, 'Imo', 'IM'), (ng_id, 'Jigawa', 'JI'),
    (ng_id, 'Kaduna', 'KD'), (ng_id, 'Kano', 'KN'), (ng_id, 'Katsina', 'KT'),
    (ng_id, 'Kebbi', 'KE'), (ng_id, 'Kogi', 'KO'), (ng_id, 'Kwara', 'KW'),
    (ng_id, 'Lagos', 'LA'), (ng_id, 'Nasarawa', 'NA'), (ng_id, 'Niger', 'NI'),
    (ng_id, 'Ogun', 'OG'), (ng_id, 'Ondo', 'ON'), (ng_id, 'Osun', 'OS'),
    (ng_id, 'Oyo', 'OY'), (ng_id, 'Plateau', 'PL'), (ng_id, 'Rivers', 'RI'),
    (ng_id, 'Sokoto', 'SO'), (ng_id, 'Taraba', 'TA'), (ng_id, 'Yobe', 'YO'),
    (ng_id, 'Zamfara', 'ZA')
  ON CONFLICT (country_id, name) DO NOTHING;
END $$;

-- ── Seed Data: Major Nigerian Cities ─────────────────────────────────────────

DO $$
DECLARE
  ng_id UUID;
  state_record RECORD;
BEGIN
  SELECT id INTO ng_id FROM countries WHERE code = 'NG';

  FOR state_record IN SELECT id, name FROM states WHERE country_id = ng_id LOOP
    CASE state_record.name
      WHEN 'FCT' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Abuja'), (state_record.id, ng_id, 'Gwagwalada'),
          (state_record.id, ng_id, 'Kuje'), (state_record.id, ng_id, 'Bwari'),
          (state_record.id, ng_id, 'Kwali')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Lagos' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Ikeja'), (state_record.id, ng_id, 'Lagos Island'),
          (state_record.id, ng_id, 'Surulere'), (state_record.id, ng_id, 'Lekki'),
          (state_record.id, ng_id, 'Victoria Island'), (state_record.id, ng_id, 'Ikoyi'),
          (state_record.id, ng_id, 'Yaba'), (state_record.id, ng_id, 'Apapa'),
          (state_record.id, ng_id, 'Badagry'), (state_record.id, ng_id, 'Epe'),
          (state_record.id, ng_id, 'Ikorodu'), (state_record.id, ng_id, 'Agege'),
          (state_record.id, ng_id, 'Alimosho'), (state_record.id, ng_id, 'Oshodi'),
          (state_record.id, ng_id, 'Mushin')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Rivers' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Port Harcourt'), (state_record.id, ng_id, 'Obio-Akpor'),
          (state_record.id, ng_id, 'Bonny')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Kano' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Kano'), (state_record.id, ng_id, 'Kumbotso'),
          (state_record.id, ng_id, 'Nassarawa')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Oyo' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Ibadan'), (state_record.id, ng_id, 'Ogbomosho'),
          (state_record.id, ng_id, 'Oyo')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Kaduna' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Kaduna'), (state_record.id, ng_id, 'Zaria')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Edo' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Benin City')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Enugu' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Enugu'), (state_record.id, ng_id, 'Nsukka')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Plateau' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Jos')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Cross River' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Calabar')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Imo' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Owerri')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Akwa Ibom' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Uyo')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Borno' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Maiduguri')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Anambra' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Awka'), (state_record.id, ng_id, 'Onitsha'),
          (state_record.id, ng_id, 'Nnewi')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Delta' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Asaba'), (state_record.id, ng_id, 'Warri')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Ogun' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Abeokuta'), (state_record.id, ng_id, 'Sagamu'),
          (state_record.id, ng_id, 'Ijebu Ode')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Kwara' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Ilorin')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Osun' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Osogbo'), (state_record.id, ng_id, 'Ife'),
          (state_record.id, ng_id, 'Ilesa')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Ondo' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Akure'), (state_record.id, ng_id, 'Ondo City')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Abia' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Umuahia'), (state_record.id, ng_id, 'Aba')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Benue' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Makurdi')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Niger' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Minna'), (state_record.id, ng_id, 'Suleja')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Bauchi' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Bauchi')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Sokoto' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Sokoto')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Katsina' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Katsina')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Adamawa' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Yola')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Bayelsa' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Yenagoa')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Ebonyi' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Abakaliki')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Ekiti' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Ado Ekiti')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Gombe' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Gombe')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Jigawa' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Dutse')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Kebbi' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Birnin Kebbi')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Kogi' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Lokoja')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Nasarawa' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Lafia')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Taraba' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Jalingo')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Yobe' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Damaturu')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Zamfara' THEN
        INSERT INTO cities (state_id, country_id, name) VALUES
          (state_record.id, ng_id, 'Gusau')
        ON CONFLICT (state_id, name) DO NOTHING;
      ELSE
        -- Default: insert state capital as city
        NULL;
    END CASE;
  END LOOP;
END $$;
