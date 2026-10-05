import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { query, queryOne } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { assertClientAccess } from '../services/accessService.js';

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  client_id: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().positive().nullable()).optional(),
  due_date: z.preprocess((v) => (v === '' ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['open', 'done']).default('open'),
});

export const list = asyncHandler(async (req, res) => {
  const status = req.query.status || 'open';
  const rows = await query(`SELECT t.*, c.full_name AS client_name FROM tasks t LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.user_id = ? AND t.deleted_at IS NULL ${status === 'all' ? '' : 'AND t.status = ?'}
    ORDER BY t.status = 'done', t.due_date IS NULL, t.due_date, FIELD(t.priority,'high','medium','low') LIMIT 100`,
  status === 'all' ? [req.user.id] : [req.user.id, status]);
  res.json({ success: true, data: rows });
});
export const create = asyncHandler(async (req, res) => {
  if (req.body.client_id) await assertClientAccess(req.user, req.body.client_id);
  const r = await query('INSERT INTO tasks SET ?', [{ ...req.body, user_id: req.user.id }]);
  res.status(201).json({ success: true, data: await queryOne('SELECT * FROM tasks WHERE id = ?', [r.insertId]) });
});
export const update = asyncHandler(async (req, res) => {
  const t = await queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
  if (!t) throw ApiError.notFound('Task not found');
  const patch = taskSchema.partial().parse(req.body);
  await query('UPDATE tasks SET ? WHERE id = ?', [patch, t.id]);
  res.json({ success: true, data: await queryOne('SELECT * FROM tasks WHERE id = ?', [t.id]) });
});
export const remove = asyncHandler(async (req, res) => {
  await query('UPDATE tasks SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});
