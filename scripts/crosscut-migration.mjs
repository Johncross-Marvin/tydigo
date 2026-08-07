const PAT = process.env.SUPABASE_PAT || '';
const PROJECT = process.env.SUPABASE_PROJECT_REF || '';
if (!PAT || !PROJECT) { console.error('Set env vars'); process.exit(1); }
async function run(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, { method: 'POST', headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) }); return r.json(); }

async function main() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS domain_events (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), event_id TEXT UNIQUE NOT NULL, event_type TEXT NOT NULL, aggregate_type TEXT, aggregate_id UUID, actor_profile_id UUID, organization_id UUID, payload JSONB, occurred_at TIMESTAMPTZ DEFAULT now(), published_at TIMESTAMPTZ, processing_status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS notification_deliveries (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), notification_id UUID, profile_id UUID, channel TEXT, provider TEXT, status TEXT DEFAULT 'queued', attempt_count INT DEFAULT 0, idempotency_key TEXT UNIQUE, scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, failed_at TIMESTAMPTZ, provider_reference TEXT, failure_code TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS notification_templates (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), key TEXT UNIQUE, channel TEXT, locale TEXT DEFAULT 'en', title TEXT, body TEXT NOT NULL, variables_schema JSONB, status TEXT DEFAULT 'active', version INT DEFAULT 1, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS analytics_events (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), event_name TEXT NOT NULL, profile_id UUID, organization_id UUID, role TEXT, session_id TEXT, source TEXT DEFAULT 'client', entity_type TEXT, entity_id UUID, properties JSONB, occurred_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`,
  ];

  for (const sql of tables) {
    const r = await run(sql);
    console.log(r.error ? '❌' : '✅', sql.slice(20, 48).trim());
  }

  // RLS
  for (const t of ['domain_events', 'notification_deliveries', 'notification_templates', 'analytics_events']) {
    await run(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  // Seed templates
  await run(`INSERT INTO notification_templates (key, channel, title, body, variables_schema) VALUES ('pickup_assigned', 'in_app', 'Collector Assigned', '{{collector_name}} is on the way to your pickup', '{"collector_name":"string","eta":"string"}'), ('payment_received', 'in_app', 'Payment Confirmed', 'Your payment of {{amount}} has been received', '{"amount":"string"}'), ('pickup_completed', 'in_app', 'Pickup Completed', 'Your pickup {{reference}} has been completed', '{"reference":"string"}'), ('eco_points_earned', 'in_app', 'EcoPoints Earned', 'You earned {{points}} EcoPoints', '{"points":"number"}'), ('kyc_approved', 'in_app', 'Verification Approved', 'Your verification has been approved', '{}') ON CONFLICT DO NOTHING`);

  console.log('\nCross-cutting infrastructure: 4 tables + RLS + templates');
}
main().catch(e => console.error(e.message));
