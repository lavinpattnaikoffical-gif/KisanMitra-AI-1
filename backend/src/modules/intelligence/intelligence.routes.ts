import { Router } from 'express';
import { intelligenceController } from './intelligence.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/evaluate-zone/:zoneId', intelligenceController.evaluateZone.bind(intelligenceController));
router.post('/evaluate-farm/:farmId', intelligenceController.evaluateFarm.bind(intelligenceController));

export default router;
