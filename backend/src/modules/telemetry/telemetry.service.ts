import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { IngestReadingInput, CreateCommandInput, AckCommandInput } from './telemetry.schema';

// ── Offline threshold (seconds) ──────────────────────────────────────────
const DEVICE_OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds

export class TelemetryService {
  /**
   * Ingest a sensor reading from an ESP32 SENDER device.
   * deviceId and zoneId come from the authenticated device context.
   */
  async ingestReading(
    deviceDbId: string,
    zoneId: string,
    data: IngestReadingInput
  ) {
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId: deviceDbId,
        zoneId,
        moisture: data.moisture ?? null,
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        battery: data.battery ?? null,
      },
    });

    return reading;
  }

  /**
   * Get latest reading for a zone (most recent from any device in the zone).
   */
  async getLatestByZone(zoneId: string) {
    return prisma.sensorReading.findFirst({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      include: {
        device: {
          select: { deviceId: true, type: true, role: true, status: true },
        },
      },
    });
  }

  /**
   * Get latest reading for a specific device.
   */
  async getLatestByDevice(deviceDbId: string) {
    return prisma.sensorReading.findFirst({
      where: { deviceId: deviceDbId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get historical readings for a zone with pagination.
   */
  async getHistory(
    zoneId: string,
    page: number,
    pageSize: number,
    from?: string,
    to?: string
  ) {
    const where: any = { zoneId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [readings, total] = await Promise.all([
      prisma.sensorReading.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          device: {
            select: { deviceId: true, type: true },
          },
        },
      }),
      prisma.sensorReading.count({ where }),
    ]);

    return {
      readings,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ── Device Commands ──────────────────────────────────────────────────

  /**
   * Create a command for a RECEIVER device (user-initiated).
   * Verifies device belongs to user's farm.
   */
  async createCommand(userId: string, input: CreateCommandInput) {
    // Verify ownership: user → farm → zone → device
    const device = await prisma.device.findFirst({
      where: {
        id: input.deviceId,
        zone: { farm: { userId } },
      },
    });

    if (!device) throw new Error('Device not found or access denied');
    if (device.role !== 'RECEIVER') {
      throw new Error('Commands can only be sent to RECEIVER devices');
    }

    return prisma.deviceCommandRecord.create({
      data: {
        deviceId: input.deviceId,
        command: input.command,
        payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get pending commands for a RECEIVER device (ESP32 polls this).
   * Returns oldest PENDING command first (FIFO queue).
   */
  async getPendingCommands(deviceDbId: string) {
    return prisma.deviceCommandRecord.findMany({
      where: {
        deviceId: deviceDbId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: 10, // Max 10 commands per poll
    });
  }

  /**
   * Acknowledge command execution (receiver ESP32 reports back).
   */
  async ackCommand(deviceDbId: string, input: AckCommandInput) {
    const command = await prisma.deviceCommandRecord.findFirst({
      where: {
        id: input.commandId,
        deviceId: deviceDbId,
        status: 'PENDING',
      },
    });

    if (!command) throw new Error('Command not found or already processed');

    return prisma.deviceCommandRecord.update({
      where: { id: input.commandId },
      data: {
        status: input.status,
        executedAt: new Date(),
      },
    });
  }

  // ── Dashboard Aggregation ──────────────────────────────────────────────

  /**
   * Get aggregated dashboard metrics for a user's farm network.
   */
  async getDashboard(userId: string) {
    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - DEVICE_OFFLINE_THRESHOLD_MS);

    // Count farms, zones, devices in a single pass
    const [farmCount, zoneCount, devices] = await Promise.all([
      prisma.farm.count({ where: { userId } }),
      prisma.zone.count({ where: { farm: { userId } } }),
      prisma.device.findMany({
        where: { zone: { farm: { userId } } },
        select: { id: true, lastSeen: true, status: true },
      }),
    ]);

    // Compute online/offline
    let onlineDevices = 0;
    let offlineDevices = 0;
    const offlineDeviceIds: string[] = [];

    for (const d of devices) {
      if (d.lastSeen && d.lastSeen > offlineThreshold) {
        onlineDevices++;
      } else {
        offlineDevices++;
        offlineDeviceIds.push(d.id);
      }
    }

    // Batch-mark offline devices
    if (offlineDeviceIds.length > 0) {
      await prisma.device.updateMany({
        where: { id: { in: offlineDeviceIds }, status: { not: 'OFFLINE' } },
        data: { status: 'OFFLINE' },
      });
    }

    // Average moisture from latest readings per zone
    const userZones = await prisma.zone.findMany({
      where: { farm: { userId } },
      select: { id: true },
    });

    let totalMoisture = 0;
    let moistureCount = 0;

    for (const zone of userZones) {
      const latestReading = await prisma.sensorReading.findFirst({
        where: { zoneId: zone.id },
        orderBy: { createdAt: 'desc' },
        select: { moisture: true },
      });

      if (latestReading?.moisture !== null && latestReading?.moisture !== undefined) {
        totalMoisture += latestReading.moisture;
        moistureCount++;
      }
    }

    const averageMoisture = moistureCount > 0 ? Math.round(totalMoisture / moistureCount) : null;

    return {
      totalFarms: farmCount,
      totalZones: zoneCount,
      totalDevices: devices.length,
      onlineDevices,
      offlineDevices,
      averageMoisture,
    };
  }
}

export const telemetryService = new TelemetryService();
