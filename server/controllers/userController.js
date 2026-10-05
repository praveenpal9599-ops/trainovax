import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne, transaction } from '../config/db.js';
import { parseListQuery, paged, Where } from '../utils/pagination.js';
import { hashPassword, generateInviteCode } from '../services/authService.js';
import { audit } from '../services/auditService.js';
import { ROLES } from '../config/permissions.js';

/** Org admins may only manage trainers inside their own organization. */
const isOrgAdmin = (req) => req.user.role === ROLES.ADMIN;
function assertManageable(req, target) {
  if (!target) throw ApiError.notFound('User not found');
  if (isOrgAdmin(req) && (target.role !== 'trainer' || target.organization_id !== req.user.organizationId)) throw ApiError.notFound('User not found');
  if (target.role === 'client') throw ApiError.notFound('User not found');
}

const SELECT = `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.status, u.last_login_at, u.created_at, u.organization_id,
    r.name AS role, r.label AS role_label, o.name AS organization_name,
    t.id AS trainer_id, t.invite_code, t.specialization, t.experience_years, t.certifications, t.bio,
    (SELECT COUNT(*) FROM clients c WHERE c.trainer_id = t.id AND c.deleted_at IS NULL) AS client_count
  FROM users u JOIN roles r ON r.id = u.role_id
  LEFT JOIN organizations o ON o.id = u.organization_id
  LEFT JOIN trainers t ON t.user_id = u.id AND t.deleted_at IS NULL`;

const findUser = (id) => queryOne(`${SELECT} WHERE u.id = ? AND u.deleted_at IS NULL`, [id]);

/** Super Admin: list admins/trainers (and other super admins). Clients are managed via /clients. */
export const list = asyncHandler(async (req, res) => {
  const opts = parseListQuery(req.query, {
    sortable: { name: 'u.name', email: 'u.email', organization: 'o.name', status: 'u.status', clients: 'client_count', lastLogin: 'u.last_login_at', created: 'u.created_at' },
    defaultSort: 'name', defaultDir: 'asc',
  });
  const w = new Where().add('u.deleted_at IS NULL').add("r.name IN ('admin','trainer','super_admin')");
  if (isOrgAdmin(req)) w.add("r.name IN ('admin','trainer')").add('u.organization_id = ?', req.user.organizationId);
  w.search(opts.search, ['u.name', 'u.email', 'o.name']);
  w.addIf(req.query.role, 'r.name = ?', req.query.role);
  w.addIf(req.query.status, 'u.status = ?', req.query.status);
  w.addIf(req.query.organizationId, 'u.organization_id = ?', req.query.organizationId);
  const { total } = await queryOne(`SELECT COUNT(*) total FROM (${SELECT} ${w.sql}) x`, w.params);
  const rows = await query(`${SELECT} ${w.sql} ORDER BY ${opts.sortCol} ${opts.sortDir} ${opts.all ? '' : `LIMIT ${opts.pageSize} OFFSET ${opts.offset}`}`, w.params);
  res.json({ success: true, ...paged(rows, total, opts.all ? { page: 1, pageSize: Math.max(total, 1) } : opts) });
});

export const get = asyncHandler(async (req, res) => {
  const u = await findUser(req.params.id);
  assertManageable(req, u);
  res.json({ success: true, data: u });
});

export const create = asyncHandler(async (req, res) => {
  const b = { ...req.body };
  if (isOrgAdmin(req)) { b.role = 'trainer'; b.organization_id = req.user.organizationId; }
  if (b.role !== 'super_admin' && !b.organization_id) throw ApiError.badRequest('Organization is required for admins and trainers');
  const hash = await hashPassword(b.password);
  const id = await transaction(async (conn) => {
    const role = await queryOne('SELECT id FROM roles WHERE name = ?', [b.role], conn);
    const [r] = await conn.query('INSERT INTO users (role_id, organization_id, name, email, password_hash, phone, status) VALUES (?,?,?,?,?,?,?)',
      [role.id, b.role === 'super_admin' ? null : b.organization_id, b.name, b.email, hash, b.phone ?? null, b.status]);
    if (b.role !== 'super_admin') {
      await conn.query('INSERT INTO trainers (user_id, organization_id, invite_code, specialization, experience_years, certifications, bio) VALUES (?,?,?,?,?,?,?)',
        [r.insertId, b.organization_id, await generateInviteCode(b.name, conn), b.specialization ?? null, b.experience_years ?? null, b.certifications ?? null, b.bio ?? null]);
    }
    return r.insertId;
  });
  await audit(req, 'create', 'user', id, `Created ${b.role.replace('_', ' ')} ${b.email}`);
  res.status(201).json({ success: true, data: await findUser(id) });
});

export const update = asyncHandler(async (req, res) => {
  const existing = await findUser(req.params.id);
  assertManageable(req, existing);
  const b = { ...req.body };
  if (isOrgAdmin(req)) b.organization_id = req.user.organizationId;
  await transaction(async (conn) => {
    const fields = { name: b.name, email: b.email, phone: b.phone ?? null, status: b.status };
    if (existing.role !== 'super_admin' && b.organization_id) fields.organization_id = b.organization_id;
    if (b.password) fields.password_hash = await hashPassword(b.password);
    if (existing.id === req.user.id && b.status === 'inactive') throw ApiError.badRequest('You cannot deactivate your own account');
    await conn.query('UPDATE users SET ? WHERE id = ?', [fields, existing.id]);
    if (existing.role !== 'super_admin') {
      if (!existing.trainer_id) await conn.query('INSERT INTO trainers (user_id, organization_id, invite_code) VALUES (?, ?, ?)', [existing.id, fields.organization_id ?? existing.organization_id, await generateInviteCode(existing.name, conn)]);
      await conn.query('UPDATE trainers SET organization_id = ?, specialization = ?, experience_years = ?, certifications = ?, bio = ? WHERE user_id = ?',
        [fields.organization_id ?? existing.organization_id, b.specialization ?? null, b.experience_years ?? null, b.certifications ?? null, b.bio ?? null, existing.id]);
    }
  });
  await audit(req, 'update', 'user', existing.id, `Updated user ${b.email}`);
  res.json({ success: true, data: await findUser(existing.id) });
});

export const setStatus = asyncHandler(async (req, res) => {
  const existing = await findUser(req.params.id);
  assertManageable(req, existing);
  if (existing.id === req.user.id) throw ApiError.badRequest('You cannot change your own status');
  await query('UPDATE users SET status = ? WHERE id = ?', [req.body.status, existing.id]);
  await audit(req, req.body.status === 'active' ? 'activate' : 'deactivate', 'user', existing.id, `${req.body.status === 'active' ? 'Activated' : 'Deactivated'} ${existing.email}`);
  res.json({ success: true, data: await findUser(existing.id) });
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await findUser(req.params.id);
  assertManageable(req, existing);
  if (existing.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');
  await transaction(async (conn) => {
    // free the email for reuse and soft delete
    await conn.query("UPDATE users SET deleted_at = NOW(), status = 'inactive', email = CONCAT('deleted+', id, '+', email) WHERE id = ?", [existing.id]);
    await conn.query('UPDATE trainers SET deleted_at = NOW() WHERE user_id = ?', [existing.id]);
    await conn.query('UPDATE clients SET trainer_id = NULL WHERE trainer_id = ?', [existing.trainer_id ?? 0]);
  });
  await audit(req, 'delete', 'user', existing.id, `Deleted user ${existing.email}`);
  res.json({ success: true });
});
