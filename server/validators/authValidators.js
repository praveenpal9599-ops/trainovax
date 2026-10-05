import { z } from 'zod';
import { email, password, reqStr, optStr, optInt, optNum, GOALS } from './common.js';

/** `portal` is the tab the user signed in from: staff (trainer / admin) or client. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(100),
  remember: z.boolean().optional().default(false),
  portal: z.enum(['trainer', 'client']).optional(),
});

const base = { name: reqStr(120, 'Full name'), email, phone: optStr(30), password };

/** Trainer sign-up (independent trainer, or gym owner when isGymOwner = true). */
const trainerRegister = z.object({
  accountType: z.literal('trainer'),
  ...base,
  organizationName: optStr(150),
  isGymOwner: z.boolean().optional().default(false),
  specialization: optStr(150),
});

/** Client sign-up — joins a trainer using the trainer's invite code. */
const clientRegister = z.object({
  accountType: z.literal('client'),
  ...base,
  trainerCode: z.string().trim().toUpperCase().min(4, 'Enter your trainer code').max(12),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  age: optInt(10, 100),
  height_cm: optNum(80, 250),
  weight_kg: optNum(20, 400),
  fitness_goal: z.enum(GOALS).default('general_fitness'),
});

/** Legacy payload (organizationName without accountType) is treated as a gym-owner sign-up. */
export const registerSchema = z.preprocess(
  (b) => (b && typeof b === 'object' && !b.accountType ? { ...b, accountType: 'trainer', isGymOwner: true } : b),
  z.discriminatedUnion('accountType', [trainerRegister, clientRegister]),
);

export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().length(64, 'Invalid reset token'), password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: password });
export const updateMeSchema = z.object({ name: reqStr(120, 'Name'), phone: optStr(30) });
export const trainerCodeParam = z.object({ code: z.string().trim().toUpperCase().min(4).max(12) });
