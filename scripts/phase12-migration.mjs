const PAT = process.env.SUPABASE_PAT || '';
const PROJECT = process.env.SUPABASE_PROJECT_REF || '';
if (!PAT || !PROJECT) { console.error('Set SUPABASE_PAT and SUPABASE_PROJECT_REF'); process.exit(1); }

async function run(query) { const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, { method: 'POST', headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); return r.json(); }

async function main() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS referral_events (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), referral_id UUID, event_type TEXT, source_type TEXT, source_id UUID, idempotency_key TEXT UNIQUE, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS invitations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), invitation_reference TEXT UNIQUE, invitation_type TEXT, organization_id UUID, invited_email TEXT, invited_role TEXT, invited_by_profile_id UUID, token_hash TEXT, status TEXT DEFAULT 'pending', expires_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS affiliate_accounts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), profile_id UUID, organization_id UUID, affiliate_code TEXT UNIQUE, status TEXT DEFAULT 'pending', commission_plan_id UUID, kyc_status TEXT, created_at TIMESTAMPTZ DEFAULT now(), approved_at TIMESTAMPTZ, suspended_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS affiliate_commission_plans (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, commission_type TEXT, commission_value NUMERIC, currency CHAR(3) DEFAULT 'NGN', min_payout_minor BIGINT, active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS affiliate_conversions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), affiliate_id UUID, subject_profile_id UUID, context_type TEXT, context_id UUID, gross_value_minor BIGINT, commission_minor BIGINT, currency CHAR(3) DEFAULT 'NGN', status TEXT DEFAULT 'pending', qualified_at TIMESTAMPTZ, idempotency_key TEXT UNIQUE, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS organization_memberships (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id UUID, profile_id UUID, role TEXT DEFAULT 'member', status TEXT DEFAULT 'active', invited_by UUID, joined_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(organization_id, profile_id))`,
    `CREATE TABLE IF NOT EXISTS service_contracts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), contract_reference TEXT UNIQUE, organization_id UUID, contract_type TEXT, jurisdiction_id UUID, status TEXT DEFAULT 'draft', title TEXT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, currency CHAR(3) DEFAULT 'NGN', contract_value_minor BIGINT, service_scope JSONB, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS advertiser_accounts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id UUID, status TEXT DEFAULT 'pending', verification_status TEXT DEFAULT 'unverified', created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS ad_campaigns (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), advertiser_id UUID, name TEXT, campaign_type TEXT, status TEXT DEFAULT 'draft', starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, budget_minor BIGINT, currency CHAR(3) DEFAULT 'NGN', targeting_rules JSONB, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS ad_creatives (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), campaign_id UUID, format TEXT, headline TEXT, body TEXT, cta_text TEXT, destination_url TEXT, status TEXT DEFAULT 'draft', review_status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS developer_applications (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id UUID, name TEXT, description TEXT, environment TEXT DEFAULT 'test', status TEXT DEFAULT 'active', created_by UUID, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS api_credentials (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), developer_application_id UUID, key_prefix TEXT, secret_hash TEXT, scopes TEXT[], status TEXT DEFAULT 'active', expires_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), revoked_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS webhook_endpoints (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), developer_application_id UUID, url TEXT, status TEXT DEFAULT 'active', secret_hash TEXT, events TEXT[], created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS webhook_deliveries (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), endpoint_id UUID, event_id TEXT, attempt INT DEFAULT 1, status_code INT, status TEXT, next_retry_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS platform_tenants (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id UUID, slug TEXT UNIQUE, status TEXT DEFAULT 'active', tenant_type TEXT, configuration JSONB, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS tenant_branding (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID REFERENCES platform_tenants(id), brand_name TEXT, logo_path TEXT, favicon_path TEXT, primary_color TEXT, secondary_color TEXT, support_email TEXT, custom_domain TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS country_configurations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), country_code TEXT UNIQUE, currency CHAR(3), default_locale TEXT DEFAULT 'en', timezone TEXT, phone_country_code TEXT, address_format TEXT, measurement_system TEXT DEFAULT 'metric', enabled BOOLEAN DEFAULT false, launch_status TEXT DEFAULT 'planned', created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS assistant_threads (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), profile_id UUID, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS assistant_messages (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), thread_id UUID, role TEXT, content TEXT, tool_calls JSONB, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS prediction_models (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), model_type TEXT, version INT DEFAULT 1, status TEXT DEFAULT 'training', training_period TEXT, feature_schema JSONB, metrics JSONB, created_at TIMESTAMPTZ DEFAULT now(), activated_at TIMESTAMPTZ, retired_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS predictions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), model_id UUID, prediction_type TEXT, scope_type TEXT, scope_id UUID, target_time TIMESTAMPTZ, predicted_value NUMERIC, lower_bound NUMERIC, upper_bound NUMERIC, unit TEXT, generated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS iot_devices (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), device_reference TEXT UNIQUE, device_type TEXT, provider TEXT, organization_id UUID, status TEXT DEFAULT 'active', firmware_version TEXT, last_seen_at TIMESTAMPTZ, metadata JSONB, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS iot_telemetry (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), device_id UUID, metric_type TEXT, numeric_value NUMERIC, text_value TEXT, unit TEXT, recorded_at TIMESTAMPTZ, received_at TIMESTAMPTZ DEFAULT now(), quality TEXT DEFAULT 'ok')`,
    `CREATE TABLE IF NOT EXISTS smart_bin_state (device_id UUID PRIMARY KEY REFERENCES iot_devices(id), fill_percent REAL, weight_kg REAL, battery_percent REAL, status TEXT, last_emptied_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS environmental_assets (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), asset_type TEXT, methodology_id UUID, registry_reference TEXT, vintage_year INT, quantity NUMERIC, unit TEXT, owner_organization_id UUID, status TEXT DEFAULT 'held', verification_status TEXT DEFAULT 'unverified', issued_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS carbon_projects (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), project_reference TEXT UNIQUE, owner_organization_id UUID, methodology_id UUID, geography TEXT, status TEXT DEFAULT 'draft', verification_provider TEXT, registry TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
  ];

  let count = 0;
  for (const sql of tables) {
    const r = await run(sql);
    if (!r.error) count++;
    console.log(r.error ? '❌' : '✅', sql.slice(20, 48).trim());
  }

  // RLS
  for (const t of ['referral_events','invitations','affiliate_accounts','affiliate_commission_plans','affiliate_conversions','organization_memberships','service_contracts','advertiser_accounts','ad_campaigns','ad_creatives','developer_applications','api_credentials','webhook_endpoints','webhook_deliveries','platform_tenants','tenant_branding','country_configurations','assistant_threads','assistant_messages','prediction_models','predictions','iot_devices','iot_telemetry','smart_bin_state','environmental_assets','carbon_projects']) {
    await run(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  // Seed Nigeria
  await run(`INSERT INTO country_configurations (country_code, currency, default_locale, timezone, phone_country_code, measurement_system, enabled, launch_status) VALUES ('NG', 'NGN', 'en', 'Africa/Lagos', '+234', 'metric', true, 'active') ON CONFLICT DO NOTHING`);

  console.log(`\nPhase 12: ${count}/26 tables created + RLS + Nigeria seeded`);
}

main().catch(e => console.error(e.message));
