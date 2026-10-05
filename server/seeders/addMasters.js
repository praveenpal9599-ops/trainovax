/**
 * Adds any missing exercises, foods, categories and muscle groups from the seed data files
 * to an EXISTING database — without deleting or changing anything you already have.
 * Safe to run more than once: items are matched by name and skipped if they already exist.
 *
 *   npm run seed:masters
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query, queryOne } from '../config/db.js';
import { describeDbError } from '../config/env.js';
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, EXERCISES } from './data/exercises.js';
import { FOOD_CATEGORIES, FOODS } from './data/foods.js';

async function ensureNames(table, names) {
  const rows = await query(`SELECT id, name FROM ${table}`);
  const map = Object.fromEntries(rows.map((r) => [r.name.toLowerCase(), r.id]));
  let added = 0;
  for (const name of names) {
    if (map[name.toLowerCase()]) continue;
    const r = await query(`INSERT INTO ${table} SET ?`, [{ name }]);
    map[name.toLowerCase()] = r.insertId;
    added += 1;
  }
  return { get: (n) => (n ? map[n.toLowerCase()] ?? null : null), added };
}

async function existingNames(table) {
  const rows = await query(`SELECT name FROM ${table} WHERE deleted_at IS NULL`);
  return new Set(rows.map((r) => r.name.toLowerCase()));
}

export async function addMasters() {
  const admin = await queryOne(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'super_admin' ORDER BY u.id LIMIT 1",
  );
  const createdBy = admin?.id ?? null;

  const cat = await ensureNames('exercise_categories', EXERCISE_CATEGORIES);
  const mus = await ensureNames('muscle_groups', MUSCLE_GROUPS);
  const fcat = await ensureNames('food_categories', FOOD_CATEGORIES);

  const haveEx = await existingNames('exercises');
  let exAdded = 0;
  for (const [name, c, pm, sm, equipment, difficulty, type, sets, reps, dur, rest, description, instructions] of EXERCISES) {
    if (haveEx.has(name.toLowerCase())) continue;
    await query('INSERT INTO exercises SET ?', [{
      name, description, instructions, category_id: cat.get(c), primary_muscle_id: mus.get(pm), secondary_muscle_id: mus.get(sm),
      equipment, difficulty, exercise_type: type, default_sets: sets, default_reps: reps, default_duration_sec: dur,
      default_rest_sec: rest, status: 'active', created_by: createdBy,
    }]);
    exAdded += 1;
  }

  const haveFood = await existingNames('foods');
  let foodAdded = 0;
  for (const [name, c, size, unit, kcal, p, carb, fat, fib, sug, na, veg, vegan, allergens] of FOODS) {
    if (haveFood.has(name.toLowerCase())) continue;
    await query('INSERT INTO foods SET ?', [{
      name, category_id: fcat.get(c), serving_size: size, serving_unit: unit, calories: kcal, protein_g: p, carbs_g: carb, fat_g: fat,
      fiber_g: fib, sugar_g: sug, sodium_mg: na, is_vegetarian: veg, is_vegan: vegan, allergens, status: 'active', created_by: createdBy,
    }]);
    foodAdded += 1;
  }

  console.log(`✓ Exercise categories +${cat.added}, muscle groups +${mus.added}, food categories +${fcat.added}`);
  console.log(`✓ Exercises added: ${exAdded} (library now has ${EXERCISES.length} seed exercises)`);
  console.log(`✓ Foods added: ${foodAdded} (library now has ${FOODS.length} seed foods)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  addMasters()
    .then(() => pool.end())
    .catch(async (err) => { console.error('Adding masters failed:', describeDbError(err)); await pool.end(); process.exit(1); });
}
