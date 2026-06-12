import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerOtpSchema,
  updateProfileSchema,
} from './auth.schema';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp.bind(authController));

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp.bind(authController));

// POST /api/auth/register-otp
router.post('/register-otp', validate(registerOtpSchema), authController.registerOtp.bind(authController));

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, authController.getMe.bind(authController));

// PUT /api/auth/me  (protected)
router.put('/me', authMiddleware, validate(updateProfileSchema), authController.updateMe.bind(authController));

export default router;
