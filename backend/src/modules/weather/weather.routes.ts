import { Router } from 'express';
import { weatherController } from './weather.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/farm/:farmId', weatherController.getFarmWeather.bind(weatherController));

export default router;
