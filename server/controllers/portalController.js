/** Client portal — every endpoint is locked to the signed-in client's own record. */
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne } from '../config/db.js';
import { today, addDays, isoWeekday } from '../utils/dates.js';
import * as portal from '../services/portalService.js';
import { getClientDetail } from '../services/clientService.js';
import { dailyAdherence, summarize } from '../services/adherenceService.js';

const clientIdOf = (req) => { if (!req.user.clientId) throw ApiError.forbidden('No client profile is linked to this account'); return req.user.clientId; };
const dateOf = (q) => (/^\d{4}-\d{2}-\d{2}$/.test(q?.date || '') ? q.date : today());

export const dashboard = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  const [client, workout, diet, upcoming, week, notifications, weightTrend] = await Promise.all([
    getClientDetail(id), portal.workoutForDate(id), portal.dietForDate(id), portal.nextWorkout(id), dailyAdherence([id], 7),
    query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.id]),
    query('SELECT record_date, weight_kg, body_fat_pct FROM progress_records WHERE client_id = ? AND deleted_at IS NULL ORDER BY record_date DESC LIMIT 12', [id]),
  ]);
  const unread = await queryOne('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({
    success: true,
    data: {
      client, workout, diet, upcoming, week, weekSummary: summarize(week),
      notifications, unreadNotifications: unread.n, weightTrend: weightTrend.reverse(),
    },
  });
});

export const workout = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  const date = dateOf(req.query);
  const data = await portal.workoutForDate(id, date);
  // Week strip: Monday → Sunday around the selected date
  const monday = addDays(date, -(isoWeekday(date) - 1));
  const week = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(monday, i);
    const w = d === date ? data : await portal.workoutForDate(id, d);
    week.push({ date: d, day_name: w.day?.name ?? null, total: w.exercises.length, done: w.completion?.done ?? 0 });
  }
  res.json({ success: true, data: { ...data, week } });
});

export const diet = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await portal.dietForDate(clientIdOf(req), dateOf(req.query)) });
});

const workoutLogSchema = z.object({
  workout_exercise_id: z.coerce.number().int().positive(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['completed', 'skipped']).nullable(),
  actual_sets: z.coerce.number().int().min(0).max(50).nullable().optional(),
  actual_reps: z.string().max(20).nullable().optional(),
  actual_weight_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  notes: z.string().max(255).nullable().optional(),
});
export const workoutLogSchemaExport = workoutLogSchema;

export const logWorkout = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  const b = req.body;
  if (b.log_date > today()) throw ApiError.badRequest('You cannot log a future workout');
  const owns = await queryOne(`SELECT we.id FROM workout_exercises we JOIN workout_days wd ON wd.id = we.day_id JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE we.id = ? AND wp.client_id = ? AND wp.deleted_at IS NULL`, [b.workout_exercise_id, id]);
  if (!owns) throw ApiError.forbidden('This exercise is not part of your plan');
  if (b.status === null) {
    await query('DELETE FROM workout_logs WHERE workout_exercise_id = ? AND log_date = ? AND client_id = ?', [b.workout_exercise_id, b.log_date, id]);
  } else {
    await query(`INSERT INTO workout_logs (client_id, workout_exercise_id, log_date, status, actual_sets, actual_reps, actual_weight_kg, notes)
      VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status = VALUES(status), actual_sets = VALUES(actual_sets),
      actual_reps = VALUES(actual_reps), actual_weight_kg = VALUES(actual_weight_kg), notes = VALUES(notes)`,
    [id, b.workout_exercise_id, b.log_date, b.status, b.actual_sets ?? null, b.actual_reps ?? null, b.actual_weight_kg ?? null, b.notes ?? null]);
  }
  res.json({ success: true, data: await portal.workoutForDate(id, b.log_date) });
});

export const dietLogSchema = z.object({
  diet_meal_id: z.coerce.number().int().positive(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['completed', 'skipped']).nullable(),
});
export const logDiet = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  const b = req.body;
  if (b.log_date > today()) throw ApiError.badRequest('You cannot log a future meal');
  const owns = await queryOne('SELECT dm.id FROM diet_meals dm JOIN diet_plans dp ON dp.id = dm.plan_id WHERE dm.id = ? AND dp.client_id = ?', [b.diet_meal_id, id]);
  if (!owns) throw ApiError.forbidden('This meal is not part of your plan');
  if (b.status === null) await query('DELETE FROM diet_logs WHERE diet_meal_id = ? AND log_date = ? AND client_id = ?', [b.diet_meal_id, b.log_date, id]);
  else await query('INSERT INTO diet_logs (client_id, diet_meal_id, log_date, status) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status = VALUES(status)', [id, b.diet_meal_id, b.log_date, b.status]);
  res.json({ success: true, data: await portal.dietForDate(id, b.log_date) });
});

export const waterSchema = z.object({ log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount_ml: z.coerce.number().int().min(0).max(10000) });
export const logWater = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  await query('INSERT INTO water_logs (client_id, log_date, amount_ml) VALUES (?,?,?) ON DUPLICATE KEY UPDATE amount_ml = VALUES(amount_ml)', [id, req.body.log_date, req.body.amount_ml]);
  res.json({ success: true });
});

export const profile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getClientDetail(clientIdOf(req)) });
});

export const profileSchema = z.object({
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  occupation: z.string().max(120).nullable().optional(),
  emergency_contact_name: z.string().max(120).nullable().optional(),
  emergency_contact_phone: z.string().max(30).nullable().optional(),
  allergies: z.string().max(255).nullable().optional(),
  injuries: z.string().max(500).nullable().optional(),
  sleep_hours: z.coerce.number().min(0).max(24).nullable().optional(),
  water_goal_ml: z.coerce.number().int().min(0).max(10000).nullable().optional(),
});
export const updateProfile = asyncHandler(async (req, res) => {
  const id = clientIdOf(req);
  const { phone, ...prof } = req.body;
  if (phone !== undefined) {
    await query('UPDATE clients SET phone = ? WHERE id = ?', [phone || null, id]);
    await query('UPDATE users SET phone = ? WHERE id = ?', [phone || null, req.user.id]);
  }
  const clean = Object.fromEntries(Object.entries(prof).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length) await query('INSERT INTO client_profiles SET ? ON DUPLICATE KEY UPDATE ?', [{ client_id: id, ...clean }, clean]);
  res.json({ success: true, data: await getClientDetail(id) });
});
