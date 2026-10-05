import app from './app.js';
import env, { describeDbError } from './config/env.js';
import pool from './config/db.js';

async function start() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error(`✗ Cannot connect to MySQL at ${env.db.host}:${env.db.port}/${env.db.database} — ${describeDbError(err)}`);
    console.error('  Check your .env settings and run "npm run migrate" first.');
    process.exit(1);
  }
  const server = app.listen(env.port, () => console.log(`✓ TrainovaX API listening on http://localhost:${env.port} (${env.nodeEnv})`));
  const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
start();
