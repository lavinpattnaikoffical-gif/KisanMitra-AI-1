import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Must be first — validates all env vars before anything else
import { env } from './config/env';
import prisma from './config/prisma';
import { createApp } from './app';
import { setupTelemetrySocket, startOfflineChecker } from './modules/telemetry/telemetry.socket';

async function bootstrap() {
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected (Neon PostgreSQL)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // ── Socket.IO Setup ───────────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Make io available to route handlers via app.locals
  app.locals.io = io;

  // Default namespace — basic connection logging
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // /telemetry namespace — zone subscriptions and real-time events
  setupTelemetrySocket(io);

  // Periodic offline checker (marks stale devices, emits events)
  const offlineTimer = startOfflineChecker(io, 30_000);

  // ── Start Server ──────────────────────────────────────────────
  httpServer.listen(env.PORT, '0.0.0.0', () => {
    console.log(`
🌱 ──────────────────────────────────────────
   KisanMitra AI Backend — Sprint 2
   Port:        ${env.PORT}
   Environment: ${env.NODE_ENV}
   Health:      http://localhost:${env.PORT}/health
   Dashboard:   http://localhost:${env.PORT}/api/dashboard
   Socket.IO:   ws://localhost:${env.PORT}/telemetry
   OTP Bypass:  ${env.OTP_BYPASS_MODE ? '✅ ENABLED (dev)' : '❌ DISABLED (SMS active)'}
🌱 ──────────────────────────────────────────
    `);
  });

  // ── Graceful Shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);
    clearInterval(offlineTimer);
    await prisma.$disconnect();
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
  });
}

bootstrap();

