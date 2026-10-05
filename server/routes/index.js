import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadAttachment, uploadImage, fileUrl } from '../middleware/upload.js';
import { idParam, status } from '../validators/common.js';
import * as mv from '../validators/masterValidators.js';
import * as uv from '../validators/userValidators.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

import authRoutes from './authRoutes.js';
import clientRoutes from './clientRoutes.js';
import progressRoutes from './progressRoutes.js';
import portalRoutes from './portalRoutes.js';
import { workoutRoutes, workoutTemplateRoutes, dietRoutes, dietTemplateRoutes } from './planRoutes.js';

import { crudController } from '../controllers/masterController.js';
import { Exercise, Food, Organization, SubscriptionPlan, Subscription } from '../models/index.js';
import * as users from '../controllers/userController.js';
import * as lookup from '../controllers/lookupController.js';
import * as messages from '../controllers/messageController.js';
import * as notifications from '../controllers/notificationController.js';
import * as tasks from '../controllers/taskController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as reports from '../controllers/reportController.js';
import * as tools from '../controllers/adminToolsController.js';

const api = Router();
const id = validate({ params: idParam });
const statusBody = validate({ body: z.object({ status }) });

/** Mount standard CRUD routes for a master resource. */
function crud(path, ctrl, schema, { view, manage }) {
  const r = Router();
  r.get('/', requirePermission(...[].concat(view)), ctrl.list);
  r.post('/', requirePermission(manage), validate({ body: schema }), ctrl.create);
  r.get('/:id', requirePermission(...[].concat(view)), id, ctrl.get);
  r.put('/:id', requirePermission(manage), id, validate({ body: schema }), ctrl.update);
  r.patch('/:id/status', requirePermission(manage), id, statusBody, ctrl.setStatus);
  r.delete('/:id', requirePermission(manage), id, ctrl.remove);
  api.use(path, r);
}

api.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
api.get('/settings/public', tools.publicSettings);
api.use('/auth', authRoutes);

// ---- everything below requires authentication ----
api.use(authenticate);

api.get('/lookups', lookup.lookups);
api.post('/uploads/image', requirePermission('exercises.manage', 'clients.manage'), uploadImage.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  res.status(201).json({ success: true, data: { url: fileUrl(req.file) } });
}));

// Dashboards
api.get('/dashboard/super-admin', authorize('super_admin'), dashboard.superAdmin);
api.get('/dashboard/admin', authorize('admin', 'trainer', 'super_admin'), dashboard.admin);

// Platform management (Super Admin)
crud('/organizations', crudController(Organization, {
  entity: 'organization',
  beforeCreate: (_req, d) => ({ slug: `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120)}-${Date.now().toString(36)}` }),
}), mv.organizationSchema, { view: 'organizations.manage', manage: 'organizations.manage' });

const u = Router();
u.use(requirePermission('users.manage', 'trainers.manage'));
u.get('/', users.list);
u.post('/', validate({ body: uv.createUserSchema }), users.create);
u.get('/:id', id, users.get);
u.put('/:id', id, validate({ body: uv.updateUserSchema }), users.update);
u.patch('/:id/status', id, statusBody, users.setStatus);
u.delete('/:id', id, users.remove);
api.use('/users', u);

crud('/subscription-plans', crudController(SubscriptionPlan, { entity: 'subscription_plan' }), mv.subscriptionPlanSchema, { view: 'subscriptions.manage', manage: 'subscriptions.manage' });
const subs = crudController(Subscription, { entity: 'subscription', label: (r) => `${r.organization_name} · ${r.plan_name}` });
const s = Router();
s.use(requirePermission('subscriptions.manage'));
s.get('/', subs.list);
s.post('/', validate({ body: mv.subscriptionSchema }), subs.create);
s.get('/:id', id, subs.get);
s.put('/:id', id, validate({ body: mv.subscriptionSchema }), subs.update);
s.delete('/:id', id, subs.remove);
api.use('/subscriptions', s);

// Master data
crud('/exercises', crudController(Exercise, { entity: 'exercise', ownership: true, onlyActiveForNonAdmin: true }), mv.exerciseSchema, { view: 'exercises.view', manage: 'exercises.manage' });
crud('/foods', crudController(Food, { entity: 'food', ownership: true, onlyActiveForNonAdmin: true }), mv.foodSchema, { view: 'foods.view', manage: 'foods.manage' });

// Core trainer workflow
api.use('/clients', clientRoutes);
api.use('/workouts', workoutRoutes);
api.use('/workout-templates', workoutTemplateRoutes);
api.use('/diets', dietRoutes);
api.use('/diet-templates', dietTemplateRoutes);
api.use('/progress', progressRoutes);
api.use('/portal', portalRoutes);

// Tasks
const t = Router();
t.use(authorize('admin', 'trainer', 'super_admin'));
t.get('/', tasks.list);
t.post('/', validate({ body: tasks.taskSchema }), tasks.create);
t.patch('/:id', id, tasks.update);
t.delete('/:id', id, tasks.remove);
api.use('/tasks', t);

// Messaging
const m = Router();
m.use(requirePermission('messages.use'));
m.get('/conversations', messages.conversations);
m.get('/unread-count', messages.unreadCount);
m.get('/', messages.thread);
m.post('/', uploadAttachment.single('attachment'), validate({ body: messages.sendSchema }), messages.send);
api.use('/messages', m);

// Notifications
const n = Router();
n.get('/', notifications.list);
n.patch('/read-all', notifications.markAllRead);
n.patch('/:id/read', id, notifications.markRead);
n.delete('/:id', id, notifications.remove);
n.post('/broadcast', requirePermission('notifications.broadcast'), validate({ body: notifications.broadcastSchema }), notifications.broadcast);
n.get('/broadcasts', requirePermission('notifications.broadcast'), notifications.sentHistory);
n.post('/send', requirePermission('clients.manage'), validate({ body: notifications.sendToClientsSchema }), notifications.sendToClients);
api.use('/notifications', n);

// Reports, settings, audit, backup
api.get('/reports/overview', requirePermission('reports.view'), reports.overview);
api.get('/settings', requirePermission('settings.manage'), tools.getSettings);
api.put('/settings', requirePermission('settings.manage'), validate({ body: tools.settingsSchema }), tools.updateSettings);
api.get('/audit-logs', requirePermission('audit.view'), tools.auditLogs);
api.get('/backup/export', requirePermission('clients.manage'), tools.exportBackup);
api.post('/backup/import', requirePermission('clients.manage'), tools.importBackup);

export default api;
