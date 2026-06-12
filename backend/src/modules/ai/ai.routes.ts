import { Router } from 'express';
import { aiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { chatSchema } from './ai.schema';

const router = Router();

router.use(authMiddleware);

router.post('/recommendation/:zoneId', aiController.getRecommendation.bind(aiController));
router.post('/chat', validate(chatSchema), aiController.chat.bind(aiController));

export default router;
