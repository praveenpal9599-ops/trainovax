/**
 * Builds controllers for a nested plan type (workout or diet) and its templates,
 * so both builders share identical, well-tested behaviour.
 */
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { query, queryOne, transaction } from '../config/db.js';
import { parseListQuery, paged, Where } from '../utils/pagination.js';
import * as plan from '../services/planService.js';
import { assertClientAccess, clientScope, templateScope, canEditTemplate, staffTrainerId } from '../services/accessService.js';
import { audit } from '../services/auditService.js';
import { notifyClient } from '../services/notificationService.js';
import { ROLES } from '../config/permissions.js';

export function makePlanControllers({ P, T, label, entity, listExtraSelect, templateExtraSelect, link }) {
  const noun = label.toLowerCase();

  async function loadPlanWithAccess(user, id) {
    const p = await plan.mustLoad(P, id, label);
    await assertClientAccess(user, p.client_id);
    return p;
  }

  async function archiveOtherActive(conn, clientId, keepId) {
    await conn.query(`UPDATE ${P.root} SET status = 'completed' WHERE client_id = ? AND status = 'active' AND id <> ? AND deleted_at IS NULL`, [clientId, keepId]);
  }

  /* ----------------------------- Plans ----------------------------- */
  const listPlans = asyncHandler(async (req, res) => {
    const opts = parseListQuery(req.query, {
      sortable: { name: 'p.name', client: 'c.full_name', status: 'p.status', start: 'p.start_date', created: 'p.created_at', updated: 'p.updated_at' },
      defaultSort: 'updated',
    });
    const scope = clientScope(req.user);
    const w = new Where().add('p.deleted_at IS NULL').add('c.deleted_at IS NULL').add(scope.sql, ...scope.params);
    w.search(opts.search, ['p.name', 'c.full_name']);
    w.addIf(req.query.clientId, 'p.client_id = ?', req.query.clientId);
    w.addIf(req.query.status, 'p.status = ?', req.query.status);
    const from = `FROM ${P.root} p JOIN clients c ON c.id = p.client_id LEFT JOIN trainers t ON t.id = p.trainer_id LEFT JOIN users tu ON tu.id = t.user_id`;
    const { total } = await queryOne(`SELECT COUNT(*) total ${from} ${w.sql}`, w.params);
    const rows = await query(`SELECT p.*, c.full_name AS client_name, c.photo_url AS client_photo, tu.name AS trainer_name, ${listExtraSelect}
      ${from} ${w.sql} ORDER BY ${opts.sortCol} ${opts.sortDir}, p.id DESC LIMIT ${opts.pageSize} OFFSET ${opts.offset}`, w.params);
    res.json({ success: true, ...paged(rows, total, opts) });
  });

  const getPlan = asyncHandler(async (req, res) => {
    const p = await loadPlanWithAccess(req.user, req.params.id);
    p.client = await queryOne('SELECT id, full_name, photo_url, fitness_goal, current_weight_kg, height_cm FROM clients WHERE id = ?', [p.client_id]);
    res.json({ success: true, data: p });
  });

  const createPlan = asyncHandler(async (req, res) => {
    const client = await assertClientAccess(req.user, req.body.client_id);
    const data = { ...req.body, trainer_id: staffTrainerId(req.user, client) };
    const id = await transaction(async (conn) => {
      const newId = await plan.createNested(P, data, conn);
      if (data.status === 'active') await archiveOtherActive(conn, client.id, newId);
      await notifyClient(client.id, { type: entity, title: `Your trainer added a new ${noun}`, body: `"${data.name}" is now available.`, link }, conn);
      return newId;
    });
    await audit(req, 'create', entity, id, `Assigned ${noun} "${data.name}" to ${client.full_name}`);
    res.status(201).json({ success: true, data: await plan.loadNested(P, id) });
  });

  const updatePlan = asyncHandler(async (req, res) => {
    const existing = await loadPlanWithAccess(req.user, req.params.id);
    if (req.body.client_id !== existing.client_id) await assertClientAccess(req.user, req.body.client_id);
    await plan.updateNested(P, existing.id, req.body);
    if (req.body.status === 'active') await transaction((conn) => archiveOtherActive(conn, req.body.client_id, existing.id));
    await notifyClient(req.body.client_id, { type: entity, title: `Your ${noun} has been updated`, body: `Your trainer updated "${req.body.name}".`, link });
    await audit(req, 'update', entity, existing.id, `Updated ${noun} "${req.body.name}"`);
    res.json({ success: true, data: await plan.loadNested(P, existing.id) });
  });

  const setPlanStatus = asyncHandler(async (req, res) => {
    const existing = await loadPlanWithAccess(req.user, req.params.id);
    const status = req.body.status;
    if (!['draft', 'active', 'completed', 'archived'].includes(status)) throw ApiError.badRequest('Invalid status');
    await transaction(async (conn) => {
      await conn.query(`UPDATE ${P.root} SET status = ? WHERE id = ?`, [status, existing.id]);
      if (status === 'active') await archiveOtherActive(conn, existing.client_id, existing.id);
    });
    await audit(req, 'status', entity, existing.id, `Set ${noun} "${existing.name}" to ${status}`);
    res.json({ success: true });
  });

  const deletePlan = asyncHandler(async (req, res) => {
    const existing = await loadPlanWithAccess(req.user, req.params.id);
    await plan.softDelete(P, existing.id);
    await audit(req, 'delete', entity, existing.id, `Deleted ${noun} "${existing.name}"`);
    res.json({ success: true });
  });

  const duplicatePlan = asyncHandler(async (req, res) => {
    const existing = await loadPlanWithAccess(req.user, req.params.id);
    const clientId = req.body.client_id || existing.client_id;
    const client = await assertClientAccess(req.user, clientId);
    const payload = plan.toPayload(P, existing, {
      client_id: clientId, name: req.body.name || `${existing.name} (Copy)`, status: 'draft',
      trainer_id: staffTrainerId(req.user, client),
    });
    const id = await plan.createNested(P, payload);
    await audit(req, 'duplicate', entity, id, `Duplicated ${noun} "${existing.name}"`);
    res.status(201).json({ success: true, data: await plan.loadNested(P, id) });
  });

  const saveAsTemplate = asyncHandler(async (req, res) => {
    const existing = await loadPlanWithAccess(req.user, req.params.id);
    const payload = plan.toPayload(T, existing, {
      name: req.body.name, status: 'active', created_by: req.user.id,
      organization_id: req.user.role === ROLES.SUPER_ADMIN ? null : req.user.organizationId,
    });
    const id = await plan.createNested(T, payload);
    await audit(req, 'create', `${entity}_template`, id, `Saved "${existing.name}" as template "${req.body.name}"`);
    res.status(201).json({ success: true, data: await plan.loadNested(T, id) });
  });

  const fromTemplate = asyncHandler(async (req, res) => {
    const tpl = await plan.mustLoad(T, req.body.template_id, 'Template');
    const scope = templateScope(req.user, 't');
    const visible = await queryOne(`SELECT id FROM ${T.root} t WHERE t.id = ? AND ${scope.sql}`, [tpl.id, ...scope.params]);
    if (!visible) throw ApiError.forbidden();
    const client = await assertClientAccess(req.user, req.body.client_id);
    const payload = plan.toPayload(P, tpl, {
      client_id: client.id, template_id: tpl.id, name: req.body.name || tpl.name, status: 'active', start_date: req.body.start_date || null,
      trainer_id: staffTrainerId(req.user, client),
    });
    const id = await transaction(async (conn) => {
      const newId = await plan.createNested(P, payload, conn);
      await archiveOtherActive(conn, client.id, newId);
      await notifyClient(client.id, { type: entity, title: `Your trainer added a new ${noun}`, body: `"${payload.name}" is now available.`, link }, conn);
      return newId;
    });
    await audit(req, 'create', entity, id, `Assigned template "${tpl.name}" to ${client.full_name}`);
    res.status(201).json({ success: true, data: await plan.loadNested(P, id) });
  });

  /* --------------------------- Templates --------------------------- */
  async function loadTemplateWithAccess(user, id, { edit = false } = {}) {
    const tpl = await plan.mustLoad(T, id, 'Template');
    const scope = templateScope(user, 't');
    const visible = await queryOne(`SELECT id FROM ${T.root} t WHERE t.id = ? AND ${scope.sql}`, [id, ...scope.params]);
    if (!visible) throw ApiError.notFound('Template not found');
    if (edit && !canEditTemplate(user, tpl)) throw ApiError.forbidden('Global templates can only be edited by a Super Admin');
    return tpl;
  }

  const listTemplates = asyncHandler(async (req, res) => {
    const opts = parseListQuery(req.query, { sortable: { name: 't.name', goal: 't.goal', status: 't.status', created: 't.created_at', updated: 't.updated_at' }, defaultSort: 'name', defaultDir: 'asc' });
    const scope = templateScope(req.user, 't');
    const w = new Where().add('t.deleted_at IS NULL').add(scope.sql, ...scope.params);
    w.search(opts.search, ['t.name', 't.description']);
    w.addIf(req.query.goal, 't.goal = ?', req.query.goal);
    w.addIf(req.query.status, 't.status = ?', req.query.status);
    if (req.user.role !== ROLES.SUPER_ADMIN && !req.query.status) w.add("t.status = 'active'");
    const { total } = await queryOne(`SELECT COUNT(*) total FROM ${T.root} t ${w.sql}`, w.params);
    const rows = await query(`SELECT t.*, o.name AS organization_name, u.name AS created_by_name, ${templateExtraSelect},
        (SELECT COUNT(*) FROM ${P.root} p WHERE p.template_id = t.id AND p.deleted_at IS NULL) AS times_assigned
      FROM ${T.root} t LEFT JOIN organizations o ON o.id = t.organization_id LEFT JOIN users u ON u.id = t.created_by
      ${w.sql} ORDER BY ${opts.sortCol} ${opts.sortDir} ${opts.all ? '' : `LIMIT ${opts.pageSize} OFFSET ${opts.offset}`}`, w.params);
    res.json({ success: true, ...paged(rows, total, opts.all ? { page: 1, pageSize: Math.max(total, 1) } : opts) });
  });

  const getTemplate = asyncHandler(async (req, res) => {
    const tpl = await loadTemplateWithAccess(req.user, req.params.id);
    tpl.can_edit = canEditTemplate(req.user, tpl);
    res.json({ success: true, data: tpl });
  });

  const createTemplate = asyncHandler(async (req, res) => {
    const data = { ...req.body, created_by: req.user.id, organization_id: req.user.role === ROLES.SUPER_ADMIN ? null : req.user.organizationId };
    const id = await plan.createNested(T, data);
    await audit(req, 'create', `${entity}_template`, id, `Created template "${data.name}"`);
    res.status(201).json({ success: true, data: await plan.loadNested(T, id) });
  });

  const updateTemplate = asyncHandler(async (req, res) => {
    const tpl = await loadTemplateWithAccess(req.user, req.params.id, { edit: true });
    const { organization_id, created_by, ...rest } = req.body; // eslint-disable-line no-unused-vars
    await plan.updateNested(T, tpl.id, rest);
    await audit(req, 'update', `${entity}_template`, tpl.id, `Updated template "${req.body.name}"`);
    res.json({ success: true, data: await plan.loadNested(T, tpl.id) });
  });

  const deleteTemplate = asyncHandler(async (req, res) => {
    const tpl = await loadTemplateWithAccess(req.user, req.params.id, { edit: true });
    await plan.softDelete(T, tpl.id);
    await audit(req, 'delete', `${entity}_template`, tpl.id, `Deleted template "${tpl.name}"`);
    res.json({ success: true });
  });

  const duplicateTemplate = asyncHandler(async (req, res) => {
    const tpl = await loadTemplateWithAccess(req.user, req.params.id);
    const payload = plan.toPayload(T, tpl, {
      name: req.body?.name || `${tpl.name} (Copy)`, created_by: req.user.id,
      organization_id: req.user.role === ROLES.SUPER_ADMIN ? null : req.user.organizationId,
    });
    const id = await plan.createNested(T, payload);
    await audit(req, 'duplicate', `${entity}_template`, id, `Duplicated template "${tpl.name}"`);
    res.status(201).json({ success: true, data: await plan.loadNested(T, id) });
  });

  return {
    listPlans, getPlan, createPlan, updatePlan, setPlanStatus, deletePlan, duplicatePlan, saveAsTemplate, fromTemplate,
    listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
  };
}
