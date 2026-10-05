import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne } from '../config/db.js';
import { notify } from '../services/notificationService.js';
import { audit } from '../services/auditService.js';
import { assertClientAccess } from '../services/accessService.js';

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Number(req.query.pageSize) || 20);
  const where = `user_id = ? ${req.query.unread === 'true' ? 'AND read_at IS NULL' : ''} ${req.query.type ? 'AND type = ?' : ''}`;
  const params = [req.user.id, ...(req.query.type ? [req.query.type] : [])];
  const { total } = await queryOne(`SELECT COUNT(*) total FROM notifications WHERE ${where}`, params);
  const rows = await query(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params);
  const unread = await queryOne('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({ success: true, data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), unread: unread.n } });
});

export const markRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL', [req.params.id, req.user.id]);
  res.json({ success: true });
});
export const markAllRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({ success: true });
});
export const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

export const broadcastSchema = z.object({
  audience: z.enum(['all', 'admins', 'trainers', 'clients', 'organization']),
  organization_id: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().trim().max(500).optional(),
});
/** Super Admin: platform announcement. */
export const broadcast = asyncHandler(async (req, res) => {
  const { audience, organization_id: orgId, title, body } = req.body;
  if (audience === 'organization' && !orgId) throw ApiError.badRequest('Select an organization');
  const where = { all: "r.name IN ('admin','trainer','client')", admins: "r.name = 'admin'", trainers: "r.name = 'trainer'", clients: "r.name = 'client'", organization: 'u.organization_id = ?' }[audience];
  const users = await query(`SELECT u.id, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL AND u.status = 'active' AND ${where}`, audience === 'organization' ? [orgId] : []);
  await notify(users.map((u) => u.id), { type: 'announcement', title, body });
  await audit(req, 'broadcast', 'notification', null, `Broadcast "${title}" to ${users.length} user(s)`);
  res.json({ success: true, data: { recipients: users.length } });
});

export const sendToClientsSchema = z.object({
  client_ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().trim().max(500).optional(),
  type: z.enum(['reminder', 'general', 'progress']).default('reminder'),
});
/** Trainer: send a reminder to their clients (e.g. "Time to update your progress."). */
export const sendToClients = asyncHandler(async (req, res) => {
  const userIds = [];
  for (const id of req.body.client_ids) {
    const c = await assertClientAccess(req.user, id);
    if (c.user_id) userIds.push(c.user_id);
  }
  const link = req.body.type === 'progress' ? '/client/progress' : '/client/dashboard';
  await notify(userIds, { type: req.body.type, title: req.body.title, body: req.body.body, link });
  await audit(req, 'notify', 'client', null, `Sent "${req.body.title}" to ${userIds.length} client(s)`);
  res.json({ success: true, data: { recipients: userIds.length } });
});

export const sentHistory = asyncHandler(async (req, res) => {
  const rows = await query(`SELECT title, body, type, MIN(created_at) AS created_at, COUNT(*) AS recipients FROM notifications
    WHERE type = 'announcement' GROUP BY title, body, type, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') ORDER BY created_at DESC LIMIT 50`);
  res.json({ success: true, data: rows });
});
