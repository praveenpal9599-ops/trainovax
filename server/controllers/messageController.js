import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne } from '../config/db.js';
import { notify } from '../services/notificationService.js';
import { fileUrl } from '../middleware/upload.js';
import { ROLES } from '../config/permissions.js';

/** Users the current user is allowed to message. */
async function contactsFor(user) {
  if (user.role === ROLES.CLIENT) {
    return query(`SELECT u.id, u.name, u.avatar_url, 'Your trainer' AS subtitle, r.name AS role FROM clients c
      JOIN trainers t ON t.id = c.trainer_id JOIN users u ON u.id = t.user_id JOIN roles r ON r.id = u.role_id
      WHERE c.id = ? AND u.deleted_at IS NULL`, [user.clientId ?? 0]);
  }
  if (user.role === ROLES.TRAINER) {
    return query(`SELECT u.id, u.name, u.avatar_url, 'Client' AS subtitle, 'client' AS role, c.id AS client_id FROM clients c JOIN users u ON u.id = c.user_id
        WHERE c.trainer_id = ? AND c.deleted_at IS NULL AND u.deleted_at IS NULL
      UNION ALL
      SELECT u.id, u.name, u.avatar_url, 'Admin' AS subtitle, 'admin' AS role, NULL FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'admin' AND u.organization_id = ? AND u.deleted_at IS NULL AND u.status = 'active'`, [user.trainerId ?? 0, user.organizationId ?? 0]);
  }
  if (user.role === ROLES.ADMIN) {
    return query(`SELECT u.id, u.name, u.avatar_url, 'Client' AS subtitle, 'client' AS role, c.id AS client_id FROM clients c JOIN users u ON u.id = c.user_id
        WHERE c.trainer_id = ? AND c.deleted_at IS NULL AND u.deleted_at IS NULL
      UNION ALL
      SELECT u.id, u.name, u.avatar_url, 'Trainer' AS subtitle, 'trainer' AS role, NULL FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'trainer' AND u.organization_id = ? AND u.deleted_at IS NULL
      UNION ALL
      SELECT u.id, u.name, u.avatar_url, 'Platform support' AS subtitle, 'super_admin' AS role, NULL FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'super_admin' AND u.deleted_at IS NULL AND u.status = 'active'`, [user.trainerId ?? 0, user.organizationId ?? 0]);
  }
  return query(`SELECT u.id, u.name, u.avatar_url, COALESCE(o.name, 'Admin') AS subtitle, 'admin' AS role FROM users u JOIN roles r ON r.id = u.role_id
      LEFT JOIN organizations o ON o.id = u.organization_id WHERE r.name = 'admin' AND u.deleted_at IS NULL`);
}

async function assertCanMessage(user, otherId) {
  const contacts = await contactsFor(user);
  const c = contacts.find((x) => x.id === Number(otherId));
  if (!c) throw ApiError.forbidden('You cannot message this user');
  return c;
}

export const conversations = asyncHandler(async (req, res) => {
  const contacts = await contactsFor(req.user);
  if (!contacts.length) return res.json({ success: true, data: [] });
  const ids = contacts.map((c) => c.id);
  const last = await query(`SELECT m.* FROM messages m JOIN (
        SELECT MAX(id) AS id FROM messages WHERE deleted_at IS NULL AND
          ((sender_id = ? AND recipient_id IN (?)) OR (recipient_id = ? AND sender_id IN (?)))
        GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) x ON x.id = m.id`,
  [req.user.id, ids, req.user.id, ids]);
  const unread = await query('SELECT sender_id, COUNT(*) n FROM messages WHERE recipient_id = ? AND read_at IS NULL AND deleted_at IS NULL GROUP BY sender_id', [req.user.id]);
  const data = contacts.map((c) => {
    const lm = last.find((m) => m.sender_id === c.id || m.recipient_id === c.id);
    return {
      ...c,
      last_message: lm ? { body: lm.body || (lm.attachment_name ? `📎 ${lm.attachment_name}` : ''), created_at: lm.created_at, mine: lm.sender_id === req.user.id } : null,
      unread: unread.find((u) => u.sender_id === c.id)?.n || 0,
    };
  }).sort((a, b) => (b.last_message?.created_at || '').localeCompare(a.last_message?.created_at || '') || a.name.localeCompare(b.name));
  res.json({ success: true, data });
});

export const thread = asyncHandler(async (req, res) => {
  const other = Number(req.query.with);
  if (!other) throw ApiError.badRequest('Query parameter "with" is required');
  const contact = await assertCanMessage(req.user, other);
  const before = Number(req.query.before) || null;
  const rows = await query(`SELECT id, sender_id, recipient_id, body, attachment_url, attachment_name, read_at, created_at FROM messages
    WHERE deleted_at IS NULL AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) ${before ? 'AND id < ?' : ''}
    ORDER BY id DESC LIMIT 100`, before ? [req.user.id, other, other, req.user.id, before] : [req.user.id, other, other, req.user.id]);
  await query('UPDATE messages SET read_at = NOW() WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL', [req.user.id, other]);
  res.json({ success: true, data: rows.reverse(), contact });
});

export const sendSchema = z.object({ recipient_id: z.coerce.number().int().positive(), body: z.string().trim().max(5000).optional().default('') });
export const send = asyncHandler(async (req, res) => {
  const { recipient_id: to, body } = req.body;
  if (!body && !req.file) throw ApiError.badRequest('Message cannot be empty');
  await assertCanMessage(req.user, to);
  const r = await query('INSERT INTO messages (sender_id, recipient_id, body, attachment_url, attachment_name) VALUES (?,?,?,?,?)',
    [req.user.id, to, body || null, fileUrl(req.file), req.file?.originalname?.slice(0, 255) ?? null]);
  const recipient = await queryOne('SELECT r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?', [to]);
  const base = { client: '/client', trainer: '/trainer', super_admin: '/super-admin' }[recipient?.role] || '/admin';
  const senderLabel = [ROLES.ADMIN, ROLES.TRAINER].includes(req.user.role) && recipient?.role === 'client' ? 'your trainer' : req.user.name;
  await notify(to, { type: 'message', title: `New message from ${senderLabel}`, body: (body || 'Sent an attachment').slice(0, 140), link: `${base}/messages?with=${req.user.id}` });
  res.status(201).json({ success: true, data: await queryOne('SELECT * FROM messages WHERE id = ?', [r.insertId]) });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const row = await queryOne('SELECT COUNT(*) n FROM messages WHERE recipient_id = ? AND read_at IS NULL AND deleted_at IS NULL', [req.user.id]);
  res.json({ success: true, data: { unread: row.n } });
});
