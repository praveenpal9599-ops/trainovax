/** Drops and recreates the database, then re-runs all migrations. DEVELOPMENT ONLY. */
import mysql from 'mysql2/promise';
import env from '../config/env.js';
import { migrate } from './migrate.js';

if (env.isProd) {
  console.error('Refusing to reset the database in production.');
  process.exit(1);
}
const { database, ...conn } = env.db;
const c = await mysql.createConnection(conn);
await c.query(`DROP DATABASE IF EXISTS \`${database}\``);
await c.end();
console.log(`✓ dropped "${database}"`);
await migrate();
