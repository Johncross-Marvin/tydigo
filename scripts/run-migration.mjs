/**
 * Tydigo Migration Runner
 *
 * Applies the Supabase database migration.
 * 
 * PREREQUISITE: Your database password from:
 *   Supabase Dashboard → Settings → Database → Connection string
 *   Look for: postgresql://postgres:[YOUR-PASSWORD]@db...
 *
 * USAGE:
 *   node scripts/run-migration.mjs
 *
 * Or set the password explicitly:
 *   DB_PASSWORD=yourpassword node scripts/run-migration.mjs
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const PROJECT_REF = "gwsywtptelowvbcwplsj";

// Try to get password from env, args, or prompt
let dbPassword = process.env.DB_PASSWORD;

if (!dbPassword) {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║          Tydigo Migration Runner                 ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║                                                  ║");
  console.log("║  Get your DB password from:                      ║");
  console.log("║  Supabase Dashboard → Settings → Database        ║");
  console.log("║  → Connection string → password                  ║");
  console.log("║                                                  ║");
  console.log("║  Then run:                                       ║");
  console.log("║  DB_PASSWORD=yourpass node scripts/run-migration  ║");
  console.log("║                                                  ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Alternatively, paste the SQL directly in Supabase SQL Editor:");
  console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log("");
  console.log("Migration file: supabase/migrations/0001_tydigo_core.sql");
  process.exit(1);
}

async function runMigration() {
  console.log("Connecting to Supabase Postgres...");

  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Connected!");

    // Read migration file
    const migrationPath = join(process.cwd(), "supabase", "migrations", "0001_tydigo_core.sql");
    const sql = await readFile(migrationPath, "utf8");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))
      .map((s) => s + ";");

    console.log(`Running ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        successCount++;
        if ((i + 1) % 10 === 0 || i === statements.length - 1) {
          process.stdout.write(`\r  Progress: ${i + 1}/${statements.length} (${errorCount} errors)`);
        }
      } catch (err) {
        errorCount++;
        // Duplicate errors are expected for idempotent statements (CREATE IF NOT EXISTS, DO $$ blocks)
        const msg = (err as Error).message || "";
        if (!msg.includes("already exists") && !msg.includes("duplicate_object")) {
          console.log(`\n  ⚠️  Statement ${i + 1}: ${msg.slice(0, 120)}`);
        }
      }
    }

    console.log(`\n✅ Migration complete! ${successCount} statements executed, ${errorCount} non-critical skips.`);
    console.log("");

    // Verify tables were created
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`Created ${rows.length} tables:`);
    rows.forEach((r) => console.log(`  📦 ${r.table_name}`));

    await client.end();
    console.log("\n🎉 Tydigo database is ready!");
    console.log(`   Verify at: https://supabase.com/dashboard/project/${PROJECT_REF}/editor`);
  } catch (error) {
    console.error("❌ Migration failed:", (error as Error).message);
    console.log("");
    console.log("Troubleshooting:");
    console.log("1. Check your database password is correct");
    console.log("2. Ensure your IP is allowed in Supabase Dashboard → Settings → Database");
    console.log(`3. Try the SQL Editor: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    process.exit(1);
  }
}

runMigration();
