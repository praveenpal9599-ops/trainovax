import { z } from 'zod';
import { reqStr, optStr, optInt, email, password, status } from './common.js';

const base = {
  name: reqStr(120, 'Full name'),
  email,
  phone: optStr(30),
  organization_id: optInt(1, 10_000_000),
  role: z.enum(['admin', 'trainer', 'super_admin']).default('trainer'),
  status: status.default('active'),
  specialization: optStr(150),
  experience_years: optInt(0, 80),
  certifications: optStr(255),
  bio: optStr(2000),
};
export const createUserSchema = z.object({ ...base, password });
export const updateUserSchema = z.object({ ...base, password: z.preprocess((v) => (v === '' ? undefined : v), password.optional()) });
