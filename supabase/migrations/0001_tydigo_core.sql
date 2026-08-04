-- ============================================================================
-- Tydigo Core Database Schema
-- ============================================================================
-- This migration defines the foundational schema for the Tydigo platform.
-- Designed for Supabase PostgreSQL with PostGIS support.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'business', 'collector', 'partner', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pickup_status AS ENUM (
    'draft', 'requested', 'matching_collector', 'collector_assigned',
    'collector_en_route', 'collector_arrived', 'pickup_verified',
    'waste_picked', 'in_transit_to_destination', 'delivered_to_partner',
    'completed', 'cancelled', 'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE waste_type AS ENUM (
    'plastic', 'organic', 'general_waste', 'paper_cardboard',
    'metal_cans', 'glass', 'e_waste', 'mixed_waste'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'pay_on_pickup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_transaction_type AS ENUM (
    'payment_received', 'payment_sent', 'refund', 'bonus', 'withdrawal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ecopoint_status AS ENUM ('pending', 'confirmed', 'redeemed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE impact_credit_status AS ENUM ('pending', 'verified', 'issued', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('open', 'investigating', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE partner_type AS ENUM (
    'plastic_recycler', 'bsf_farmer', 'compost_producer', 'paper_recycler',
    'metal_buyer', 'glass_recycler', 'e_waste_partner', 'csr_sponsor',
    'government_ngo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Users & Profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,

  -- Location
  default_city TEXT DEFAULT 'Abuja',
  default_state TEXT DEFAULT 'FCT',
  default_lat DOUBLE PRECISION,
  default_lng DOUBLE PRECISION,

  -- Stats
  ecopoints INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 5.0,
  total_pickups INTEGER NOT NULL DEFAULT 0,
  total_kg_recycled REAL NOT NULL DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  household_size INTEGER,
  preferred_pickup_window TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  rc_number TEXT,
  address TEXT,
  waste_volume_estimate_kg REAL
);

CREATE TABLE IF NOT EXISTS collector_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  vehicle_type TEXT,
  vehicle_plate_number TEXT,
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  safety_training_completed BOOLEAN NOT NULL DEFAULT false,
  total_earnings_ngn INTEGER NOT NULL DEFAULT 0,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  service_city TEXT DEFAULT 'Abuja',
  service_zones TEXT[],
  max_capacity_kg REAL
);

CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  partner_type partner_type NOT NULL,
  organization_name TEXT NOT NULL,
  rc_number TEXT,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Abuja',
  state TEXT DEFAULT 'FCT',
  accepted_materials TEXT[],
  processing_capacity_kg_per_week REAL,
  impact_credits INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false
);

-- ── KYC Documents ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES profiles(id),
  review_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ── Pickup Addresses ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Requests ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  waste_type waste_type NOT NULL,
  estimated_weight_kg REAL NOT NULL,
  actual_weight_kg REAL,
  sorting_verified BOOLEAN NOT NULL DEFAULT false,
  photos TEXT[],

  -- Location
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_instructions TEXT,

  -- Scheduling
  requested_window TEXT,
  scheduled_at TIMESTAMPTZ,

  -- Collector
  collector_id UUID REFERENCES profiles(id),
  collector_assigned_at TIMESTAMPTZ,
  collector_arrived_at TIMESTAMPTZ,
  pickup_verified_at TIMESTAMPTZ,
  waste_picked_at TIMESTAMPTZ,

  -- Delivery
  destination_type TEXT,
  destination_id UUID,
  delivered_at TIMESTAMPTZ,

  -- Codes
  pickup_code TEXT UNIQUE NOT NULL,
  verification_code TEXT,

  -- Pricing
  base_price_ngn INTEGER,
  waste_modifier_ngn INTEGER,
  platform_fee_ngn INTEGER,
  ecopoints_discount_ngn INTEGER,
  final_total_ngn INTEGER,

  -- Status
  status pickup_status NOT NULL DEFAULT 'draft',
  payment_status payment_status NOT NULL DEFAULT 'pending',

  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

-- ── Pickup Photos ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'waste', -- 'waste', 'pickup_proof', 'dropoff_proof'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Status Events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  from_status pickup_status,
  to_status pickup_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Collector Locations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS collector_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collector_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  accuracy REAL,
  heading REAL,
  speed REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Waste Categories ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waste_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type waste_type NOT NULL,
  description TEXT,
  base_price_per_kg_ngn INTEGER,
  modifier_percent INTEGER DEFAULT 0,
  eco_points_per_kg INTEGER DEFAULT 0,
  is_recyclable BOOLEAN NOT NULL DEFAULT false,
  is_organic BOOLEAN NOT NULL DEFAULT false,
  icon TEXT
);

-- ── Waste Batches ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waste_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL,
  quantity_kg REAL NOT NULL,
  quality_grade TEXT,
  contamination_pct REAL,
  source_pickup_ids UUID[],
  source_zone TEXT,
  delivered_at TIMESTAMPTZ,
  received_by UUID REFERENCES profiles(id),
  verified BOOLEAN NOT NULL DEFAULT false,
  proof_photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Partner Material Requests ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_material_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL,
  quantity_kg REAL NOT NULL,
  frequency TEXT,
  quality_rules TEXT,
  contamination_max_pct REAL DEFAULT 5,
  preferred_city TEXT DEFAULT 'Abuja',
  preferred_zones TEXT[],
  price_per_kg_ngn REAL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Payments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE SET NULL,
  payer_id UUID REFERENCES profiles(id),
  payee_id UUID REFERENCES profiles(id),
  amount_ngn INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT UNIQUE NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Wallets ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance_ngn INTEGER NOT NULL DEFAULT 0,
  total_earned_ngn INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  amount_ngn INTEGER NOT NULL,
  type wallet_transaction_type NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── EcoPoints ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ecopoint_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status ecopoint_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Impact Credits ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impact_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES waste_batches(id) ON DELETE SET NULL,
  credits INTEGER NOT NULL,
  metric_type TEXT NOT NULL,
  description TEXT,
  status impact_credit_status NOT NULL DEFAULT 'pending',
  esg_report_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ratings ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES profiles(id),
  ratee_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Complaints ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filed_by UUID REFERENCES profiles(id),
  against_id UUID REFERENCES profiles(id),
  pickup_id UUID REFERENCES pickup_requests(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status complaint_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Push Subscriptions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── City Zones ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS city_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city TEXT NOT NULL,
  zone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'FCT',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  boundary GEOGRAPHY(POLYGON, 4326),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city, zone)
);

-- ── Pricing Rules ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  waste_type waste_type,
  min_kg REAL,
  max_kg REAL,
  base_price_ngn INTEGER NOT NULL,
  per_kg_price_ngn INTEGER,
  modifier_percent INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Reward Rules ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reward_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role user_role NOT NULL,
  trigger_event TEXT NOT NULL,
  points INTEGER NOT NULL,
  cooldown_days INTEGER DEFAULT 0,
  max_per_month INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Admin Audit Logs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user ON profiles(auth_user_id);

-- Collectors
CREATE INDEX IF NOT EXISTS idx_collectors_online ON collector_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_collectors_kyc ON collector_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_collectors_city ON collector_profiles(service_city);

-- Pickups
CREATE INDEX IF NOT EXISTS idx_pickups_customer ON pickup_requests(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pickups_collector ON pickup_requests(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickups_payment ON pickup_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_pickups_created ON pickup_requests(created_at DESC);

-- Collector locations
CREATE INDEX IF NOT EXISTS idx_collector_locations_geo ON collector_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_collector_locations_collector ON collector_locations(collector_id, recorded_at DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_pickup ON payments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(provider_reference);

-- EcoPoints
CREATE INDEX IF NOT EXISTS idx_ecopoints_profile ON ecopoint_transactions(profile_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read, created_at DESC);

-- Push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subs_profile ON push_subscriptions(profile_id);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_type, target_id);

-- City zones
CREATE INDEX IF NOT EXISTS idx_zones_city ON city_zones(city, is_active);
CREATE INDEX IF NOT EXISTS idx_zones_geo ON city_zones USING GIST(boundary);

-- Partners
CREATE INDEX IF NOT EXISTS idx_partners_type ON partner_profiles(partner_type);
CREATE INDEX IF NOT EXISTS idx_partners_city ON partner_profiles(city);
CREATE INDEX IF NOT EXISTS idx_material_requests_partner ON partner_material_requests(partner_id, is_active);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecopoint_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own
CREATE POLICY profiles_self ON profiles
  FOR ALL USING (auth.uid() = auth_user_id);

-- Profiles: admins can read all
CREATE POLICY profiles_admin ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role = 'admin')
  );

-- Pickup requests: customers see their own
CREATE POLICY pickups_customer ON pickup_requests
  FOR ALL USING (customer_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

-- Pickup requests: collectors see assigned or available
CREATE POLICY pickups_collector ON pickup_requests
  FOR SELECT USING (
    collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR (status = 'requested' AND EXISTS (
      SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'collector'
    ))
  );

-- Pickup requests: admins see all
CREATE POLICY pickups_admin ON pickup_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Payments: users see their own
CREATE POLICY payments_self ON payments
  FOR SELECT USING (
    payer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR payee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- KYC: private to owner and admin
CREATE POLICY kyc_owner ON kyc_documents
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY kyc_admin ON kyc_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Push subscriptions: owner only
CREATE POLICY push_subs_self ON push_subscriptions
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ── Seed Data: City Zones ───────────────────────────────────────────────────

INSERT INTO city_zones (city, zone, state) VALUES
  ('Abuja', 'Gwarinpa', 'FCT'),
  ('Abuja', 'Jabi', 'FCT'),
  ('Abuja', 'Wuse', 'FCT'),
  ('Abuja', 'Garki', 'FCT'),
  ('Abuja', 'Lokogoma', 'FCT'),
  ('Abuja', 'Life Camp', 'FCT'),
  ('Abuja', 'Kubwa', 'FCT'),
  ('Abuja', 'Lugbe', 'FCT'),
  ('Abuja', 'Maitama', 'FCT'),
  ('Abuja', 'Asokoro', 'FCT')
ON CONFLICT (city, zone) DO NOTHING;

-- ── Seed Data: Pricing Rules ────────────────────────────────────────────────

INSERT INTO pricing_rules (name, min_kg, max_kg, base_price_ngn, per_kg_price_ngn) VALUES
  ('Residential 1-5kg', 1, 5, 1000, 200),
  ('Residential 6-10kg', 6, 10, 1500, 150),
  ('Residential 11-20kg', 11, 20, 2500, 125),
  ('Residential 21-40kg', 21, 40, 4000, 100),
  ('Residential 40kg+', 40, NULL, 5000, 80);

INSERT INTO pricing_rules (name, waste_type, modifier_percent) VALUES
  ('Plastic Discount', 'plastic', -10),
  ('Organic Discount', 'organic', -10),
  ('Mixed Waste Surcharge', 'mixed_waste', 15),
  ('E-Waste Special', 'e_waste', 0);

-- ── Seed Data: Reward Rules ─────────────────────────────────────────────────

INSERT INTO reward_rules (name, role, trigger_event, points) VALUES
  ('Signup KYC Complete', 'customer', 'kyc_completed', 500),
  ('First Pickup', 'customer', 'first_pickup_completed', 1000),
  ('Clear Waste Photo', 'customer', 'clear_waste_photo', 100),
  ('Sorted Plastic', 'customer', 'waste_sorted_plastic', 300),
  ('Sorted Organic', 'customer', 'waste_sorted_organic', 300),
  ('Pickup 5kg+', 'customer', 'pickup_verified_5kg', 200),
  ('Pickup 10kg+', 'customer', 'pickup_verified_10kg', 500),
  ('Pickup 25kg+', 'customer', 'pickup_verified_25kg', 1500),
  ('Referral Verified', 'customer', 'referral_verified', 1500),
  ('Illegal Dumping Report', 'customer', 'illegal_dumping_report', 500),
  ('Collector KYC Complete', 'collector', 'kyc_completed', 1000),
  ('Collector First Pickup', 'collector', 'first_pickup_completed', 500),
  ('Five Star Rating', 'collector', 'five_star_rating', 200),
  ('On Time Pickup', 'collector', 'on_time_pickup', 150),
  ('No Complaint Pickup', 'collector', 'no_complaint', 100),
  ('Plastic to Recycler', 'collector', 'plastic_to_recycler', 300),
  ('Organic to BSF/Compost', 'collector', 'organic_to_partner', 300),
  ('20 Pickups Monthly', 'collector', 'twenty_pickups_month', 3000),
  ('Safety Training Done', 'collector', 'safety_training_completed', 2000),
  ('High Rating 30 Days', 'collector', 'high_rating_30_days', 5000);
