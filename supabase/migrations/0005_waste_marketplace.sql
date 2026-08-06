-- ============================================================================
-- Tydigo Phase 4: Waste Marketplace Core
-- ============================================================================
-- Adds: pickup_items, pickup_images, collector_assignments, pickup_tracking,
--       pickup_status_events, digital_receipts, pricing_rules
-- ============================================================================

-- ── Pickup Items (multi-waste-category support) ──────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  waste_category_id UUID REFERENCES waste_categories(id) ON DELETE SET NULL,
  estimated_weight_kg REAL NOT NULL DEFAULT 0,
  verified_weight_kg REAL,
  price_per_kg_ngn INTEGER,
  subtotal_ngn INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Images ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  analysis_status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Collector Assignments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS collector_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  distance_km REAL,
  estimated_arrival_minutes INTEGER,
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Tracking (real-time location) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed REAL,
  heading REAL,
  accuracy REAL,
  battery_level REAL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pickup Status Events (audit trail) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Digital Receipts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digital_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE UNIQUE,
  receipt_number TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Pricing Rules ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waste_category_id UUID REFERENCES waste_categories(id) ON DELETE CASCADE,
  minimum_fee_ngn INTEGER NOT NULL DEFAULT 500,
  price_per_kg_ngn INTEGER NOT NULL DEFAULT 100,
  city TEXT,
  zone TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pickup_items_request ON pickup_items(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_pickup_images_request ON pickup_images(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_pickup ON collector_assignments(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_collector ON collector_assignments(collector_id, accepted_at);
CREATE INDEX IF NOT EXISTS idx_pickup_tracking_request ON pickup_tracking(pickup_request_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_tracking_collector ON pickup_tracking(collector_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_status_events_request ON pickup_status_events(pickup_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_request ON digital_receipts(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_category ON pricing_rules(waste_category_id, city, is_active);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Pickup items: customer + collector + admin
CREATE POLICY pickup_items_customer ON pickup_items FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY pickup_items_collector ON pickup_items FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY pickup_items_admin ON pickup_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- Pickup images: same pattern
CREATE POLICY pickup_images_customer ON pickup_images FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY pickup_images_collector ON pickup_images FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY pickup_images_insert ON pickup_images FOR INSERT
  WITH CHECK (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

-- Collector assignments: customer read, collector read, admin all
CREATE POLICY collector_assignments_customer ON collector_assignments FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY collector_assignments_collector ON collector_assignments FOR ALL
  USING (collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY collector_assignments_admin ON collector_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- Pickup tracking: customer + collector read, collector insert
CREATE POLICY pickup_tracking_customer ON pickup_tracking FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY pickup_tracking_collector ON pickup_tracking FOR ALL
  USING (collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Status events: customer + collector read
CREATE POLICY pickup_status_events_read ON pickup_status_events FOR SELECT
  USING (pickup_request_id IN (
    SELECT id FROM pickup_requests WHERE
      customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY pickup_status_events_insert ON pickup_status_events FOR INSERT
  WITH CHECK (true); -- System inserts only, validated by edge functions

-- Digital receipts: customer + collector read
CREATE POLICY digital_receipts_customer ON digital_receipts FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY digital_receipts_collector ON digital_receipts FOR SELECT
  USING (pickup_request_id IN (SELECT id FROM pickup_requests WHERE collector_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

-- Pricing rules: public read, admin all
CREATE POLICY pricing_rules_public ON pricing_rules FOR SELECT USING (true);
CREATE POLICY pricing_rules_admin ON pricing_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));
