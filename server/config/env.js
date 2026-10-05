import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const required = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 5000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`,
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    rememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 1000),
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  },
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024,
  uploadDir: path.resolve(__dirname, '../uploads'),
};

/** Human-readable explanation for database connection errors (AggregateError has an empty message). */
export function describeDbError(err) {
  const inner = err?.errors?.[0] || err;
  const code = inner?.code || err?.code;
  const where = `${env.db.host}:${env.db.port}`;
  const hints = {
    ECONNREFUSED: `Nothing is listening on ${where}. Start the MySQL service (Windows: Win+R → services.msc → "MySQL80" → Start) or fix DB_HOST/DB_PORT in server/.env.`,
    ER_ACCESS_DENIED_ERROR: `MySQL rejected user "${env.db.user}". Check DB_USER / DB_PASSWORD in server/.env.`,
    ENOTFOUND: `Host "${env.db.host}" not found. Check DB_HOST in server/.env.`,
    ETIMEDOUT: `Timed out connecting to ${where}. Check the host/port and firewall.`,
    ER_NOT_SUPPORTED_AUTH_MODE: 'MySQL auth plugin not supported. Run: ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'yourpassword\';',
  };
  return `${code || 'ERROR'}: ${inner?.message || err?.message || 'unknown error'}${hints[code] ? `\n  → ${hints[code]}` : ''}`;
}

export default env;
