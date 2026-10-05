import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';
import { query } from '../config/db.js';
import * as auth from '../services/authService.js';
import { audit } from '../services/auditService.js';
import { fileUrl } from '../middleware/upload.js';

export const login = asyncHandler(async (req, res) => {
  const result = await auth.login(req.body);
  await audit(req, 'login', 'user', result.user.id, `${result.user.email} signed in`, result.user.id);
  res.json({ success: true, ...result });
});

export const register = asyncHandler(async (req, res) => {
  const result = await auth.register(req.body);
  await audit(req, 'register', 'user', result.user.id, `${result.user.email} signed up as ${result.user.role_label}`, result.user.id);
  res.status(201).json({ success: true, ...result });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const r = await auth.forgotPassword(req.body.email);
  if (r) {
    await audit(req, 'password_reset_request', 'user', r.userId, 'Password reset requested', r.userId);
    // In production, send r.url via your email provider here.
    if (!env.isProd) console.log(`[auth] password reset link for ${req.body.email}: ${r.url}`);
  }
  res.json({
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
    ...(r && !env.isProd ? { devResetUrl: r.url } : {}),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const userId = await auth.resetPassword(req.body);
  await audit(req, 'password_reset', 'user', userId, 'Password reset completed', userId);
  res.json({ success: true, message: 'Password updated. You can now sign in.' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: await auth.getSessionUser(req.user.id), permissions: [...req.user.permissions] });
});

export const updateMe = asyncHandler(async (req, res) => {
  await query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [req.body.name, req.body.phone ?? null, req.user.id]);
  if (req.user.clientId) await query('UPDATE clients SET full_name = ?, phone = ? WHERE id = ?', [req.body.name, req.body.phone ?? null, req.user.clientId]);
  await audit(req, 'update', 'user', req.user.id, 'Updated own profile');
  res.json({ success: true, user: await auth.getSessionUser(req.user.id) });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const url = fileUrl(req.file);
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
  if (req.user.clientId) await query('UPDATE clients SET photo_url = ? WHERE id = ?', [url, req.user.clientId]);
  res.json({ success: true, user: await auth.getSessionUser(req.user.id) });
});

export const changePassword = asyncHandler(async (req, res) => {
  await auth.changePassword(req.user.id, req.body);
  await audit(req, 'password_change', 'user', req.user.id, 'Changed password');
  res.json({ success: true, message: 'Password changed successfully' });
});

export const logout = asyncHandler(async (req, res) => {
  await audit(req, 'logout', 'user', req.user.id, `${req.user.email} signed out`);
  res.json({ success: true });
});

export const trainerByCode = asyncHandler(async (req, res) => {
  const t = await auth.findTrainerByCode(req.params.code);
  if (!t) return res.status(404).json({ success: false, message: 'Trainer code not found' });
  res.json({ success: true, data: { name: t.name, specialization: t.specialization, organization_name: t.organization_name, avatar_url: t.avatar_url } });
});
