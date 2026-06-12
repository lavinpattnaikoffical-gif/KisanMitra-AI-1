import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/prisma';
import { hashSecret } from '../../utils/hash';
import { ProvisionDeviceInput, UpdateDeviceInput } from './devices.schema';
import { DeviceProvisionResult } from '../../types';

/**
 * Generates a human-readable device ID like "KM-A1B2C3"
 */
function generateDeviceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit ambiguous chars (0,O,1,I)
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KM-${suffix}`;
}

/**
 * Generates a cryptographically random device secret (shown once at provisioning)
 */
function generateDeviceSecret(): string {
  return uuidv4().replace(/-/g, '').slice(0, 32); // 32-char hex string
}

export class DevicesService {
  /** Verify zone ownership chain: user → farm → zone */
  private async assertZoneOwnership(zoneId: string, userId: string): Promise<void> {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, farm: { userId } },
    });
    if (!zone) throw new Error('Zone not found or access denied');
  }

  /** Verify device belongs to a zone in a farm owned by user */
  private async assertDeviceOwnership(deviceDbId: string, userId: string): Promise<void> {
    const device = await prisma.device.findFirst({
      where: { id: deviceDbId, zone: { farm: { userId } } },
    });
    if (!device) throw new Error('Device not found or access denied');
  }

  /**
   * Provision a new device.
   * Returns the plain deviceSecret ONCE — store it on the ESP32 firmware.
   */
  async provisionDevice(userId: string, input: ProvisionDeviceInput): Promise<DeviceProvisionResult & { device: object }> {
    await this.assertZoneOwnership(input.zoneId, userId);

    // Ensure deviceId is unique (retry on collision — extremely rare)
    let deviceId: string;
    let attempts = 0;
    do {
      deviceId = generateDeviceId();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique device ID');
    } while (await prisma.device.findUnique({ where: { deviceId } }));

    const deviceSecret = generateDeviceSecret();
    const deviceSecretHash = await hashSecret(deviceSecret);

    const device = await prisma.device.create({
      data: {
        zoneId: input.zoneId,
        deviceId,
        deviceSecretHash,
        role: input.role,
        type: input.type,
        firmware: input.firmware,
        status: 'PROVISIONED',
      },
      select: {
        id: true,
        deviceId: true,
        role: true,
        type: true,
        status: true,
        firmware: true,
        zoneId: true,
        createdAt: true,
      },
    });

    return { deviceId, deviceSecret, device };
  }

  async listDevicesByZone(zoneId: string, userId: string) {
    await this.assertZoneOwnership(zoneId, userId);
    return prisma.device.findMany({
      where: { zoneId },
      select: {
        id: true,
        deviceId: true,
        role: true,
        type: true,
        status: true,
        firmware: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDevice(deviceDbId: string, userId: string) {
    await this.assertDeviceOwnership(deviceDbId, userId);
    return prisma.device.findUnique({
      where: { id: deviceDbId },
      select: {
        id: true,
        deviceId: true,
        role: true,
        type: true,
        status: true,
        firmware: true,
        lastSeen: true,
        createdAt: true,
        zoneId: true,
        commands: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, command: true, status: true, createdAt: true, executedAt: true },
        },
      },
    });
  }

  async updateDevice(deviceDbId: string, userId: string, data: UpdateDeviceInput) {
    await this.assertDeviceOwnership(deviceDbId, userId);
    return prisma.device.update({ where: { id: deviceDbId }, data });
  }

  async deleteDevice(deviceDbId: string, userId: string) {
    await this.assertDeviceOwnership(deviceDbId, userId);
    await prisma.device.delete({ where: { id: deviceDbId } });
  }
}

export const devicesService = new DevicesService();
