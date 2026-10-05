/**
 * Generic controller builder for master-data resources (exercises, foods, organizations, plans…)
 */
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { audit } from '../services/auditService.js';
import { canEditMaster } from '../services/accessService.js';
import { ROLES } from '../config/permissions.js';

export function crudController(model, { entity, label = (r) => r.name, ownership = false, beforeCreate, onlyActiveForNonAdmin = false } = {}) {
  const guard = (req, row) => {
    if (ownership && !canEditMaster(req.user, row)) throw ApiError.forbidden('Only the creator or a Super Admin can modify this record');
  };
  return {
    list: asyncHandler(async (req, res) => {
      const q = { ...req.query };
      if (onlyActiveForNonAdmin && req.user.role !== ROLES.SUPER_ADMIN && !q.status) q.status = 'active';
      res.json({ success: true, ...(await model.list(q)) });
    }),
    get: asyncHandler(async (req, res) => {
      const row = await model.findById(req.params.id);
      if (!row) throw ApiError.notFound(`${entity} not found`);
      res.json({ success: true, data: row });
    }),
    create: asyncHandler(async (req, res) => {
      const data = { ...req.body };
      if (ownership) data.created_by = req.user.id;
      if (beforeCreate) Object.assign(data, await beforeCreate(req, data));
      const id = await model.create(data);
      const row = await model.findById(id);
      await audit(req, 'create', entity, id, `Created ${entity} "${label(row)}"`);
      res.status(201).json({ success: true, data: row });
    }),
    update: asyncHandler(async (req, res) => {
      const existing = await model.findById(req.params.id);
      if (!existing) throw ApiError.notFound(`${entity} not found`);
      guard(req, existing);
      await model.update(req.params.id, req.body);
      const row = await model.findById(req.params.id);
      await audit(req, 'update', entity, row.id, `Updated ${entity} "${label(row)}"`);
      res.json({ success: true, data: row });
    }),
    setStatus: asyncHandler(async (req, res) => {
      const existing = await model.findById(req.params.id);
      if (!existing) throw ApiError.notFound(`${entity} not found`);
      guard(req, existing);
      await model.update(req.params.id, { status: req.body.status });
      await audit(req, req.body.status === 'active' ? 'activate' : 'deactivate', entity, existing.id, `${req.body.status === 'active' ? 'Activated' : 'Deactivated'} ${entity} "${label(existing)}"`);
      res.json({ success: true, data: await model.findById(req.params.id) });
    }),
    remove: asyncHandler(async (req, res) => {
      const existing = await model.findById(req.params.id);
      if (!existing) throw ApiError.notFound(`${entity} not found`);
      guard(req, existing);
      await model.remove(req.params.id);
      await audit(req, 'delete', entity, existing.id, `Deleted ${entity} "${label(existing)}"`);
      res.json({ success: true });
    }),
  };
}
