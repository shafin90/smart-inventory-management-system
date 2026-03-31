/**
 * Database migration runner.
 * Usage:
 *   node src/db/migrate.js up      - applies all pending migrations
 *   node src/db/migrate.js down    - rolls back the last applied migration
 *   node src/db/migrate.js status  - lists applied / pending migrations
 */

const path = require("path");
const fs = require("fs");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL;
const MIGRATIONS_DIR = path.resolve(__dirname, "../../sql/migrations");

async function getClient() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".up.sql"))
    .map((f) => f.replace(".up.sql", ""))
    .sort();
}

async function getApplied(client) {
  const { rows } = await client.query("SELECT name FROM schema_migrations ORDER BY name");
  return new Set(rows.map((r) => r.name));
}

async function runUp(client) {
  await ensureMigrationsTable(client);
  const files = getMigrationFiles();
  const applied = await getApplied(client);
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("All migrations already applied. Nothing to do.");
    return;
  }

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${name}.up.sql`), "utf8");
    console.log(`Applying migration: ${name}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`  ✓ Applied: ${name}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  ✗ Failed: ${name} — ${err.message}`);
      throw err;
    }
  }
}

async function runDown(client) {
  await ensureMigrationsTable(client);
  const applied = await getApplied(client);

  if (applied.size === 0) {
    console.log("No migrations to roll back.");
    return;
  }

  // Roll back the last applied migration
  const last = [...applied].sort().reverse()[0];
  const downFile = path.join(MIGRATIONS_DIR, `${last}.down.sql`);

  if (!fs.existsSync(downFile)) {
    throw new Error(`Down migration file not found: ${last}.down.sql`);
  }

  const sql = fs.readFileSync(downFile, "utf8");
  console.log(`Rolling back migration: ${last}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("DELETE FROM schema_migrations WHERE name = $1", [last]);
    await client.query("COMMIT");
    console.log(`  ✓ Rolled back: ${last}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ✗ Rollback failed: ${last} — ${err.message}`);
    throw err;
  }
}

async function runStatus(client) {
  await ensureMigrationsTable(client);
  const files = getMigrationFiles();
  const applied = await getApplied(client);

  console.log("\nMigration Status:");
  console.log("─".repeat(50));
  for (const name of files) {
    const status = applied.has(name) ? "✓ applied" : "○ pending";
    console.log(`  ${status}  ${name}`);
  }
  console.log("─".repeat(50));
  console.log(`  Total: ${files.length} | Applied: ${applied.size} | Pending: ${files.length - applied.size}`);
}

async function main() {
  const command = process.argv[2] || "up";
  const client = await getClient();

  try {
    if (command === "up") {
      await runUp(client);
    } else if (command === "down") {
      await runDown(client);
    } else if (command === "status") {
      await runStatus(client);
    } else {
      console.error(`Unknown command: ${command}. Use: up | down | status`);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration error:", err.message);
  process.exit(1);
});
