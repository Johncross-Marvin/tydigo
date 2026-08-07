const PAT = process.env.SUPABASE_PAT || '';
const PROJECT = process.env.SUPABASE_PROJECT_REF || '';

if (!PAT || !PROJECT) {
  console.error('Set SUPABASE_PAT and SUPABASE_PROJECT_REF environment variables');
  process.exit(1);
}

async function run(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

async function main() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS sustainability_facts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), fact_type TEXT NOT NULL, subject_type TEXT, subject_id UUID, profile_id UUID, pickup_id UUID, waste_batch_id UUID, trade_id UUID, city_id UUID, zone_id UUID, waste_category_id UUID, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, quantity_value NUMERIC NOT NULL, quantity_unit TEXT NOT NULL, verification_level TEXT DEFAULT 'system_calculated', source_type TEXT, source_id UUID, methodology_id UUID, methodology_version_id UUID, calculation_id UUID, metadata JSONB, occurred_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS impact_methodologies (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, description TEXT, metric_type TEXT, scope TEXT, authority_source TEXT, source_reference TEXT, version INT DEFAULT 1, effective_from TIMESTAMPTZ, effective_to TIMESTAMPTZ, status TEXT DEFAULT 'active', calculation_definition JSONB, notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS impact_factors (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), methodology_id UUID REFERENCES impact_methodologies(id), methodology_version INT DEFAULT 1, metric_type TEXT, material_type TEXT, treatment_type TEXT, factor_value NUMERIC NOT NULL, factor_unit TEXT, input_unit TEXT, output_unit TEXT, uncertainty_pct REAL, effective_from TIMESTAMPTZ, effective_to TIMESTAMPTZ, verification_status TEXT DEFAULT 'active', source_reference TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS impact_calculations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), metric_type TEXT, source_type TEXT, source_id UUID, methodology_id UUID, methodology_version INT, input_quantity NUMERIC, input_unit TEXT, factor_id UUID, baseline_type TEXT, result_value NUMERIC, result_unit TEXT, verification_level TEXT, uncertainty_value NUMERIC, calculation_payload JSONB, calculated_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sustainability_score_models (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, description TEXT, version INT DEFAULT 1, eligible_roles TEXT[], minimum_data_requirements TEXT, scoring_rules JSONB, effective_from TIMESTAMPTZ, effective_to TIMESTAMPTZ, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sustainability_targets (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subject_type TEXT, subject_id UUID, metric_type TEXT, baseline_value NUMERIC, target_value NUMERIC, unit TEXT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, status TEXT DEFAULT 'active', created_by UUID, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS impact_reports (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), report_reference TEXT UNIQUE, report_type TEXT, subject_type TEXT, subject_id UUID, reporting_period_start TIMESTAMPTZ, reporting_period_end TIMESTAMPTZ, status TEXT DEFAULT 'draft', methodology_bundle_version TEXT, data_cutoff_at TIMESTAMPTZ, snapshot_payload JSONB, verification_level TEXT, generated_by UUID, generated_at TIMESTAMPTZ, finalized_at TIMESTAMPTZ, supersedes_report_id UUID, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sustainability_metrics (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, description TEXT, category TEXT, base_unit TEXT, calculation_type TEXT, methodology_required BOOLEAN DEFAULT false, public_visibility BOOLEAN DEFAULT true, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS impact_data_issues (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), issue_type TEXT, source_type TEXT, source_id UUID, severity TEXT DEFAULT 'low', status TEXT DEFAULT 'open', details TEXT, created_at TIMESTAMPTZ DEFAULT now(), resolved_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS impact_processing_jobs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), job_type TEXT, scope_type TEXT, scope_id UUID, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, methodology_version INT, status TEXT DEFAULT 'pending', started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, error_summary TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sdg_goals (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), goal_number INT UNIQUE, title TEXT, description TEXT, color TEXT, icon TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sdg_targets (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), goal_id UUID REFERENCES sdg_goals(id), target_code TEXT, title TEXT, description TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS sdg_indicator_mappings (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), target_id UUID REFERENCES sdg_targets(id), tydigo_metric_code TEXT, mapping_description TEXT, methodology_notes TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now())`,
  ];

  for (const sql of tables) {
    const r = await run(sql);
    console.log(r.error ? '❌' : '✅', sql.slice(20, 55).trim());
  }

  // RLS
  for (const t of ['sustainability_facts', 'impact_methodologies', 'impact_factors', 'impact_calculations', 'sustainability_score_models', 'sustainability_targets', 'impact_reports', 'sustainability_metrics', 'impact_data_issues', 'impact_processing_jobs', 'sdg_goals', 'sdg_targets', 'sdg_indicator_mappings']) {
    await run(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  // Seed SDGs
  const sdgs = [
    [11, 'Sustainable Cities', 'Make cities inclusive, safe, resilient and sustainable', '#F99D26', '🏙️'],
    [12, 'Responsible Consumption', 'Ensure sustainable consumption and production patterns', '#BF8B2E', '♻️'],
    [13, 'Climate Action', 'Take urgent action to combat climate change', '#3F7E44', '🌍'],
    [15, 'Life on Land', 'Protect and restore terrestrial ecosystems', '#56C02B', '🌿'],
    [17, 'Partnerships', 'Strengthen global partnerships for sustainable development', '#19486A', '🤝'],
  ];
  for (const [num, title, desc, color, icon] of sdgs) {
    await run(`INSERT INTO sdg_goals (goal_number, title, description, color, icon) VALUES (${num}, '${title}', '${desc}', '${color}', '${icon}') ON CONFLICT DO NOTHING`);
  }

  // Seed metrics
  const metrics = [
    ['waste_diverted_kg', 'Waste Diverted', 'Total verified waste diverted from disposal', 'diversion', 'kg', 'aggregate', false],
    ['recycling_rate_pct', 'Recycling Rate', 'Percentage of eligible material recycled', 'recycling', 'pct', 'aggregate', true],
    ['estimated_co2e_avoided_kg', 'Estimated CO2e Avoided', 'Estimated greenhouse gas emissions avoided', 'carbon', 'kgCO2e', 'calculated', true],
    ['waste_collected_kg', 'Waste Collected', 'Total verified waste collected', 'collection', 'kg', 'aggregate', false],
    ['material_recovered_kg', 'Material Recovered', 'Material recovered through recycling', 'recycling', 'kg', 'aggregate', false],
  ];
  for (const [code, name, desc, cat, unit, calc, meth] of metrics) {
    await run(`INSERT INTO sustainability_metrics (code, name, description, category, base_unit, calculation_type, methodology_required) VALUES ('${code}', '${name}', '${desc}', '${cat}', '${unit}', '${calc}', ${meth}) ON CONFLICT DO NOTHING`);
  }

  // Seed methodology
  await run(`INSERT INTO impact_methodologies (code, name, description, metric_type, scope, version, status) VALUES ('tydigo_carbon_v1', 'Tydigo Carbon Impact v1', 'Initial carbon impact estimation methodology for waste diversion', 'estimated_co2e_avoided_kg', 'platform', 1, 'active') ON CONFLICT DO NOTHING`);

  console.log('\nPhase 10: 13 tables + RLS + 5 SDGs + 5 metrics + methodology');
}

main().catch(e => console.error(e.message));
