import { z } from 'zod';
import { reqStr, optStr, optInt, optNum, optDate, DIFFICULTY, MEAL_TYPES } from './common.js';

const workoutExercise = z.object({
  id: optInt(1, 1e9),
  exercise_id: z.coerce.number().int().positive('Select an exercise'),
  sets: optInt(0, 50),
  reps: optStr(20),
  duration_sec: optInt(0, 86400),
  weight_kg: optNum(0, 1000),
  rest_sec: optInt(0, 3600),
  tempo: optStr(20),
  notes: optStr(500),
});
const workoutDay = z.object({
  id: optInt(1, 1e9),
  name: reqStr(100, 'Day name'),
  day_of_week: optInt(1, 7),
  focus: optStr(120),
  exercises: z.array(workoutExercise).max(40).default([]),
});
const workoutBase = {
  name: reqStr(150, 'Plan name'),
  description: optStr(5000),
  goal: optStr(40),
  difficulty: z.enum(DIFFICULTY).default('beginner'),
  days: z.array(workoutDay).max(14).default([]),
};
export const workoutPlanSchema = z.object({
  ...workoutBase,
  client_id: z.coerce.number().int().positive('Select a client'),
  template_id: optInt(1, 1e9),
  start_date: optDate,
  end_date: optDate,
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('active'),
});
export const workoutTemplateSchema = z.object({
  ...workoutBase,
  duration_weeks: optInt(1, 104),
  status: z.enum(['active', 'inactive']).default('active'),
  is_global: z.boolean().optional(),
});

const dietFood = z.object({
  id: optInt(1, 1e9),
  food_id: z.coerce.number().int().positive('Select a food'),
  quantity: z.coerce.number().positive('Quantity must be positive').max(100),
  notes: optStr(255),
});
const dietMeal = z.object({
  id: optInt(1, 1e9),
  meal_type: z.enum(MEAL_TYPES),
  name: reqStr(100, 'Meal name'),
  meal_time: z.preprocess((v) => (v === '' ? null : v), z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable()).optional(),
  foods: z.array(dietFood).max(40).default([]),
});
const dietBase = {
  name: reqStr(150, 'Plan name'),
  description: optStr(5000),
  goal: optStr(40),
  diet_type: z.enum(['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian', 'mixed']).default('mixed'),
  target_calories: optInt(0, 10000),
  meals: z.array(dietMeal).max(12).default([]),
};
export const dietPlanSchema = z.object({
  ...dietBase,
  client_id: z.coerce.number().int().positive('Select a client'),
  template_id: optInt(1, 1e9),
  water_target_ml: optInt(0, 10000),
  start_date: optDate,
  end_date: optDate,
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('active'),
});
export const dietTemplateSchema = z.object({
  ...dietBase,
  status: z.enum(['active', 'inactive']).default('active'),
  is_global: z.boolean().optional(),
});

export const fromTemplateSchema = z.object({
  template_id: z.coerce.number().int().positive(),
  client_id: z.coerce.number().int().positive(),
  start_date: optDate,
  name: optStr(150),
});
export const duplicateSchema = z.object({ client_id: optInt(1, 1e9), name: optStr(150) });
export const saveAsTemplateSchema = z.object({ name: reqStr(150, 'Template name') });
