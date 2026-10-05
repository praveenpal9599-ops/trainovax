export function calcBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = Number(heightCm) / 100;
  return Math.round((Number(weightKg) / (m * m)) * 10) / 10;
}
export const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

/** Sum nutrition for a list of {quantity, calories, protein_g, ...} rows. */
export function sumNutrition(items) {
  const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 };
  for (const it of items) {
    const q = Number(it.quantity) || 0;
    for (const k of Object.keys(t)) t[k] += (Number(it[k]) || 0) * q;
  }
  for (const k of Object.keys(t)) t[k] = round1(t[k]);
  return t;
}
