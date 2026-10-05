import { z } from 'zod';
/** Frontend validation helpers mirroring the API rules. */
export const optionalNumber = (min, max, label = 'Value') => z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number({ invalid_type_error: `${label} must be a number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`).nullable(),
);
export const requiredNumber = (min, max, label = 'Value') => z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`),
);
export const requiredString = (label, max = 255) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);
export const optionalString = (max = 255) => z.string().max(max).optional().nullable();
export const optionalEmail = z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional().nullable();
export const password = z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');
