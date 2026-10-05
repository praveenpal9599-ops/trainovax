import { key } from '../workout/workoutUtils';
export { key };

const NUTR = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g'];
const r1 = (n) => Math.round(n * 10) / 10;

export function itemNutrition(f) {
  const q = Number(f.quantity) || 0;
  return Object.fromEntries(NUTR.map((k) => [k, r1((Number(f[k]) || 0) * q)]));
}
export function sumItems(items = []) {
  const t = Object.fromEntries(NUTR.map((k) => [k, 0]));
  items.forEach((f) => { const n = itemNutrition(f); NUTR.forEach((k) => { t[k] += n[k]; }); });
  NUTR.forEach((k) => { t[k] = r1(t[k]); });
  return t;
}
export const sumMeals = (meals = []) => sumItems(meals.flatMap((m) => m.foods));

export function toBuilderMeals(meals = []) {
  return meals.map((m) => ({ _key: key(), id: m.id, meal_type: m.meal_type, name: m.name, meal_time: m.meal_time ? m.meal_time.slice(0, 5) : '', foods: (m.foods || []).map((f) => ({ _key: key(), ...f })) }));
}
export function foodFromMaster(f) {
  return {
    _key: key(), food_id: f.id, food_name: f.name, category: f.category, serving_size: f.serving_size, serving_unit: f.serving_unit, quantity: 1, notes: '',
    calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g, fiber_g: f.fiber_g, sugar_g: f.sugar_g, is_vegetarian: f.is_vegetarian, is_vegan: f.is_vegan,
  };
}
export function toPayloadMeals(meals) {
  return meals.map((m) => ({
    ...(m.id ? { id: m.id } : {}), meal_type: m.meal_type, name: m.name, meal_time: m.meal_time || null,
    foods: m.foods.map((f) => ({ ...(f.id ? { id: f.id } : {}), food_id: f.food_id, quantity: Number(f.quantity) || 1, notes: f.notes || null })),
  }));
}
/** Share of calories from each macro (4/4/9 kcal per gram). */
export function macroSplit(t) {
  const p = t.protein_g * 4; const c = t.carbs_g * 4; const f = t.fat_g * 9; const total = p + c + f || 1;
  return { protein: Math.round((100 * p) / total), carbs: Math.round((100 * c) / total), fat: Math.round((100 * f) / total) };
}
