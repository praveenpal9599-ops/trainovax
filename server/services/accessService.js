import { queryOne } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/permissions.js';

/**
 * Data scoping rules
 *  - super_admin: everything
 *  - admin: every client in their organization
 *  - trainer: only clients assigned to their trainer profile
 *  - client: only their own client record
 * Returns an SQL fragment + params that restrict a query on the `clients` alias.
 */
export function clientScope(user, alias = 'c') {
  if (user.role === ROLES.SUPER_ADMIN) return { sql: '1=1', params: [] };
  if (user.role === ROLES.ADMIN) return { sql: `${alias}.organization_id = ?`, params: [user.organizationId ?? 0] };
  if (user.role === ROLES.TRAINER) return { sql: `${alias}.trainer_id = ?`, params: [user.trainerId ?? 0] };
  return { sql: `${alias}.id = ?`, params: [user.clientId ?? 0] };
}

/** Load a client and ensure the current user may access it. */
export async function assertClientAccess(user, clientId) {
  const client = await queryOne('SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL', [clientId]);
  if (!client) throw ApiError.notFound('Client not found');
  const ok = user.role === ROLES.SUPER_ADMIN
    || (user.role === ROLES.ADMIN && client.organization_id === user.organizationId)
    || (user.role === ROLES.TRAINER && client.trainer_id === user.trainerId)
    || (user.role === ROLES.CLIENT && client.id === user.clientId);
  if (!ok) throw ApiError.forbidden('You do not have access to this client');
  return client;
}

/** Resolve which client id a request refers to — clients are always forced to their own id. */
export function resolveClientId(user, requested) {
  if (user.role === ROLES.CLIENT) return user.clientId;
  return Number(requested);
}

/** Trainer to record on plans/attendance: the trainer themself, otherwise the client's assigned trainer. */
export function staffTrainerId(user, client) {
  if (user.role === ROLES.TRAINER) return user.trainerId;
  return client.trainer_id ?? user.trainerId ?? null;
}

/** Templates: global (organization_id NULL) are visible to all; org templates to that org. */
export function templateScope(user, alias) {
  if (user.role === ROLES.SUPER_ADMIN) return { sql: '1=1', params: [] };
  return { sql: `(${alias}.organization_id IS NULL OR ${alias}.organization_id = ?)`, params: [user.organizationId ?? 0] };
}

export function canEditTemplate(user, tpl) {
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return tpl.organization_id !== null && tpl.organization_id === user.organizationId;
}

/** Master data: super admin edits everything, trainers only what they created. */
export function canEditMaster(user, row) {
  return user.role === ROLES.SUPER_ADMIN || (row.created_by && row.created_by === user.id);
}
