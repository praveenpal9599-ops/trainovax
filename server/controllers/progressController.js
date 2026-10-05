import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne, transaction } from '../config/db.js';
import { assertClientAccess, resolveClientId } from '../services/accessService.js';
import { audit } from '../services/auditService.js';
import { notifyClient, notify } from '../services/notificationService.js';
import { calcBmi, round1 } from '../utils/fitness.js';
import { rangeFromPreset } from '../utils/dates.js';
import { fileUrl } from '../middleware/upload.js';
import { ROLES } from '../config/permissions.js';

const METRICS = ['weight_kg', 'chest_cm', 'waist_cm', 'arms_cm', 'thighs_cm', 'hips_cm', 'neck_cm', 'calves_cm', 'body_fat_pct', 'bmi'];

/** Keep clients.current_weight_kg in sync with the most recent weigh-in. */
async function syncCurrentWeight(conn, clientId) {
  const latest = await queryOne('SELECT weight_kg FROM progress_records WHERE client_id = ? AND deleted_at IS NULL AND weight_kg IS NOT NULL ORDER BY record_date DESC, id DESC LIMIT 1', [clientId], conn);
  if (latest) await conn.query('UPDATE clients SET current_weight_kg = ? WHERE id = ?', [latest.weight_kg, clientId]);
}

async function notifyTrainerOfSelfEntry(req, client, what) {
  if (req.user.role !== ROLES.CLIENT || !client.trainer_id) return;
  const t = await queryOne('SELECT user_id FROM trainers WHERE id = ?', [client.trainer_id]);
  if (t) await notify(t.user_id, { type: 'progress', title: `${client.full_name} logged ${what}`, link: `/admin/clients/${client.id}?tab=progress` });
}

export const list = asyncHandler(async (req, res) => {
  const clientId = resolveClientId(req.user, req.params.clientId);
  const client = await assertClientAccess(req.user, clientId);
  const params = [client.id];
  let where = 'client_id = ? AND deleted_at IS NULL';
  const from = req.query.range === 'custom' ? req.query.from : rangeFromPreset(req.query.range);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { where += ' AND record_date >= ?'; params.push(from); }
  if (req.query.range === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '')) { where += ' AND record_date <= ?'; params.push(req.query.to); }
  const rows = await query(`SELECT * FROM progress_records WHERE ${where} ORDER BY record_date ASC, id ASC`, params);

  const first = rows[0]; const last = rows[rows.length - 1];
  const summary = {};
  for (const k of METRICS) {
    const withVal = rows.filter((r) => r[k] != null);
    const a = withVal[0]?.[k]; const b = withVal[withVal.length - 1]?.[k];
    summary[k] = { start: a ?? null, current: b ?? null, change: a != null && b != null ? round1(b - a) : null };
  }
  res.json({
    success: true,
    data: rows,
    summary,
    client: { id: client.id, full_name: client.full_name, height_cm: client.height_cm, starting_weight_kg: client.starting_weight_kg, fitness_goal: client.fitness_goal },
    range: { from: first?.record_date ?? null, to: last?.record_date ?? null, count: rows.length },
  });
});

export const create = asyncHandler(async (req, res) => {
  const clientId = resolveClientId(req.user, req.body.client_id);
  if (!clientId) throw ApiError.badRequest('client_id is required');
  const client = await assertClientAccess(req.user, clientId);
  const b = req.body;
  const row = {
    client_id: client.id, recorded_by: req.user.id, record_date: b.record_date, notes: b.notes ?? null,
    bmi: calcBmi(b.weight_kg, client.height_cm),
  };
  for (const k of METRICS) if (k !== 'bmi') row[k] = b[k] ?? null;
  const id = await transaction(async (conn) => {
    const [r] = await conn.query('INSERT INTO progress_records SET ?', [row]);
    await syncCurrentWeight(conn, client.id);
    return r.insertId;
  });
  if (req.user.role !== ROLES.CLIENT) await notifyClient(client.id, { type: 'progress', title: 'New measurements recorded', body: `Your trainer logged measurements for ${b.record_date}.`, link: '/client/progress' });
  await notifyTrainerOfSelfEntry(req, client, 'new measurements');
  await audit(req, 'create', 'progress_record', id, `Recorded measurements for ${client.full_name} (${b.record_date})`);
  res.status(201).json({ success: true, data: await queryOne('SELECT * FROM progress_records WHERE id = ?', [id]) });
});

async function loadRecord(req) {
  const rec = await queryOne('SELECT * FROM progress_records WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!rec) throw ApiError.notFound('Measurement not found');
  const client = await assertClientAccess(req.user, rec.client_id);
  return { rec, client };
}

export const update = asyncHandler(async (req, res) => {
  const { rec, client } = await loadRecord(req);
  const b = req.body;
  const row = { record_date: b.record_date, notes: b.notes ?? null, bmi: calcBmi(b.weight_kg, client.height_cm) };
  for (const k of METRICS) if (k !== 'bmi') row[k] = b[k] ?? null;
  await transaction(async (conn) => {
    await conn.query('UPDATE progress_records SET ? WHERE id = ?', [row, rec.id]);
    await syncCurrentWeight(conn, client.id);
  });
  await audit(req, 'update', 'progress_record', rec.id, `Updated measurements for ${client.full_name}`);
  res.json({ success: true, data: await queryOne('SELECT * FROM progress_records WHERE id = ?', [rec.id]) });
});

export const remove = asyncHandler(async (req, res) => {
  const { rec, client } = await loadRecord(req);
  await transaction(async (conn) => {
    await conn.query('UPDATE progress_records SET deleted_at = NOW() WHERE id = ?', [rec.id]);
    await syncCurrentWeight(conn, client.id);
  });
  await audit(req, 'delete', 'progress_record', rec.id, `Deleted measurement (${rec.record_date}) for ${client.full_name}`);
  res.json({ success: true });
});

/* ------------------------------ Photos ------------------------------ */
export const listPhotos = asyncHandler(async (req, res) => {
  const clientId = resolveClientId(req.user, req.params.clientId);
  await assertClientAccess(req.user, clientId);
  const rows = await query('SELECT * FROM progress_photos WHERE client_id = ? AND deleted_at IS NULL ORDER BY taken_on DESC, id DESC', [clientId]);
  res.json({ success: true, data: rows });
});

export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');
  const clientId = resolveClientId(req.user, req.body.client_id);
  const client = await assertClientAccess(req.user, clientId);
  const r = await query('INSERT INTO progress_photos SET ?', [{
    client_id: client.id, photo_url: fileUrl(req.file), pose: req.body.pose, taken_on: req.body.taken_on,
    notes: req.body.notes ?? null, progress_record_id: req.body.progress_record_id ?? null, uploaded_by: req.user.id,
  }]);
  await notifyTrainerOfSelfEntry(req, client, 'a progress photo');
  await audit(req, 'create', 'progress_photo', r.insertId, `Uploaded progress photo for ${client.full_name}`);
  res.status(201).json({ success: true, data: await queryOne('SELECT * FROM progress_photos WHERE id = ?', [r.insertId]) });
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const p = await queryOne('SELECT * FROM progress_photos WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!p) throw ApiError.notFound('Photo not found');
  await assertClientAccess(req.user, p.client_id);
  await query('UPDATE progress_photos SET deleted_at = NOW() WHERE id = ?', [p.id]);
  await audit(req, 'delete', 'progress_photo', p.id, 'Deleted progress photo');
  res.json({ success: true });
});
