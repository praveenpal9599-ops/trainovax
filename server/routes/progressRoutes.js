import { Router } from 'express';
import * as c from '../controllers/progressController.js';
import { requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';
import { progressSchema, photoSchema } from '../validators/progressValidators.js';

const r = Router();
const view = requirePermission('progress.view', 'self.progress');
const manage = requirePermission('progress.manage', 'self.progress');

r.post('/', manage, validate({ body: progressSchema }), c.create);
r.post('/photos', manage, uploadImage.single('file'), validate({ body: photoSchema }), c.uploadPhoto);
r.delete('/photos/:id', manage, c.deletePhoto);
r.get('/:clientId/photos', view, c.listPhotos);
r.get('/:clientId', view, c.list);
r.put('/:id', manage, validate({ body: progressSchema }), c.update);
r.delete('/:id', manage, c.remove);
export default r;
