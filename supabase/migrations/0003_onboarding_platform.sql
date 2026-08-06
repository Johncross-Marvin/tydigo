-- ============================================================================
-- Tydigo Phase 2: User Onboarding Platform
-- ============================================================================
-- Adds: onboarding_journeys, onboarding_steps, user_onboarding_progress,
--       user_tutorials, tooltips_seen, onboarding_analytics tables.
-- ============================================================================

-- ── Onboarding Journeys ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Onboarding Steps ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES onboarding_journeys(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon TEXT,
  illustration TEXT,
  video_url TEXT,
  estimated_minutes INTEGER DEFAULT 2,
  action_type TEXT DEFAULT 'info',
  action_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(journey_id, step_number)
);

-- ── User Onboarding Progress ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES onboarding_journeys(id) ON DELETE CASCADE,
  step_id UUID REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent INTEGER DEFAULT 0,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, step_id)
);

-- ── User Tutorials ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_tutorials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tutorial_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, tutorial_key)
);

-- ── Tooltips Seen ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tooltips_seen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tooltip_key TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, tooltip_key)
);

-- ── Onboarding Analytics ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES onboarding_journeys(id) ON DELETE CASCADE,
  step_id UUID REFERENCES onboarding_steps(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,  -- 'step_started', 'step_completed', 'step_skipped',
                              -- 'journey_completed', 'journey_abandoned'
  time_spent_seconds INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Help Articles (Knowledge Base) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  icon TEXT,
  role TEXT,  -- null = all roles
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_profile ON user_onboarding_progress(profile_id, completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_journey ON user_onboarding_progress(journey_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_profile ON user_tutorials(profile_id);
CREATE INDEX IF NOT EXISTS idx_tooltips_profile ON tooltips_seen(profile_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_profile ON onboarding_analytics(profile_id, event_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_journey ON onboarding_analytics(journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_help_articles_role ON help_articles(role);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE onboarding_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooltips_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Public read for journeys, steps, and help articles
CREATE POLICY journeys_public_read ON onboarding_journeys FOR SELECT USING (true);
CREATE POLICY steps_public_read ON onboarding_steps FOR SELECT USING (true);
CREATE POLICY help_articles_public_read ON help_articles FOR SELECT USING (is_published = true);

-- User progress: owner only
CREATE POLICY progress_self ON user_onboarding_progress
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Tutorials: owner only
CREATE POLICY tutorials_self ON user_tutorials
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Tooltips: owner only
CREATE POLICY tooltips_self ON tooltips_seen
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Analytics: owner read, system insert
CREATE POLICY analytics_self_read ON onboarding_analytics
  FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY analytics_self_insert ON onboarding_analytics
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Admin can manage help articles
CREATE POLICY help_articles_admin ON help_articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- ── Seed: Help Articles ──────────────────────────────────────────────────────

INSERT INTO help_articles (title, slug, category, content, excerpt, icon, role, sort_order) VALUES
  ('Getting Started with Tydigo', 'getting-started', 'general',
   'Tydigo is a waste management platform that connects households with verified collectors. Schedule pickups, sort your waste, and earn EcoPoints rewards.',
   'Learn the basics of Tydigo and how to get started.', 'Home', null, 1),
  ('How to Schedule a Pickup', 'schedule-pickup', 'household',
   '1. Go to your dashboard. 2. Tap "Request Pickup". 3. Select your waste type. 4. Choose a pickup time. 5. Confirm your address. A verified collector will be assigned.',
   'Step-by-step guide to scheduling your first waste pickup.', 'Truck', 'household', 2),
  ('Understanding EcoPoints', 'ecopoints-guide', 'general',
   'EcoPoints are rewards you earn for recycling. Earn points for every pickup, referral, and challenge. Redeem for cash, discounts, or donate to environmental causes.',
   'How EcoPoints work and how to maximize your earnings.', 'Award', null, 3),
  ('Waste Sorting Guide', 'waste-sorting', 'household',
   'Proper sorting increases your EcoPoints. Plastic → Blue bin. Organic → Green bin. Paper → Yellow bin. Glass → White bin. Metal → Red bin. E-waste → separate collection.',
   'Learn how to properly sort your waste for maximum rewards.', 'Recycle', 'household', 4),
  ('Collector Code of Conduct', 'collector-conduct', 'collector',
   '1. Be punctual. 2. Handle waste properly. 3. Respect customers. 4. Follow safety guidelines. 5. Verify pickups with QR codes. 6. Report issues immediately.',
   'Professional standards for Tydigo collectors.', 'Shield', 'collector', 5),
  ('How Collector Earnings Work', 'collector-earnings', 'collector',
   'Earnings = Base pay per pickup + weight bonus + EcoPoints + tips. Higher ratings unlock bonus tiers. Complete 20+ pickups monthly for the Pro tier.',
   'Understand your earning potential as a collector.', 'DollarSign', 'collector', 6),
  ('Business Bulk Pickup Guide', 'business-bulk', 'business',
   'Add multiple locations, set recurring schedules, and track your environmental impact with detailed ESG reports.',
   'Managing bulk waste collection for your business.', 'Building2', 'business', 7),
  ('Recycler Material Requirements', 'recycler-materials', 'recycler',
   'Set your accepted materials, minimum quantities, and price per kg. Collectors will deliver sorted waste directly to your warehouse.',
   'How to set up your recycling operation on Tydigo.', 'Package', 'recycler', 8)
ON CONFLICT (slug) DO NOTHING;
