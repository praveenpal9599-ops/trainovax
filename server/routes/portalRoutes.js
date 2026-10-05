import { Router } from 'express';
import * as c from '../controllers/portalController.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();
r.use(authorize('client'));
r.get('/dashboard', c.dashboard);
r.get('/workout', c.workout);
r.get('/diet', c.diet);
r.post('/workout-logs', validate({ body: c.workoutLogSchemaExport }), c.logWorkout);
r.post('/diet-logs', validate({ body: c.dietLogSchema }), c.logDiet);
r.put('/water', validate({ body: c.waterSchema }), c.logWater);
r.get('/profile', c.profile);
r.put('/profile', validate({ body: c.profileSchema }), c.updateProfile);
export default r;
