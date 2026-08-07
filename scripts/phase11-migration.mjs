const PAT = process.env.SUPABASE_PAT || '';
const PROJECT = process.env.SUPABASE_PROJECT_REF || '';
if (!PAT || !PROJECT) { console.error('Set SUPABASE_PAT and SUPABASE_PROJECT_REF'); process.exit(1); }

async function run(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

async function main() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS admin_roles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, code TEXT UNIQUE, description TEXT, is_system BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS permissions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, category TEXT, description TEXT, created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS admin_role_permissions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), role_id UUID REFERENCES admin_roles(id), permission_id UUID REFERENCES permissions(id), UNIQUE(role_id, permission_id))`,
    `CREATE TABLE IF NOT EXISTS admin_user_roles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), profile_id UUID REFERENCES profiles(id), role_id UUID REFERENCES admin_roles(id), granted_by UUID, granted_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true, UNIQUE(profile_id, role_id))`,
    `CREATE TABLE IF NOT EXISTS fraud_cases (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), case_reference TEXT UNIQUE, subject_type TEXT, subject_id UUID, risk_score INT, severity TEXT DEFAULT 'low', category TEXT, status TEXT DEFAULT 'new', assigned_to UUID, summary TEXT, created_at TIMESTAMPTZ DEFAULT now(), reviewed_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, resolution TEXT)`,
    `CREATE TABLE IF NOT EXISTS system_settings (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), key TEXT UNIQUE NOT NULL, value JSONB NOT NULL, value_type TEXT DEFAULT 'string', scope TEXT DEFAULT 'global', description TEXT, is_sensitive BOOLEAN DEFAULT false, version INT DEFAULT 1, updated_by UUID, updated_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS feature_flags (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT UNIQUE, name TEXT, description TEXT, is_active BOOLEAN DEFAULT false, target_type TEXT DEFAULT 'global', target_value TEXT, rollout_percentage INT DEFAULT 100, updated_by UUID, updated_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`,
  ];

  for (const sql of tables) {
    const r = await run(sql);
    console.log(r.error ? '❌' : '✅', sql.slice(20, 50).trim());
  }

  // RLS
  for (const t of ['admin_roles', 'permissions', 'admin_role_permissions', 'admin_user_roles', 'fraud_cases', 'system_settings', 'feature_flags']) {
    await run(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  }

  // Seed admin roles
  const roles = [
    ['Super Admin', 'super_admin', 'Full platform control', true],
    ['Platform Operations', 'platform_ops', 'Operational monitoring and management', false],
    ['Customer Support', 'support', 'Customer-facing support operations', false],
    ['KYC Reviewer', 'kyc_reviewer', 'Identity and document verification', false],
    ['Finance Operator', 'finance_op', 'Payment and settlement operations', false],
    ['Finance Approver', 'finance_approver', 'High-value financial approvals', false],
    ['Risk & Fraud', 'risk_fraud', 'Fraud investigation and risk management', false],
    ['Content Manager', 'content_mgr', 'Content and notification management', false],
    ['Read-Only Auditor', 'auditor', 'Read-only access to audit and reports', false],
  ];
  for (const [name, code, desc, sys] of roles) {
    await run(`INSERT INTO admin_roles (name, code, description, is_system) VALUES ('${name}', '${code}', '${desc}', ${sys}) ON CONFLICT DO NOTHING`);
  }

  // Seed permissions
  const perms = [
    ['users.read', 'View Users', 'users'],
    ['users.manage', 'Manage Users', 'users'],
    ['users.suspend', 'Suspend Users', 'users'],
    ['collectors.read', 'View Collectors', 'collectors'],
    ['collectors.verify', 'Verify Collectors', 'collectors'],
    ['kyc.review', 'Review KYC', 'kyc'],
    ['payments.read', 'View Payments', 'finance'],
    ['refunds.issue', 'Issue Refunds', 'finance'],
    ['wallets.read', 'View Wallets', 'finance'],
    ['wallets.adjust', 'Adjust Wallets', 'finance'],
    ['settlements.read', 'View Settlements', 'finance'],
    ['settlements.manage', 'Manage Settlements', 'finance'],
    ['pricing.read', 'View Pricing', 'pricing'],
    ['pricing.manage', 'Manage Pricing', 'pricing'],
    ['ecopoints.read', 'View EcoPoints', 'ecopoints'],
    ['ecopoints.adjust', 'Adjust EcoPoints', 'ecopoints'],
    ['campaigns.manage', 'Manage Campaigns', 'campaigns'],
    ['fraud.read', 'View Fraud', 'risk'],
    ['fraud.manage', 'Manage Fraud Cases', 'risk'],
    ['content.manage', 'Manage Content', 'content'],
    ['notifications.send', 'Send Notifications', 'notifications'],
    ['reports.generate', 'Generate Reports', 'reports'],
    ['audit.read', 'View Audit Logs', 'audit'],
    ['roles.manage', 'Manage Admin Roles', 'admin'],
    ['system.settings', 'System Settings', 'system'],
  ];
  for (const [code, name, cat] of perms) {
    await run(`INSERT INTO permissions (code, name, category) VALUES ('${code}', '${name}', '${cat}') ON CONFLICT DO NOTHING`);
  }

  console.log('\nPhase 11: 7 tables + RLS + 9 roles + 25 permissions');
}

main().catch(e => console.error(e.message));
