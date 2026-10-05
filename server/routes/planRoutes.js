import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/planValidators.js';
import workout from '../controllers/workoutController.js';
import diet from '../controllers/dietController.js';

const id = validate({ params: idParam });
const statusBody = validate({ body: z.object({ status: z.string() }) });

function planRouter(c, { view, manage, schema }) {
  const r = Router();
  r.get('/', requirePermission(view), c.listPlans);
  r.post('/', requirePermission(manage), validate({ body: schema }), c.createPlan);
  r.post('/from-template', requirePermission(manage), validate({ body: v.fromTemplateSchema }), c.fromTemplate);
  r.get('/:id', requirePermission(view), id, c.getPlan);
  r.put('/:id', requirePermission(manage), id, validate({ body: schema }), c.updatePlan);
  r.patch('/:id/status', requirePermission(manage), id, statusBody, c.setPlanStatus);
  r.delete('/:id', requirePermission(manage), id, c.deletePlan);
  r.post('/:id/duplicate', requirePermission(manage), id, validate({ body: v.duplicateSchema }), c.duplicatePlan);
  r.post('/:id/save-as-template', requirePermission('templates.manage'), id, validate({ body: v.saveAsTemplateSchema }), c.saveAsTemplate);
  return r;
}

function templateRouter(c, schema) {
  const r = Router();
  r.get('/', requirePermission('templates.view'), c.listTemplates);
  r.post('/', requirePermission('templates.manage'), validate({ body: schema }), c.createTemplate);
  r.get('/:id', requirePermission('templates.view'), id, c.getTemplate);
  r.put('/:id', requirePermission('templates.manage'), id, validate({ body: schema }), c.updateTemplate);
  r.delete('/:id', requirePermission('templates.manage'), id, c.deleteTemplate);
  r.post('/:id/duplicate', requirePermission('templates.manage'), id, c.duplicateTemplate);
  return r;
}

export const workoutRoutes = planRouter(workout, { view: 'workouts.view', manage: 'workouts.manage', schema: v.workoutPlanSchema });
export const workoutTemplateRoutes = templateRouter(workout, v.workoutTemplateSchema);
export const dietRoutes = planRouter(diet, { view: 'diets.view', manage: 'diets.manage', schema: v.dietPlanSchema });
export const dietTemplateRoutes = templateRouter(diet, v.dietTemplateSchema);
