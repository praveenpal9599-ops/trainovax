import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { query, queryOne } from '../config/db.js';
import ApiError from '../utils/ApiError.js';

const permCache = new Map(); // role -> { perms:Set, at:number }
async function permissionsFor(roleName) {
  const hit = permCache.get(roleName);
  if (hit && Date.now() - hit.at < 60_000) return hit.perms;
  const rows = await query(
    `SELECT p.code FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = ?`, [roleName]);
  const perms = new Set(rows.map((r) => r.code));
  permCache.set(roleName, { perms, at: Date.now() });
  return perms;
}

/** Verifies the Bearer token and loads a fresh user context (so deactivation is immediate). */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized();
    let payload;
    try { payload = jwt.verify(token, env.jwt.secret); } catch { throw ApiError.unauthorized('Session expired or invalid. Please sign in again.'); }

    const user = await queryOne(
      `SELECT u.id, u.name, u.email, u.status, u.organization_id, u.avatar_url, r.name AS role,
              t.id AS trainer_id, c.id AS client_id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN trainers t ON t.user_id = u.id AND t.deleted_at IS NULL
         LEFT JOIN clients  c ON c.user_id = u.id AND c.deleted_at IS NULL
        WHERE u.id = ? AND u.deleted_at IS NULL`, [payload.sub]);
    if (!user) throw ApiError.unauthorized('Account not found');
    if (user.status !== 'active') throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');

    req.user = {
      id: user.id, name: user.name, email: user.email, role: user.role,
      organizationId: user.organization_id, trainerId: user.trainer_id, clientId: user.client_id,
      permissions: await permissionsFor(user.role),
    };
    next();
  } catch (err) { next(err); }
}

/** Restrict a route to one or more roles. */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

/** Require at least one of the listed permission codes. */
export const requirePermission = (...codes) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!codes.some((c) => req.user.permissions.has(c))) return next(ApiError.forbidden());
  next();
};

export const clearPermissionCache = () => permCache.clear();
