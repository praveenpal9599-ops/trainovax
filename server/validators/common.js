import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const optStr = (max = 255) => z.string().trim().max(max).optional().nullable().transform((v) => (v === '' ? null : v));
export const reqStr = (max = 255, label = 'This field') => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
export const optNum = (min = 0, max = 100000) => z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable()).optional();
export const optInt = (min = 0, max = 100000) => z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().min(min).max(max).nullable()).optional();
export const optDate = z.preprocess((v) => (v === '' ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').nullable()).optional();
export const reqDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const status = z.enum(['active', 'inactive']);
export const boolish = z.preprocess((v) => (v === 'true' || v === 1 || v === '1' ? true : v === 'false' || v === 0 || v === '0' ? false : v), z.boolean());
export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(190);
export const password = z.string().min(8, 'Password must be at least 8 characters').max(100)
  .regex(/[A-Za-z]/, 'Password must contain a letter').regex(/\d/, 'Password must contain a number');
export const GOALS = ['weight_loss', 'muscle_gain', 'strength_training', 'endurance', 'general_fitness', 'flexibility'];
export const MEAL_TYPES = ['breakfast', 'mid_morning', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'bedtime'];
export const DIFFICULTY = ['beginner', 'intermediate', 'advanced'];
