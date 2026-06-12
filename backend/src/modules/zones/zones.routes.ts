import { Router } from 'express';
import { zonesController } from './zones.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createZoneSchema, updateZoneSchema } from './zones.schema';

const router = Router({ mergeParams: true }); // mergeParams to access :farmId from parent

router.use(authMiddleware);

// Mounted at /api/farms/:farmId/zones
router.get('/', zonesController.list.bind(zonesController));
router.post('/', validate(createZoneSchema), zonesController.create.bind(zonesController));

export default router;
