/**
 * Moves every table (with all its data) from an old database into the database named
 * in DB_NAME (server/.env). Used for the AJ CLAN Pro -> TrainovaX rename:
 *
 *   npm run db:rename                # moves ajclan_pro -> DB_NAME (trainovax)
 *   npm run db:rename -- old_db_name # moves old_db_name -> DB_NAME
 *
 * Uses MySQL's RENAME TABLE, so nothing is copied or lost — the tables are simply moved.
 * The old (now empty) database is dropped afterwards.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import env, { describeDbError } from '../config/env.js';

export async function renameDatabase(from = 'ajclan_pro') {
  const { database: to, ...conn } = env.db;
  if (from === to) { console.log(`Nothing to do: DB_NAME is already "${to}".`); return; }
  const db = await mysql.createConnection(conn);
  try {
    const [[src]] = await db.query('SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [from]);
    if (!src.n) { console.log(`Database "${from}" not found — nothing to move. Run "npm run setup" to create "${to}".`); return; }

    const [tables] = await db.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [from]);
    await db.query(`CREATE DATABASE IF NOT EXISTS \`${to}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const [[existing]] = await db.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [to]);
    if (existing.n) throw new Error(`Database "${to}" already has ${existing.n} table(s). Empty or drop it first, then run this again.`);

    if (tables.length) {
      const pairs = tables.map((t) => `\`${from}\`.\`${t.name}\` TO \`${to}\`.\`${t.name}\``).join(', ');
      await db.query(`RENAME TABLE ${pairs}`); // one atomic statement
    }
    const [[left]] = await db.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [from]);
    if (!left.n) await db.query(`DROP DATABASE \`${from}\``);
    console.log(`✓ Moved ${tables.length} table(s) from "${from}" to "${to}"${left.n ? '' : ` and removed the empty "${from}" database`}.`);
  } finally {
    await db.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renameDatabase(process.argv[2]).catch((err) => { console.error('Rename failed:', describeDbError(err)); process.exit(1); });
}
