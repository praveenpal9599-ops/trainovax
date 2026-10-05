import { z } from 'zod';
import { reqStr, optStr, optInt, optNum, optDate, status, GOALS, password, boolish, reqDate } from './common.js';

const profile = z.object({
  date_of_birth: optDate,
  address: optStr(255),
  occupation: optStr(120),
  emergency_contact_name: optStr(120),
  emergency_contact_phone: optStr(30),
  target_weight_kg: optNum(20, 400),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).nullable().optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  dietary_preference: z.enum(['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian']).nullable().optional(),
  medical_conditions: optStr(500),
  injuries: optStr(500),
  allergies: optStr(255),
  medications: optStr(255),
  workout_days_per_week: optInt(0, 7),
  preferred_workout_time: z.enum(['early_morning', 'morning', 'afternoon', 'evening', 'night']).nullable().optional(),
  sleep_hours: optNum(0, 24),
  water_goal_ml: optInt(0, 10000),
}).partial();

const emailOpt = z.preprocess((v) => (v === '' ? null : v), z.string().trim().toLowerCase().email('Enter a valid email').max(190).nullable()).optional();

const core = {
  full_name: reqStr(120, 'Full name'),
  email: emailOpt,
  phone: z.preprocess((v) => (v === '' ? null : v), z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number').nullable()).optional(),
  age: optInt(10, 100),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  height_cm: optNum(80, 250),
  fitness_goal: z.enum(GOALS).default('general_fitness'),
  notes: optStr(5000),
  trainer_id: optInt(1, 10_000_000),
  status: status.default('active'),
  joined_on: optDate,
  profile: profile.optional(),
};

export const createClientSchema = z.object({
  ...core,
  weight_kg: optNum(20, 400),
  create_login: boolish.optional().default(false),
  password: z.preprocess((v) => (v === '' ? undefined : v), password.optional()),
}).refine((d) => !d.create_login || (d.email && d.password), { message: 'Email and password are required to create a client login', path: ['password'] });

export const updateClientSchema = z.object({
  ...core,
  current_weight_kg: optNum(20, 400),
  create_login: boolish.optional().default(false),
  password: z.preprocess((v) => (v === '' ? undefined : v), password.optional()),
});

export const bulkSchema = z.object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(500), status: status.optional() });
export const noteSchema = z.object({ content: reqStr(5000, 'Note'), is_pinned: boolish.optional().default(false) });
export const attendanceSchema = z.object({
  session_date: reqDate,
  check_in_time: z.preprocess((v) => (v === '' ? null : v), z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable()).optional(),
  status: z.enum(['present', 'absent', 'late', 'excused']).default('present'),
  notes: optStr(255),
});
