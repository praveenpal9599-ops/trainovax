/**
 * Workout completion & diet adherence calculations.
 * Scheduled items are derived from each client's currently active plan:
 *   workout: exercises on the plan day whose day_of_week matches the date
 *   diet:    every meal in the active diet plan, every day
 */
import { query } from '../config/db.js';
import { addDays, isoWeekday, today } from '../utils/dates.js';

export async function workoutSchedule(clientIds) {
  if (!clientIds.length) return new Map();
  const rows = await query(`SELECT wp.client_id, wd.day_of_week, COUNT(we.id) AS exercises
      FROM workout_plans wp JOIN workout_days wd ON wd.plan_id = wp.id JOIN workout_exercises we ON we.day_id = wd.id
     WHERE wp.status = 'active' AND wp.deleted_at IS NULL AND wp.client_id IN (?) AND wd.day_of_week IS NOT NULL
     GROUP BY wp.client_id, wd.day_of_week`, [clientIds]);
  const map = new Map();
  for (const r of rows) map.set(`${r.client_id}:${r.day_of_week}`, r.exercises);
  return map;
}

export async function dietSchedule(clientIds) {
  if (!clientIds.length) return new Map();
  const rows = await query(`SELECT dp.client_id, COUNT(dm.id) AS meals FROM diet_plans dp JOIN diet_meals dm ON dm.plan_id = dp.id
     WHERE dp.status = 'active' AND dp.deleted_at IS NULL AND dp.client_id IN (?) GROUP BY dp.client_id`, [clientIds]);
  return new Map(rows.map((r) => [r.client_id, r.meals]));
}

/** Daily series for the last `days` days across the given clients. */
export async function dailyAdherence(clientIds, days = 7) {
  const end = today();
  const start = addDays(end, -(days - 1));
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const series = dates.map((date) => ({ date, workout_scheduled: 0, workout_completed: 0, workout_skipped: 0, diet_scheduled: 0, diet_completed: 0 }));
  if (!clientIds.length) return series;

  const [wSched, dSched, wLogs, dLogs] = await Promise.all([
    workoutSchedule(clientIds), dietSchedule(clientIds),
    query(`SELECT log_date, status, COUNT(*) n FROM workout_logs WHERE client_id IN (?) AND log_date BETWEEN ? AND ? GROUP BY log_date, status`, [clientIds, start, end]),
    query(`SELECT log_date, COUNT(*) n FROM diet_logs WHERE client_id IN (?) AND status = 'completed' AND log_date BETWEEN ? AND ? GROUP BY log_date`, [clientIds, start, end]),
  ]);
  for (const s of series) {
    const dow = isoWeekday(s.date);
    for (const id of clientIds) {
      s.workout_scheduled += wSched.get(`${id}:${dow}`) || 0;
      s.diet_scheduled += dSched.get(id) || 0;
    }
    for (const l of wLogs.filter((x) => x.log_date === s.date)) {
      if (l.status === 'completed') s.workout_completed += l.n; else s.workout_skipped += l.n;
    }
    s.diet_completed = dLogs.find((x) => x.log_date === s.date)?.n || 0;
    s.workout_pct = s.workout_scheduled ? Math.min(100, Math.round((100 * s.workout_completed) / s.workout_scheduled)) : null;
    s.diet_pct = s.diet_scheduled ? Math.min(100, Math.round((100 * s.diet_completed) / s.diet_scheduled)) : null;
  }
  return series;
}

export function summarize(series) {
  const t = series.reduce((a, s) => ({
    ws: a.ws + s.workout_scheduled, wc: a.wc + s.workout_completed, ds: a.ds + s.diet_scheduled, dc: a.dc + s.diet_completed,
  }), { ws: 0, wc: 0, ds: 0, dc: 0 });
  return {
    workout_completion_pct: t.ws ? Math.min(100, Math.round((100 * t.wc) / t.ws)) : 0,
    diet_adherence_pct: t.ds ? Math.min(100, Math.round((100 * t.dc) / t.ds)) : 0,
  };
}

/** Per-client completion % over the last N days (for reports / tables). */
export async function perClientAdherence(clientIds, days = 30) {
  const out = new Map();
  for (const id of clientIds) out.set(id, summarize(await dailyAdherence([id], days)));
  return out;
}
