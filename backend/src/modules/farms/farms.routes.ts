import { Router } from 'express';
import { farmsController } from './farms.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createFarmSchema, updateFarmSchema } from './farms.schema';

const router = Router();

// All farm routes require JWT
router.use(authMiddleware);

router.get('/', farmsController.list.bind(farmsController));
router.post('/', validate(createFarmSchema), farmsController.create.bind(farmsController));
router.get('/:id', farmsController.get.bind(farmsController));
router.put('/:id', validate(updateFarmSchema), farmsController.update.bind(farmsController));
router.delete('/:id', farmsController.remove.bind(farmsController));

export default router;
