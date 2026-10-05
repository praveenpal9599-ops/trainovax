import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/env.js';
import { query, queryOne, transaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/permissions.js';
import { today, addDays } from '../utils/dates.js';
import { notify } from './notificationService.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.bcryptRounds);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function signToken(user, remember = false) {
  const expiresIn = remember ? env.jwt.rememberExpiresIn : env.jwt.expiresIn;
  return { token: jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, { expiresIn }), expiresIn };
}

export async function getSessionUser(userId) {
  const u = await queryOne(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.status, u.organization_id, u.last_login_at,
            r.name AS role, r.label AS role_label, o.name AS organization_name,
            t.id AS trainer_id, t.invite_code, c.id AS client_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN trainers t ON t.user_id = u.id AND t.deleted_at IS NULL
       LEFT JOIN clients c ON c.user_id = u.id AND c.deleted_at IS NULL
      WHERE u.id = ? AND u.deleted_at IS NULL`, [userId]);
  return u;
}

export async function login({ email, password, remember, portal }) {
  const row = await queryOne(
    `SELECT u.id, u.password_hash, u.status, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.email = ? AND u.deleted_at IS NULL`, [email]);
  // Constant-ish time: always run bcrypt compare
  const valid = await bcrypt.compare(password, row?.password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!row || !valid) throw ApiError.unauthorized('Invalid email or password');
  if (row.status !== 'active') throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');
  if (portal === 'client' && row.role !== ROLES.CLIENT) throw ApiError.forbidden('This is a trainer / staff account. Switch to the Trainer tab to sign in.');
  if (portal === 'trainer' && row.role === ROLES.CLIENT) throw ApiError.forbidden('This is a client account. Switch to the Client tab to sign in.');
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [row.id]);
  const user = await getSessionUser(row.id);
  return { ...signToken(user, remember), user };
}

/** Generate a unique, human-friendly trainer invite code (e.g. "ROHIT7"). */
export async function generateInviteCode(name, conn) {
  const stem = (name || 'COACH').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'COACH';
  for (let i = 0; i < 20; i += 1) {
    const code = `${stem}${crypto.randomInt(10, 1000)}`.slice(0, 10);
    const taken = await queryOne('SELECT id FROM trainers WHERE invite_code = ?', [code], conn);
    if (!taken) return code;
  }
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** Public lookup used by the client sign-up form to confirm the trainer code. */
export async function findTrainerByCode(code) {
  return queryOne(`SELECT t.id, u.name, t.specialization, o.name AS organization_name, u.avatar_url
      FROM trainers t JOIN users u ON u.id = t.user_id LEFT JOIN organizations o ON o.id = t.organization_id
     WHERE t.invite_code = ? AND t.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'`, [String(code).toUpperCase()]);
}

async function superAdminIds(conn) {
  return (await query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='super_admin' AND u.deleted_at IS NULL", [], conn)).map((a) => a.id);
}

/**
 * Self sign-up.
 *  - trainer: creates their studio (organization) + 14-day trial. Independent trainers get the `trainer`
 *    role (mobile app); gym owners (isGymOwner) get the `admin` role (desktop panel) and also coach.
 *  - client: joins the trainer identified by `trainerCode`.
 */
export async function register(b) {
  const exists = await queryOne('SELECT id FROM users WHERE email = ?', [b.email]);
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const hash = await hashPassword(b.password);

  if (b.accountType === 'client') {
    const trainer = await queryOne(`SELECT t.id, t.user_id, t.organization_id FROM trainers t JOIN users u ON u.id = t.user_id
      WHERE t.invite_code = ? AND t.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'`, [b.trainerCode]);
    if (!trainer) throw ApiError.badRequest('Trainer code not found. Ask your trainer for their code.', [{ field: 'trainerCode', message: 'Trainer code not found' }]);
    const userId = await transaction(async (conn) => {
      const role = await queryOne('SELECT id FROM roles WHERE name = ?', [ROLES.CLIENT], conn);
      const [u] = await conn.query('INSERT INTO users (role_id, organization_id, name, email, password_hash, phone) VALUES (?,?,?,?,?,?)',
        [role.id, trainer.organization_id, b.name, b.email, hash, b.phone ?? null]);
      const [c] = await conn.query('INSERT INTO clients SET ?', [{
        user_id: u.insertId, organization_id: trainer.organization_id, trainer_id: trainer.id, full_name: b.name, email: b.email, phone: b.phone ?? null,
        age: b.age ?? null, gender: b.gender ?? null, height_cm: b.height_cm ?? null, starting_weight_kg: b.weight_kg ?? null,
        current_weight_kg: b.weight_kg ?? null, fitness_goal: b.fitness_goal, joined_on: today(),
      }]);
      await conn.query('INSERT INTO client_profiles (client_id) VALUES (?)', [c.insertId]);
      if (b.weight_kg) {
        const m = b.height_cm ? b.height_cm / 100 : null;
        await conn.query('INSERT INTO progress_records SET ?', [{ client_id: c.insertId, recorded_by: u.insertId, record_date: today(), weight_kg: b.weight_kg,
          bmi: m ? Math.round((b.weight_kg / (m * m)) * 10) / 10 : null, notes: 'Starting weight (self-registered)' }]);
      }
      await notify(trainer.user_id, { type: 'welcome', title: `${b.name} joined as your client`, body: 'Say hello and assign a workout and diet plan.', link: `/trainer/clients/${c.insertId}` }, conn);
      await notify(u.insertId, { type: 'welcome', title: 'Welcome to TrainovaX!', body: 'Your trainer has been notified and will set up your plans soon.', link: '/client/dashboard' }, conn);
      return u.insertId;
    });
    const user = await getSessionUser(userId);
    return { ...signToken(user, false), user };
  }

  const orgName = b.organizationName?.trim() || `${b.name.split(' ')[0]}'s Fitness`;
  const roleName = b.isGymOwner ? ROLES.ADMIN : ROLES.TRAINER;
  const userId = await transaction(async (conn) => {
    const slugBase = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120) || 'org';
    const slug = `${slugBase}-${crypto.randomBytes(3).toString('hex')}`;
    const [org] = await conn.query('INSERT INTO organizations (name, slug, email, phone) VALUES (?, ?, ?, ?)', [orgName, slug, b.email, b.phone ?? null]);
    const role = await queryOne('SELECT id FROM roles WHERE name = ?', [roleName], conn);
    const [u] = await conn.query('INSERT INTO users (role_id, organization_id, name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [role.id, org.insertId, b.name, b.email, hash, b.phone ?? null]);
    await conn.query('INSERT INTO trainers (user_id, organization_id, invite_code, specialization) VALUES (?, ?, ?, ?)',
      [u.insertId, org.insertId, await generateInviteCode(b.name, conn), b.specialization ?? null]);
    const plan = await queryOne("SELECT id FROM subscription_plans WHERE status='active' ORDER BY price_monthly ASC LIMIT 1", [], conn);
    if (plan) {
      await conn.query("INSERT INTO subscriptions (organization_id, plan_id, status, start_date, end_date, amount) VALUES (?, ?, 'trial', ?, ?, 0)",
        [org.insertId, plan.id, today(), addDays(today(), 14)]);
    }
    await notify(await superAdminIds(conn), { type: 'organization', title: `New ${b.isGymOwner ? 'gym' : 'trainer'} registered`, body: `${orgName} signed up (${b.email}).`, link: '/super-admin/organizations' }, conn);
    return u.insertId;
  });
  const user = await getSessionUser(userId);
  return { ...signToken(user, false), user };
}

export async function forgotPassword(email) {
  const user = await queryOne("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL AND status='active'", [email]);
  if (!user) return null; // do not reveal whether the email exists
  const token = crypto.randomBytes(32).toString('hex');
  await query('UPDATE users SET reset_token_hash = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [sha256(token), user.id]);
  return { userId: user.id, token, url: `${env.appUrl}/reset-password?token=${token}` };
}

export async function resetPassword({ token, password }) {
  const user = await queryOne('SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW() AND deleted_at IS NULL', [sha256(token)]);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  await query('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?', [await hashPassword(password), user.id]);
  return user.id;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) throw ApiError.badRequest('Current password is incorrect');
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(newPassword), userId]);
}
