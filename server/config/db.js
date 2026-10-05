import mysql from 'mysql2/promise';
import env from './env.js';

/**
 * Shared MySQL connection pool.
 * All queries use placeholders (?) — mysql2 escapes values, protecting against SQL injection.
 */
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  dateStrings: true,          // return DATE/DATETIME as strings — no timezone surprises
  decimalNumbers: true,       // DECIMAL -> JS number
  namedPlaceholders: false,
  charset: 'utf8mb4',
});

/** Run a query and return rows. */
export async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

/** Return the first row or null. */
export async function queryOne(sql, params = [], conn = pool) {
  const rows = await query(sql, params, conn);
  return rows[0] || null;
}

/** Execute a callback inside a transaction. The callback receives the connection. */
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
