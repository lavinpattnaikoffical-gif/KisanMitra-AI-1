import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { requestLogger } from './middleware/logger.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// Route modules
import authRoutes from './modules/auth/auth.routes';
import farmsRoutes from './modules/farms/farms.routes';
import zonesRoutes from './modules/zones/zones.routes';
import devicesRoutes from './modules/devices/devices.routes';
import telemetryRoutes from './modules/telemetry/telemetry.routes';
import weatherRoutes from './modules/weather/weather.routes';
import intelligenceRoutes from './modules/intelligence/intelligence.routes';
import aiRoutes from './modules/ai/ai.routes';
import { zonesController } from './modules/zones/zones.controller';
import { updateZoneSchema } from './modules/zones/zones.schema';
import { telemetryController } from './modules/telemetry/telemetry.controller';
import { deviceAuthMiddleware } from './middleware/device.middleware';
import { validate } from './middleware/validate.middleware';
import { ackCommandSchema } from './modules/telemetry/telemetry.schema';

export function createApp(): Application {
  const app = express();

  // Trust Nginx reverse proxy (required for express-rate-limit behind proxy)
  app.set('trust proxy', 1);

  // ── Security ─────────────────────────────────────────────────
  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-device-id',
        'x-device-secret',
      ],
    })
  );

  // ── Rate Limiting ─────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — please try again later' },
  });

  // Stricter limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { success: false, message: 'Too many auth attempts — please wait 15 minutes' },
  });

  app.use(limiter);

  // ── Body Parsing ──────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' })); // 10mb for base64 images (Sprint 3)
  app.use(express.urlencoded({ extended: true }));
  app.use(compression() as express.RequestHandler);

  // ── Logging ───────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Health Check ──────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'KisanMitra AI Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ── API Routes ────────────────────────────────────────────────
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/farms', farmsRoutes);
  app.use('/api/farms/:farmId/zones', zonesRoutes);
  app.use('/api/devices', devicesRoutes);

  // Standalone zone endpoints (GET/PUT/DELETE by zone ID directly)
  const zonesStandaloneRouter = Router();
  zonesStandaloneRouter.use(authMiddleware);
  zonesStandaloneRouter.get('/:id/overview', zonesController.getOverview.bind(zonesController));
  zonesStandaloneRouter.get('/:id', zonesController.get.bind(zonesController));
  zonesStandaloneRouter.put('/:id', validate(updateZoneSchema), zonesController.update.bind(zonesController));
  zonesStandaloneRouter.delete('/:id', zonesController.remove.bind(zonesController));
  app.use('/api/zones', zonesStandaloneRouter);

  // ── Sprint 3: Weather, Intelligence & AI ──────────────────────
  app.use('/api/weather', weatherRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/ai', aiRoutes);

  // ── Sprint 2: Telemetry & Device Runtime ──────────────────────
  app.use('/api/telemetry', telemetryRoutes);

  // ESP32 receiver endpoints (device auth)
  const deviceRuntimeRouter = Router();
  deviceRuntimeRouter.use(deviceAuthMiddleware);
  deviceRuntimeRouter.get('/commands', telemetryController.getCommands.bind(telemetryController));
  deviceRuntimeRouter.post('/ack', validate(ackCommandSchema), telemetryController.ackCommand.bind(telemetryController));
  app.use('/api/device', deviceRuntimeRouter);

  // Dashboard (JWT auth)
  app.get('/api/dashboard', authMiddleware, telemetryController.getDashboard.bind(telemetryController));

  // ── 404 & Error Handling ──────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
