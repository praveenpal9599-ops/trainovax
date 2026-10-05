import { z } from 'zod';
import { reqStr, optStr, optInt, optNum, status, boolish, DIFFICULTY, email } from './common.js';

export const exerciseSchema = z.object({
  name: reqStr(120, 'Exercise name'),
  description: optStr(2000),
  category_id: optInt(1, 65535),
  primary_muscle_id: optInt(1, 65535),
  secondary_muscle_id: optInt(1, 65535),
  equipment: optStr(100),
  difficulty: z.enum(DIFFICULTY).default('beginner'),
  exercise_type: z.enum(['reps', 'time', 'distance']).default('reps'),
  instructions: optStr(5000),
  default_sets: optInt(0, 50),
  default_reps: optStr(20),
  default_duration_sec: optInt(0, 86400),
  default_rest_sec: optInt(0, 3600),
  video_url: z.preprocess((v) => (v === '' ? null : v), z.string().url('Enter a valid URL').max(500).nullable()).optional(),
  image_url: optStr(500),
  status: status.default('active'),
});

export const foodSchema = z.object({
  name: reqStr(120, 'Food name'),
  category_id: optInt(1, 65535),
  serving_size: z.coerce.number().positive('Serving size must be positive').max(10000),
  serving_unit: reqStr(20, 'Serving unit'),
  calories: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000).default(0),
  carbs_g: z.coerce.number().min(0).max(1000).default(0),
  fat_g: z.coerce.number().min(0).max(1000).default(0),
  fiber_g: z.coerce.number().min(0).max(1000).default(0),
  sugar_g: z.coerce.number().min(0).max(1000).default(0),
  sodium_mg: z.coerce.number().min(0).max(100000).default(0),
  is_vegetarian: boolish.default(true),
  is_vegan: boolish.default(false),
  allergens: optStr(255),
  status: status.default('active'),
});

export const organizationSchema = z.object({
  name: reqStr(150, 'Organization name'),
  email: z.preprocess((v) => (v === '' ? null : v), email.nullable()).optional(),
  phone: optStr(30),
  address: optStr(255),
  city: optStr(100),
  country: optStr(100),
  status: status.default('active'),
});

export const subscriptionPlanSchema = z.object({
  name: reqStr(80, 'Plan name'),
  description: optStr(255),
  price_monthly: z.coerce.number().min(0),
  price_yearly: z.coerce.number().min(0),
  max_trainers: z.coerce.number().int().min(1),
  max_clients: z.coerce.number().int().min(1),
  status: status.default('active'),
});

export const subscriptionSchema = z.object({
  organization_id: z.coerce.number().int().positive('Organization is required'),
  plan_id: z.coerce.number().int().positive('Plan is required'),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  amount: optNum(0, 10000000),
  status: z.enum(['trial', 'active', 'past_due', 'cancelled', 'expired']).default('active'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.preprocess((v) => (v === '' ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).optional(),
  auto_renew: boolish.default(true),
});

export const statusSchema = z.object({ status });
