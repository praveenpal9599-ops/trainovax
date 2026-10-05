import { query, queryOne } from '../config/db.js';
import { isoWeekday, addDays, today } from '../utils/dates.js';
import { sumNutrition } from '../utils/fitness.js';
import { loadNested } from './planService.js';
import { WORKOUT_PLAN, DIET_PLAN } from './planStructures.js';

export async function activePlanId(table, clientId) {
  const row = await queryOne(`SELECT id FROM ${table} WHERE client_id = ? AND status = 'active' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, [clientId]);
  return row?.id ?? null;
}

export async function workoutForDate(clientId, date = today()) {
  const planId = await activePlanId('workout_plans', clientId);
  if (!planId) return { plan: null, day: null, exercises: [], completion: null, date };
  const plan = await loadNested(WORKOUT_PLAN, planId);
  const day = plan.days.find((d) => d.day_of_week === isoWeekday(date)) || null;
  const logs = day?.exercises.length
    ? await query('SELECT * FROM workout_logs WHERE client_id = ? AND log_date = ? AND workout_exercise_id IN (?)', [clientId, date, day.exercises.map((e) => e.id)])
    : [];
  const exercises = (day?.exercises || []).map((e) => ({ ...e, log: logs.find((l) => l.workout_exercise_id === e.id) || null }));
  const done = exercises.filter((e) => e.log?.status === 'completed').length;
  const { days, ...planInfo } = plan;
  return {
    date, plan: { ...planInfo, days: days.map((d) => ({ id: d.id, name: d.name, day_of_week: d.day_of_week, focus: d.focus, exercise_count: d.exercises.length })) },
    day: day ? { id: day.id, name: day.name, focus: day.focus, day_of_week: day.day_of_week } : null,
    exercises,
    completion: exercises.length ? { done, skipped: exercises.filter((e) => e.log?.status === 'skipped').length, total: exercises.length, pct: Math.round((100 * done) / exercises.length) } : null,
  };
}

export async function nextWorkout(clientId, fromDate = today()) {
  for (let i = 1; i <= 7; i += 1) {
    const d = addDays(fromDate, i);
    const w = await workoutForDate(clientId, d);
    if (!w.plan) return null;
    if (w.day && w.exercises.length) return { date: d, day: w.day, exercise_count: w.exercises.length, exercises: w.exercises.slice(0, 4).map((e) => e.exercise_name) };
  }
  return null;
}

export async function dietForDate(clientId, date = today()) {
  const planId = await activePlanId('diet_plans', clientId);
  const water = await queryOne('SELECT amount_ml FROM water_logs WHERE client_id = ? AND log_date = ?', [clientId, date]);
  const profile = await queryOne('SELECT water_goal_ml FROM client_profiles WHERE client_id = ?', [clientId]);
  if (!planId) return { date, plan: null, meals: [], totals: sumNutrition([]), consumed: sumNutrition([]), water: { amount_ml: water?.amount_ml || 0, target_ml: profile?.water_goal_ml || 3000 } };
  const plan = await loadNested(DIET_PLAN, planId);
  const logs = plan.meals.length ? await query('SELECT * FROM diet_logs WHERE client_id = ? AND log_date = ? AND diet_meal_id IN (?)', [clientId, date, plan.meals.map((m) => m.id)]) : [];
  const meals = plan.meals.map((m) => ({ ...m, log: logs.find((l) => l.diet_meal_id === m.id) || null }));
  const consumed = sumNutrition(meals.filter((m) => m.log?.status === 'completed').flatMap((m) => m.foods));
  const { meals: _m, ...planInfo } = plan; // eslint-disable-line no-unused-vars
  const completed = meals.filter((m) => m.log?.status === 'completed').length;
  return {
    date, plan: planInfo, meals, totals: plan.totals, consumed,
    completion: meals.length ? { done: completed, total: meals.length, pct: Math.round((100 * completed) / meals.length) } : null,
    water: { amount_ml: water?.amount_ml || 0, target_ml: plan.water_target_ml || profile?.water_goal_ml || 3000 },
  };
}
