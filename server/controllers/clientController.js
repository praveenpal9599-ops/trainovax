import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne } from '../config/db.js';
import * as svc from '../services/clientService.js';
import { assertClientAccess, staffTrainerId } from '../services/accessService.js';
import { audit } from '../services/auditService.js';
import { fileUrl } from '../middleware/upload.js';
import { ROLES } from '../config/permissions.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await svc.listClients(req.user, req.query)) });
});

export const get = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  res.json({ success: true, data: await svc.getClientDetail(req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  const id = await svc.createClient(req.user, req.body);
  await audit(req, 'create', 'client', id, `Created client ${req.body.full_name}`);
  res.status(201).json({ success: true, data: await svc.getClientDetail(id) });
});

export const update = asyncHandler(async (req, res) => {
  const existing = await assertClientAccess(req.user, req.params.id);
  await svc.updateClient(req.user, existing, req.body);
  await audit(req, 'update', 'client', existing.id, `Updated client ${req.body.full_name}`);
  res.json({ success: true, data: await svc.getClientDetail(existing.id) });
});

export const setStatus = asyncHandler(async (req, res) => {
  const existing = await assertClientAccess(req.user, req.params.id);
  await svc.setClientStatus([existing.id], req.body.status);
  await audit(req, req.body.status === 'active' ? 'activate' : 'deactivate', 'client', existing.id, `${req.body.status === 'active' ? 'Activated' : 'Deactivated'} client ${existing.full_name}`);
  res.json({ success: true, data: await svc.getClientDetail(existing.id) });
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await assertClientAccess(req.user, req.params.id);
  await svc.deleteClients([existing.id]);
  await audit(req, 'delete', 'client', existing.id, `Deleted client ${existing.full_name}`);
  res.json({ success: true });
});

async function assertAll(user, ids) { for (const id of ids) await assertClientAccess(user, id); }

export const bulkStatus = asyncHandler(async (req, res) => {
  if (!req.body.status) throw ApiError.badRequest('status is required');
  await assertAll(req.user, req.body.ids);
  await svc.setClientStatus(req.body.ids, req.body.status);
  await audit(req, 'bulk_status', 'client', null, `Set ${req.body.ids.length} client(s) to ${req.body.status}`);
  res.json({ success: true });
});

export const bulkDelete = asyncHandler(async (req, res) => {
  await assertAll(req.user, req.body.ids);
  await svc.deleteClients(req.body.ids);
  await audit(req, 'bulk_delete', 'client', null, `Deleted ${req.body.ids.length} client(s)`);
  res.json({ success: true });
});

export const uploadPhoto = asyncHandler(async (req, res) => {
  const c = await assertClientAccess(req.user, req.params.id);
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const url = fileUrl(req.file);
  await query('UPDATE clients SET photo_url = ? WHERE id = ?', [url, c.id]);
  if (c.user_id) await query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, c.user_id]);
  res.json({ success: true, data: { photo_url: url } });
});

export const history = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  res.json({ success: true, data: await svc.clientHistory(req.params.id) });
});

/* ---------- Notes ---------- */
export const listNotes = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  const rows = await query(`SELECT n.*, u.name AS author_name FROM client_notes n LEFT JOIN users u ON u.id = n.author_id
    WHERE n.client_id = ? AND n.deleted_at IS NULL ORDER BY n.is_pinned DESC, n.created_at DESC`, [req.params.id]);
  res.json({ success: true, data: rows });
});
export const createNote = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  const r = await query('INSERT INTO client_notes (client_id, author_id, content, is_pinned) VALUES (?,?,?,?)', [req.params.id, req.user.id, req.body.content, req.body.is_pinned ? 1 : 0]);
  res.status(201).json({ success: true, data: await queryOne('SELECT * FROM client_notes WHERE id = ?', [r.insertId]) });
});
export const updateNote = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  await query('UPDATE client_notes SET content = ?, is_pinned = ? WHERE id = ? AND client_id = ?', [req.body.content, req.body.is_pinned ? 1 : 0, req.params.noteId, req.params.id]);
  res.json({ success: true });
});
export const deleteNote = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  await query('UPDATE client_notes SET deleted_at = NOW() WHERE id = ? AND client_id = ?', [req.params.noteId, req.params.id]);
  res.json({ success: true });
});

/* ---------- Attendance ---------- */
export const listAttendance = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  const rows = await query('SELECT * FROM attendance WHERE client_id = ? ORDER BY session_date DESC LIMIT 180', [req.params.id]);
  const summary = await queryOne(`SELECT COUNT(*) AS total, SUM(status='present') AS present, SUM(status='late') AS late,
      SUM(status='absent') AS absent, SUM(status='excused') AS excused FROM attendance WHERE client_id = ? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`, [req.params.id]);
  res.json({ success: true, data: rows, summary });
});
export const markAttendance = asyncHandler(async (req, res) => {
  const c = await assertClientAccess(req.user, req.params.id);
  const b = req.body;
  await query(`INSERT INTO attendance (client_id, trainer_id, session_date, check_in_time, status, notes) VALUES (?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE check_in_time = VALUES(check_in_time), status = VALUES(status), notes = VALUES(notes)`,
  [c.id, staffTrainerId(req.user, c), b.session_date, b.check_in_time ?? null, b.status, b.notes ?? null]);
  res.status(201).json({ success: true });
});
export const deleteAttendance = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  await query('DELETE FROM attendance WHERE id = ? AND client_id = ?', [req.params.attendanceId, req.params.id]);
  res.json({ success: true });
});

/* ---------- Logs summary (trainer view of client adherence) ---------- */
export const logs = asyncHandler(async (req, res) => {
  await assertClientAccess(req.user, req.params.id);
  const workout = await query(`SELECT wl.log_date, wl.status, e.name AS exercise_name, wl.actual_sets, wl.actual_reps, wl.actual_weight_kg
      FROM workout_logs wl JOIN workout_exercises we ON we.id = wl.workout_exercise_id JOIN exercises e ON e.id = we.exercise_id
      WHERE wl.client_id = ? AND wl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY wl.log_date DESC`, [req.params.id]);
  const diet = await query(`SELECT dl.log_date, dl.status, dm.name AS meal_name, dm.meal_type FROM diet_logs dl JOIN diet_meals dm ON dm.id = dl.diet_meal_id
      WHERE dl.client_id = ? AND dl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY dl.log_date DESC`, [req.params.id]);
  res.json({ success: true, data: { workout, diet } });
});
