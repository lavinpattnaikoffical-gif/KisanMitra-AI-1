import { Router } from 'express';
import { telemetryController } from './telemetry.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { deviceAuthMiddleware } from '../../middleware/device.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  ingestReadingSchema,
  createCommandSchema,
  ackCommandSchema,
} from './telemetry.schema';

const router = Router();

// ── ESP32 Device Endpoints (device auth: x-device-id + x-device-secret) ──

// Sensor data upload (SENDER devices)
router.post(
  '/ingest',
  deviceAuthMiddleware,
  validate(ingestReadingSchema),
  telemetryController.ingest.bind(telemetryController)
);

// ── User Endpoints (JWT auth) ────────────────────────────────────────────

// Send command to a receiver device
router.post(
  '/command',
  authMiddleware,
  validate(createCommandSchema),
  telemetryController.createCommand.bind(telemetryController)
);

// Latest reading for a zone
router.get(
  '/:zoneId/latest',
  authMiddleware,
  telemetryController.getLatest.bind(telemetryController)
);

// Historical readings for a zone
router.get(
  '/:zoneId/history',
  authMiddleware,
  telemetryController.getHistory.bind(telemetryController)
);

export default router;
