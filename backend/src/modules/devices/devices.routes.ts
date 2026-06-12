import { Router } from 'express';
import { devicesController } from './devices.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { provisionDeviceSchema, updateDeviceSchema } from './devices.schema';

const router = Router();

router.use(authMiddleware);

// POST /api/devices  — provision new device
router.post('/', validate(provisionDeviceSchema), devicesController.provision.bind(devicesController));

// GET /api/zones/:zoneId/devices — list devices in a zone
// (Mounted separately in app.ts — see zonesRouter)
router.get('/zone/:zoneId', devicesController.listByZone.bind(devicesController));

// GET  /api/devices/:id
router.get('/:id', devicesController.get.bind(devicesController));

// PUT  /api/devices/:id
router.put('/:id', validate(updateDeviceSchema), devicesController.update.bind(devicesController));

// DELETE /api/devices/:id
router.delete('/:id', devicesController.remove.bind(devicesController));

export default router;
