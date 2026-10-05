import { z } from 'zod';
import { optNum, optStr, reqDate, optInt } from './common.js';

const m = (max) => optNum(0, max);
export const progressSchema = z.object({
  client_id: z.coerce.number().int().positive().optional(),
  record_date: reqDate,
  weight_kg: optNum(20, 400),
  chest_cm: m(250), waist_cm: m(250), arms_cm: m(100), thighs_cm: m(150), hips_cm: m(250),
  neck_cm: m(100), calves_cm: m(100),
  body_fat_pct: optNum(1, 70),
  notes: optStr(500),
}).refine((d) => ['weight_kg', 'chest_cm', 'waist_cm', 'arms_cm', 'thighs_cm', 'hips_cm', 'neck_cm', 'calves_cm', 'body_fat_pct'].some((k) => d[k] != null),
  { message: 'Enter at least one measurement', path: ['weight_kg'] });

export const photoSchema = z.object({
  client_id: z.coerce.number().int().positive().optional(),
  pose: z.enum(['front', 'side', 'back', 'other']).default('front'),
  taken_on: reqDate,
  notes: optStr(255),
  progress_record_id: optInt(1, 1e9),
});
