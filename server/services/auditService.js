import { query } from '../config/db.js';

/** Record an audit entry. Never throws — auditing must not break the request. */
export async function audit(req, action, entityType = null, entityId = null, description = null, userId) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId ?? req?.user?.id ?? null, action, entityType, entityId, description?.slice(0, 500) ?? null,
        req?.ip ?? null, req?.headers?.['user-agent']?.slice(0, 255) ?? null]);
  } catch (err) {
    console.error('[audit] failed:', err.message);
  }
}
