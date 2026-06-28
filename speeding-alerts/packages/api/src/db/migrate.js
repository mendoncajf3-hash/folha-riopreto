const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(10) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(r => r.version));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[DB] Applying migration ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        // seed inserts its own migration record; schema migration is inserted by the SQL itself
        // If not already inserted, add it here
        await client.query(
          `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
          [version]
        );
        await client.query('COMMIT');
        console.log(`[DB] Migration ${file} applied.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    console.log('[DB] All migrations up to date.');
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
