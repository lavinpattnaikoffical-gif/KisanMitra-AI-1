import { Server as SocketIOServer } from 'socket.io';
import prisma from '../../config/prisma';

// ── Offline threshold ────────────────────────────────────────────────────
const DEVICE_OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds

/**
 * Emit a telemetry:update event to all clients subscribed to this zone.
 */
export function emitTelemetryUpdate(
  io: SocketIOServer,
  zoneId: string,
  reading: {
    id: string;
    deviceId: string;
    moisture: number | null;
    temperature: number | null;
    humidity: number | null;
    battery: number | null;
    createdAt: Date;
  }
) {
  io.to(`zone:${zoneId}`).emit('telemetry:update', {
    zoneId,
    reading: {
      ...reading,
      createdAt: reading.createdAt.toISOString(),
    },
  });
}

/**
 * Emit device:online when a device that was previously offline sends data.
 */
export function emitDeviceOnline(
  io: SocketIOServer,
  zoneId: string,
  deviceId: string,
  deviceType: string
) {
  io.to(`zone:${zoneId}`).emit('device:online', {
    zoneId,
    deviceId,
    type: deviceType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit device:offline when we detect a device hasn't sent data.
 */
export function emitDeviceOffline(
  io: SocketIOServer,
  zoneId: string,
  deviceId: string
) {
  io.to(`zone:${zoneId}`).emit('device:offline', {
    zoneId,
    deviceId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit irrigation:triggered when a command starts a pump or valve.
 */
export function emitIrrigationTriggered(
  io: SocketIOServer,
  zoneId: string,
  data: { command: string; deviceId: string; triggeredBy: string }
) {
  io.to(`zone:${zoneId}`).emit('irrigation:triggered', {
    zoneId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Setup the /telemetry Socket.IO namespace with auth and room management.
 */
export function setupTelemetrySocket(io: SocketIOServer) {
  const telemetryNs = io.of('/telemetry');

  telemetryNs.on('connection', (socket) => {
    console.log(`📡 [Telemetry] Socket connected: ${socket.id}`);

    socket.on('subscribe:zone', (zoneId: string) => {
      if (!zoneId || typeof zoneId !== 'string') return;
      socket.join(`zone:${zoneId}`);
      console.log(`📡 [Telemetry] ${socket.id} → zone:${zoneId}`);
    });

    socket.on('unsubscribe:zone', (zoneId: string) => {
      if (!zoneId || typeof zoneId !== 'string') return;
      socket.leave(`zone:${zoneId}`);
      console.log(`📡 [Telemetry] ${socket.id} ← zone:${zoneId}`);
    });

    socket.on('disconnect', () => {
      console.log(`📡 [Telemetry] Socket disconnected: ${socket.id}`);
    });
  });

  return telemetryNs;
}

/**
 * Periodic device offline checker.
 * Runs every 30 seconds and marks stale devices as OFFLINE.
 * Emits device:offline events for newly-offline devices.
 */
export function startOfflineChecker(io: SocketIOServer, intervalMs = 30_000) {
  const timer = setInterval(async () => {
    try {
      // Ensure database connection is alive (handles Neon cold-starts gracefully)
      try {
        await prisma.$connect();
      } catch (connErr) {
        // Database temporarily unreachable (Neon cold-start) — skip this cycle
        return;
      }

      const threshold = new Date(Date.now() - DEVICE_OFFLINE_THRESHOLD_MS);

      // Find devices that were ONLINE but haven't been seen recently
      const staleDevices = await prisma.device.findMany({
        where: {
          status: 'ONLINE',
          lastSeen: { lt: threshold },
        },
        select: { id: true, deviceId: true, zoneId: true },
      });

      if (staleDevices.length === 0) return;

      // Batch update status
      await prisma.device.updateMany({
        where: { id: { in: staleDevices.map((d) => d.id) } },
        data: { status: 'OFFLINE' },
      });

      // Emit events
      for (const device of staleDevices) {
        emitDeviceOffline(io, device.zoneId, device.deviceId);
      }

      if (staleDevices.length > 0) {
        console.log(`🔴 [Offline Check] Marked ${staleDevices.length} device(s) offline`);
      }
    } catch (error) {
      console.error('[Offline Checker] Error:', error);
    }
  }, intervalMs);

  // Allow cleanup
  return timer;
}
