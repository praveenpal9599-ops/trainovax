/**
 * Simple, ordered SQL migration runner.
 * - Creates the database if it does not exist
 * - Applies every *.sql file in ./migrations that has not been applied yet
 * - Tracks applied migrations in the `schema_migrations` table
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import env, { describeDbError } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Errors that mean "this change is already in the database" — safe to skip so a
// migration can be re-run on a database that already has part (or all) of it.
const ALREADY_APPLIED = new Set([
  'ER_DUP_FIELDNAME',      // column already exists
  'ER_DUP_KEYNAME',        // index / unique key already exists
  'ER_TABLE_EXISTS_ERROR', // table already exists
  'ER_FK_DUP_NAME',        // foreign key already exists
  'ER_DUP_ENTRY',          // seed row already present
]);

/** Split a .sql file into statements (ends of statements = ';' at end of a line). */
function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n').trim())
    .filter(Boolean);
}

/** Run each statement; skip the ones that are already applied instead of failing. */
async function applySql(conn, sql, log) {
  for (const stmt of splitStatements(sql)) {
    try {
      await conn.query(stmt);
    } catch (err) {
      if (!ALREADY_APPLIED.has(err.code)) throw err;
      log(`   · skipped (already present): ${stmt.split('\n')[0].slice(0, 90)}`);
    }
  }
}

export async function migrate({ silent = false } = {}) {
  const log = (...a) => !silent && console.log(...a);
  const { database, ...conn } = env.db;
  const root = await mysql.createConnection({ ...conn, multipleStatements: true });
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await root.query(`USE \`${database}\``);
  await root.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  const [appliedRows] = await root.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedRows.map((r) => r.filename));
  const dir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    log(`→ applying ${file}`);
    await applySql(root, sql, log);
    await root.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    count += 1;
  }
  log(count ? `✓ ${count} migration(s) applied to "${database}"` : `✓ "${database}" is up to date`);
  await root.end();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate().catch((err) => { console.error('Migration failed:', describeDbError(err)); process.exit(1); });
}
