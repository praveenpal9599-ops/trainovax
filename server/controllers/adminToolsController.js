/** Settings, audit logs and JSON backup/restore. */
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne, transaction } from '../config/db.js';
import { parseListQuery, paged, Where } from '../utils/pagination.js';
import { audit } from '../services/auditService.js';
import { clientScope } from '../services/accessService.js';
import { calcBmi } from '../utils/fitness.js';
import { today } from '../utils/dates.js';
import { ROLES } from '../config/permissions.js';

const cast = (s) => ({ ...s, setting_value: s.value_type === 'number' ? Number(s.setting_value) : s.value_type === 'boolean' ? s.setting_value === 'true' : s.setting_value });

export const getSettings = asyncHandler(async (_req, res) => {
  const rows = await query('SELECT * FROM settings ORDER BY setting_group, id');
  res.json({ success: true, data: rows.map(cast) });
});
export const publicSettings = asyncHandler(async (_req, res) => {
  const rows = await query('SELECT setting_key, setting_value, value_type FROM settings WHERE is_public = 1');
  res.json({ success: true, data: Object.fromEntries(rows.map(cast).map((r) => [r.setting_key, r.setting_value])) });
});
export const settingsSchema = z.record(z.string().max(100), z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]));
export const updateSettings = asyncHandler(async (req, res) => {
  const keys = Object.keys(req.body);
  const existing = await query('SELECT setting_key FROM settings WHERE setting_key IN (?)', [keys.length ? keys : ['']]);
  const allowed = new Set(existing.map((e) => e.setting_key));
  for (const [k, v] of Object.entries(req.body)) {
    if (!allowed.has(k)) continue;
    await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [v === null ? null : String(v), k]);
  }
  await audit(req, 'update', 'settings', null, `Updated settings: ${keys.filter((k) => allowed.has(k)).join(', ')}`);
  res.json({ success: true, data: (await query('SELECT * FROM settings ORDER BY setting_group, id')).map(cast) });
});

export const auditLogs = asyncHandler(async (req, res) => {
  const opts = parseListQuery(req.query, { sortable: { created: 'a.id', action: 'a.action', entity: 'a.entity_type', user: 'u.name' }, defaultSort: 'created' });
  const w = new Where();
  w.search(opts.search, ['a.description', 'u.name', 'u.email', 'a.ip_address']);
  w.addIf(req.query.action, 'a.action = ?', req.query.action);
  w.addIf(req.query.entity, 'a.entity_type = ?', req.query.entity);
  w.addIf(req.query.userId, 'a.user_id = ?', req.query.userId);
  w.addIf(req.query.from, 'a.created_at >= ?', req.query.from);
  w.addIf(req.query.to, 'a.created_at < DATE_ADD(?, INTERVAL 1 DAY)', req.query.to);
  const from = 'FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN roles r ON r.id = u.role_id';
  const { total } = await queryOne(`SELECT COUNT(*) total ${from} ${w.sql}`, w.params);
  const rows = await query(`SELECT a.*, u.name AS user_name, u.email AS user_email, r.label AS user_role ${from} ${w.sql}
    ORDER BY ${opts.sortCol} ${opts.sortDir} ${opts.all ? 'LIMIT 5000' : `LIMIT ${opts.pageSize} OFFSET ${opts.offset}`}`, w.params);
  const facets = {
    actions: (await query('SELECT DISTINCT action FROM audit_logs ORDER BY action')).map((r) => r.action),
    entities: (await query('SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type')).map((r) => r.entity_type),
  };
  res.json({ success: true, ...paged(rows, total, opts.all ? { page: 1, pageSize: Math.max(total, 1) } : opts), facets });
});

/* ---------------- Backup & restore (preserves the legacy JSON backup feature) ---------------- */
export const exportBackup = asyncHandler(async (req, res) => {
  const scope = clientScope(req.user);
  const clients = await query(`SELECT c.* FROM clients c WHERE c.deleted_at IS NULL AND ${scope.sql}`, scope.params);
  const ids = clients.length ? clients.map((c) => c.id) : [0];
  const [profiles, progress, workoutPlans, dietPlans] = await Promise.all([
    query('SELECT * FROM client_profiles WHERE client_id IN (?)', [ids]),
    query('SELECT * FROM progress_records WHERE client_id IN (?) AND deleted_at IS NULL ORDER BY record_date', [ids]),
    query('SELECT id, client_id, name, status, start_date FROM workout_plans WHERE client_id IN (?) AND deleted_at IS NULL', [ids]),
    query('SELECT id, client_id, name, status, start_date FROM diet_plans WHERE client_id IN (?) AND deleted_at IS NULL', [ids]),
  ]);
  await audit(req, 'export', 'backup', null, `Exported backup of ${clients.length} client(s)`);
  res.setHeader('Content-Disposition', `attachment; filename="trainovax-backup-${today()}.json"`);
  res.json({
    app: 'TrainovaX', version: 1, exported_at: new Date().toISOString(),
    clients: clients.map((c) => {
      // eslint-disable-next-line no-unused-vars
      const { user_id, trainer_id, organization_id, deleted_at, ...rest } = c;
      return {
        ...rest,
        profile: profiles.find((p) => p.client_id === c.id) || null,
        progress: progress.filter((p) => p.client_id === c.id),
        workout_plans: workoutPlans.filter((p) => p.client_id === c.id),
        diet_plans: dietPlans.filter((p) => p.client_id === c.id),
      };
    }),
  });
});

const GOAL_MAP = {
  'weight loss': 'weight_loss', 'muscle gain': 'muscle_gain', 'strength training': 'strength_training', endurance: 'endurance',
  'general fitness': 'general_fitness', flexibility: 'flexibility',
};
const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Import clients + measurements. Accepts this app's export format and the flat
 * legacy v1 style ({ name, age, gender, phone, height, weight, goal, notes, progress:[{date, weight, chest, waist, arms, thighs, hips, bodyFat}] }).
 */
export const importBackup = asyncHandler(async (req, res) => {
  if (![ROLES.ADMIN, ROLES.TRAINER].includes(req.user.role)) throw ApiError.forbidden('Import is available to admins and trainers');
  const list = Array.isArray(req.body) ? req.body : req.body?.clients;
  if (!Array.isArray(list) || !list.length) throw ApiError.badRequest('Backup file contains no clients');
  if (list.length > 1000) throw ApiError.badRequest('Too many clients in one import (max 1000)');
  let imported = 0; let measurements = 0;
  await transaction(async (conn) => {
    for (const raw of list) {
      const name = String(raw.full_name || raw.name || raw.fullName || '').trim().slice(0, 120);
      if (!name) continue;
      const goalRaw = String(raw.fitness_goal || raw.goal || raw.fitnessGoal || '').toLowerCase().replace(/_/g, ' ');
      const height = num(raw.height_cm ?? raw.height);
      const weight = num(raw.starting_weight_kg ?? raw.weight_kg ?? raw.weight);
      const gender = ['male', 'female', 'other'].includes(String(raw.gender).toLowerCase()) ? String(raw.gender).toLowerCase() : null;
      const [r] = await conn.query('INSERT INTO clients SET ?', [{
        organization_id: req.user.organizationId, trainer_id: req.user.trainerId, full_name: name, phone: raw.phone ? String(raw.phone).slice(0, 30) : null,
        email: raw.email ? String(raw.email).slice(0, 190) : null, age: num(raw.age), gender, height_cm: height, starting_weight_kg: weight,
        current_weight_kg: num(raw.current_weight_kg) ?? weight, fitness_goal: GOAL_MAP[goalRaw] || 'general_fitness',
        notes: raw.notes ? String(raw.notes).slice(0, 5000) : null, status: raw.status === 'inactive' ? 'inactive' : 'active',
        joined_on: /^\d{4}-\d{2}-\d{2}/.test(raw.joined_on || '') ? raw.joined_on.slice(0, 10) : today(),
      }]);
      await conn.query('INSERT IGNORE INTO client_profiles (client_id) VALUES (?)', [r.insertId]);
      for (const p of raw.progress || raw.measurements || []) {
        const date = String(p.record_date || p.date || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const w = num(p.weight_kg ?? p.weight);
        await conn.query('INSERT INTO progress_records SET ?', [{
          client_id: r.insertId, recorded_by: req.user.id, record_date: date, weight_kg: w, chest_cm: num(p.chest_cm ?? p.chest),
          waist_cm: num(p.waist_cm ?? p.waist), arms_cm: num(p.arms_cm ?? p.arms), thighs_cm: num(p.thighs_cm ?? p.thighs),
          hips_cm: num(p.hips_cm ?? p.hips), neck_cm: num(p.neck_cm ?? p.neck), calves_cm: num(p.calves_cm ?? p.calves),
          body_fat_pct: num(p.body_fat_pct ?? p.bodyFat ?? p.body_fat), bmi: calcBmi(w, height), notes: p.notes ? String(p.notes).slice(0, 500) : null,
        }]);
        measurements += 1;
      }
      imported += 1;
    }
  });
  await audit(req, 'import', 'backup', null, `Imported ${imported} client(s) and ${measurements} measurement(s)`);
  res.json({ success: true, data: { imported, measurements } });
});
