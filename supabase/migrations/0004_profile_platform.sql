-- ============================================================================
-- Tydigo Phase 3: User Profiles & Account Management
-- ============================================================================
-- Adds: addresses, pickup_locations, bank_accounts, emergency_contacts,
--       privacy_settings, activity_logs, notification_preferences,
--       profile enhancements (date_of_birth, gender, profile_completion)
-- ============================================================================

-- ── Profile Enhancements ─────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;

-- ── Addresses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT,
  phone TEXT,
  country TEXT DEFAULT 'Nigeria',
  state TEXT,
  city TEXT,
  lga TEXT,
  estate TEXT,
  street TEXT,
  building TEXT,
  landmark TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Locations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  nickname TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notification Preferences ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  pickup_updates BOOLEAN NOT NULL DEFAULT true,
  payment_updates BOOLEAN NOT NULL DEFAULT true,
  ecopoints_updates BOOLEAN NOT NULL DEFAULT true,
  security_alerts BOOLEAN NOT NULL DEFAULT true,
  system_updates BOOLEAN NOT NULL DEFAULT true,
  newsletter BOOLEAN NOT NULL DEFAULT false,
  do_not_disturb_start TIME,
  do_not_disturb_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Bank Accounts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_code TEXT,
  paystack_recipient_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Emergency Contacts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Privacy Settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  show_profile BOOLEAN NOT NULL DEFAULT true,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_email BOOLEAN NOT NULL DEFAULT false,
  share_location BOOLEAN NOT NULL DEFAULT true,
  allow_messages BOOLEAN NOT NULL DEFAULT true,
  allow_marketing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Activity Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_addresses_profile ON addresses(profile_id, is_default);
CREATE INDEX IF NOT EXISTS idx_addresses_coords ON addresses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pickup_locations_profile ON pickup_locations(profile_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_profile ON bank_accounts(profile_id, is_default);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_profile ON emergency_contacts(profile_id, priority);
CREATE INDEX IF NOT EXISTS idx_activity_logs_profile ON activity_logs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type, created_at DESC);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Addresses: owner-only
CREATE POLICY addresses_self ON addresses
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Pickup locations: owner-only
CREATE POLICY pickup_locations_self ON pickup_locations
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Notification preferences: owner-only
CREATE POLICY notification_prefs_self ON notification_preferences
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Bank accounts: owner-only
CREATE POLICY bank_accounts_self ON bank_accounts
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Emergency contacts: owner-only
CREATE POLICY emergency_contacts_self ON emergency_contacts
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Privacy settings: owner-only
CREATE POLICY privacy_settings_self ON privacy_settings
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Activity logs: owner read, system insert
CREATE POLICY activity_logs_self_read ON activity_logs
  FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY activity_logs_self_insert ON activity_logs
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Admin can read all
CREATE POLICY addresses_admin ON addresses
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY bank_accounts_admin ON bank_accounts
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY activity_logs_admin ON activity_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));
