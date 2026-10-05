import { query, queryOne, transaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/permissions.js';
import { hashPassword } from './authService.js';
import { notify } from './notificationService.js';
import { calcBmi, round1 } from '../utils/fitness.js';
import { today } from '../utils/dates.js';
import { parseListQuery, paged, Where } from '../utils/pagination.js';
import { clientScope } from './accessService.js';

export const CLIENT_LIST_SELECT = `SELECT c.id, c.user_id, c.full_name, c.email, c.phone, c.age, c.gender, c.height_cm,
    c.starting_weight_kg, c.current_weight_kg, c.fitness_goal, c.photo_url, c.status, c.joined_on, c.created_at,
    c.trainer_id, c.organization_id, tu.name AS trainer_name, o.name AS organization_name,
    (SELECT MAX(pr.record_date) FROM progress_records pr WHERE pr.client_id = c.id AND pr.deleted_at IS NULL) AS last_progress_date,
    (SELECT wp.name FROM workout_plans wp WHERE wp.client_id = c.id AND wp.status = 'active' AND wp.deleted_at IS NULL ORDER BY wp.id DESC LIMIT 1) AS active_workout,
    (SELECT dp.name FROM diet_plans dp WHERE dp.client_id = c.id AND dp.status = 'active' AND dp.deleted_at IS NULL ORDER BY dp.id DESC LIMIT 1) AS active_diet
  FROM clients c
  LEFT JOIN trainers t ON t.id = c.trainer_id
  LEFT JOIN users tu ON tu.id = t.user_id
  LEFT JOIN organizations o ON o.id = c.organization_id`;

export async function listClients(user, q) {
  const opts = parseListQuery(q, {
    sortable: {
      name: 'c.full_name', age: 'c.age', weight: 'c.current_weight_kg', goal: 'c.fitness_goal', status: 'c.status',
      trainer: 'tu.name', lastProgress: 'last_progress_date', created: 'c.created_at',
    },
    defaultSort: 'created',
  });
  const scope = clientScope(user);
  const w = new Where().add('c.deleted_at IS NULL').add(scope.sql, ...scope.params);
  w.search(opts.search, ['c.full_name', 'c.phone', 'c.email']);
  w.addIf(q.status, 'c.status = ?', q.status);
  w.addIf(q.goal, 'c.fitness_goal = ?', q.goal);
  w.addIf(q.gender, 'c.gender = ?', q.gender);
  w.addIf(q.trainerId, 'c.trainer_id = ?', q.trainerId);
  w.addIf(q.organizationId, 'c.organization_id = ?', q.organizationId);
  const { total } = await queryOne(`SELECT COUNT(*) AS total FROM clients c LEFT JOIN trainers t ON t.id = c.trainer_id LEFT JOIN users tu ON tu.id = t.user_id ${w.sql}`, w.params);
  const limit = opts.all ? '' : `LIMIT ${opts.pageSize} OFFSET ${opts.offset}`;
  const rows = await query(`${CLIENT_LIST_SELECT} ${w.sql} ORDER BY ${opts.sortCol} ${opts.sortDir}, c.id DESC ${limit}`, w.params);
  return paged(rows, total, opts.all ? { page: 1, pageSize: Math.max(total, 1) } : opts);
}

/** Full client detail used by the profile page. */
export async function getClientDetail(id) {
  const client = await queryOne(`${CLIENT_LIST_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL`, [id]);
  if (!client) throw ApiError.notFound('Client not found');
  const full = await queryOne('SELECT notes FROM clients WHERE id = ?', [id]);
  const profile = await queryOne('SELECT * FROM client_profiles WHERE client_id = ?', [id]);
  const trainer = client.trainer_id ? await queryOne(
    `SELECT t.id, t.specialization, t.experience_years, t.certifications, t.bio, u.id AS user_id, u.name, u.email, u.phone, u.avatar_url
       FROM trainers t JOIN users u ON u.id = t.user_id WHERE t.id = ?`, [client.trainer_id]) : null;
  const latest = await queryOne('SELECT * FROM progress_records WHERE client_id = ? AND deleted_at IS NULL ORDER BY record_date DESC, id DESC LIMIT 1', [id]);
  const first = await queryOne('SELECT * FROM progress_records WHERE client_id = ? AND deleted_at IS NULL ORDER BY record_date ASC, id ASC LIMIT 1', [id]);
  const counts = await queryOne(`SELECT
      (SELECT COUNT(*) FROM progress_records WHERE client_id = ? AND deleted_at IS NULL) AS progress_records,
      (SELECT COUNT(*) FROM progress_photos WHERE client_id = ? AND deleted_at IS NULL) AS progress_photos,
      (SELECT COUNT(*) FROM workout_plans WHERE client_id = ? AND deleted_at IS NULL) AS workout_plans,
      (SELECT COUNT(*) FROM diet_plans WHERE client_id = ? AND deleted_at IS NULL) AS diet_plans,
      (SELECT COUNT(*) FROM attendance WHERE client_id = ? AND status IN ('present','late') AND session_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS sessions_30d`,
  [id, id, id, id, id]);

  const starting = client.starting_weight_kg ?? first?.weight_kg ?? null;
  const current = latest?.weight_kg ?? client.current_weight_kg ?? starting;
  const stats = {
    starting_weight_kg: starting,
    current_weight_kg: current,
    weight_change_kg: starting != null && current != null ? round1(current - starting) : null,
    bmi: calcBmi(current, client.height_cm),
    body_fat_pct: latest?.body_fat_pct ?? null,
    starting_body_fat_pct: first?.body_fat_pct ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
  };
  return { ...client, notes: full?.notes ?? null, profile: profile || {}, trainer, latest_measurement: latest, first_measurement: first, stats, counts };
}

async function resolveTrainer(user, requestedTrainerId, conn) {
  if (user.role === ROLES.TRAINER) return { trainerId: user.trainerId, organizationId: user.organizationId };
  if (!requestedTrainerId) {
    return user.role === ROLES.ADMIN ? { trainerId: user.trainerId ?? null, organizationId: user.organizationId } : { trainerId: null, organizationId: null };
  }
  const t = await queryOne('SELECT id, organization_id FROM trainers WHERE id = ? AND deleted_at IS NULL', [requestedTrainerId], conn);
  if (!t) throw ApiError.badRequest('Selected trainer does not exist');
  if (user.role === ROLES.ADMIN && t.organization_id !== user.organizationId) throw ApiError.badRequest('Trainer belongs to another organization');
  return { trainerId: t.id, organizationId: t.organization_id };
}

async function upsertProfile(conn, clientId, profile) {
  if (!profile || !Object.keys(profile).length) {
    await conn.query('INSERT IGNORE INTO client_profiles (client_id) VALUES (?)', [clientId]);
    return;
  }
  const clean = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined));
  await conn.query('INSERT INTO client_profiles SET ? ON DUPLICATE KEY UPDATE ?', [{ client_id: clientId, ...clean }, clean]);
}

async function createClientLogin(conn, { email, password, name, phone, organizationId }) {
  const exists = await queryOne('SELECT id FROM users WHERE email = ?', [email], conn);
  if (exists) throw ApiError.conflict('A user with this email already exists');
  const role = await queryOne("SELECT id FROM roles WHERE name = 'client'", [], conn);
  const [u] = await conn.query('INSERT INTO users (role_id, organization_id, name, email, password_hash, phone) VALUES (?,?,?,?,?,?)',
    [role.id, organizationId, name, email, await hashPassword(password), phone ?? null]);
  return u.insertId;
}

export async function createClient(user, b) {
  return transaction(async (conn) => {
    const { trainerId, organizationId } = await resolveTrainer(user, b.trainer_id, conn);
    let userId = null;
    if (b.create_login) userId = await createClientLogin(conn, { email: b.email, password: b.password, name: b.full_name, phone: b.phone, organizationId });
    const [r] = await conn.query('INSERT INTO clients SET ?', [{
      user_id: userId, organization_id: organizationId, trainer_id: trainerId, full_name: b.full_name, email: b.email ?? null,
      phone: b.phone ?? null, age: b.age ?? null, gender: b.gender ?? null, height_cm: b.height_cm ?? null,
      starting_weight_kg: b.weight_kg ?? null, current_weight_kg: b.weight_kg ?? null, fitness_goal: b.fitness_goal,
      notes: b.notes ?? null, status: b.status, joined_on: b.joined_on || today(),
    }]);
    const clientId = r.insertId;
    await upsertProfile(conn, clientId, b.profile);
    if (b.weight_kg) {
      await conn.query('INSERT INTO progress_records SET ?', [{
        client_id: clientId, recorded_by: user.id, record_date: b.joined_on || today(), weight_kg: b.weight_kg,
        bmi: calcBmi(b.weight_kg, b.height_cm), notes: 'Initial assessment',
      }]);
    }
    if (userId) await notify(userId, { type: 'welcome', title: 'Welcome to TrainovaX!', body: 'Your trainer has set up your account. Explore your dashboard to get started.', link: '/client/dashboard' }, conn);
    return clientId;
  });
}

export async function updateClient(user, existing, b) {
  await transaction(async (conn) => {
    const fields = {
      full_name: b.full_name, email: b.email ?? null, phone: b.phone ?? null, age: b.age ?? null, gender: b.gender ?? null,
      height_cm: b.height_cm ?? null, fitness_goal: b.fitness_goal, notes: b.notes ?? null, status: b.status,
    };
    if (b.joined_on) fields.joined_on = b.joined_on;
    if (b.current_weight_kg) fields.current_weight_kg = b.current_weight_kg;
    if ((user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) && b.trainer_id !== undefined) {
      const { trainerId, organizationId } = await resolveTrainer(user, b.trainer_id, conn);
      fields.trainer_id = trainerId; fields.organization_id = organizationId;
    }
    if (!existing.user_id && b.create_login) {
      if (!b.email || !b.password) throw ApiError.badRequest('Email and password are required to create a client login');
      fields.user_id = await createClientLogin(conn, { email: b.email, password: b.password, name: b.full_name, phone: b.phone, organizationId: existing.organization_id });
    } else if (existing.user_id) {
      const uf = { name: b.full_name, phone: b.phone ?? null, status: b.status };
      if (b.email) uf.email = b.email;
      if (b.password) uf.password_hash = await hashPassword(b.password);
      await conn.query('UPDATE users SET ? WHERE id = ?', [uf, existing.user_id]);
    }
    await conn.query('UPDATE clients SET ? WHERE id = ?', [fields, existing.id]);
    await upsertProfile(conn, existing.id, b.profile);
  });
}

export async function setClientStatus(ids, status) {
  await transaction(async (conn) => {
    await conn.query('UPDATE clients SET status = ? WHERE id IN (?)', [status, ids]);
    await conn.query('UPDATE users SET status = ? WHERE id IN (SELECT user_id FROM clients WHERE id IN (?) AND user_id IS NOT NULL)', [status, ids]);
  });
}

export async function deleteClients(ids) {
  await transaction(async (conn) => {
    await conn.query("UPDATE users SET deleted_at = NOW(), status='inactive', email = CONCAT('deleted+', id, '+', email) WHERE id IN (SELECT user_id FROM clients WHERE id IN (?) AND user_id IS NOT NULL)", [ids]);
    await conn.query("UPDATE clients SET deleted_at = NOW(), status='inactive' WHERE id IN (?)", [ids]);
  });
}

/** Activity timeline for the "History" view. */
export async function clientHistory(clientId) {
  return query(`
    SELECT * FROM (
      SELECT 'progress' AS type, pr.id, CONCAT('Measurement recorded', IF(pr.weight_kg IS NULL, '', CONCAT(' · ', pr.weight_kg, ' kg'))) AS title, pr.notes AS detail, CAST(pr.record_date AS DATETIME) AS happened_at FROM progress_records pr WHERE pr.client_id = ? AND pr.deleted_at IS NULL
      UNION ALL SELECT 'workout', wp.id, CONCAT('Workout plan assigned: ', wp.name), wp.status, wp.created_at FROM workout_plans wp WHERE wp.client_id = ? AND wp.deleted_at IS NULL
      UNION ALL SELECT 'diet', dp.id, CONCAT('Diet plan assigned: ', dp.name), dp.status, dp.created_at FROM diet_plans dp WHERE dp.client_id = ? AND dp.deleted_at IS NULL
      UNION ALL SELECT 'photo', pp.id, CONCAT('Progress photo uploaded (', pp.pose, ')'), pp.notes, CAST(pp.taken_on AS DATETIME) FROM progress_photos pp WHERE pp.client_id = ? AND pp.deleted_at IS NULL
      UNION ALL SELECT 'note', cn.id, 'Trainer note added', LEFT(cn.content, 200), cn.created_at FROM client_notes cn WHERE cn.client_id = ? AND cn.deleted_at IS NULL
    ) h ORDER BY happened_at DESC LIMIT 100`, [clientId, clientId, clientId, clientId, clientId]);
}
