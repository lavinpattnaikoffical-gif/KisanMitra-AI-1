import { Request, Response, NextFunction } from 'express';
import { compareSecret } from '../utils/hash';
import { unauthorized } from '../utils/response';
import prisma from '../config/prisma';

/**
 * Device authentication middleware for ESP32 hardware.
 * Reads x-device-id and x-device-secret headers.
 * Much simpler than JWT for constrained IoT devices.
 */
export async function deviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const deviceSecret = req.headers['x-device-secret'] as string | undefined;

    if (!deviceId || !deviceSecret) {
      unauthorized(res, 'Device credentials required (x-device-id, x-device-secret)');
      return;
    }

    const device = await prisma.device.findUnique({
      where: { deviceId },
      select: {
        id: true,
        deviceId: true,
        deviceSecretHash: true,
        status: true,
        zoneId: true,
      },
    });

    if (!device) {
      unauthorized(res, 'Device not found');
      return;
    }

    const isValid = await compareSecret(deviceSecret, device.deviceSecretHash);
    if (!isValid) {
      unauthorized(res, 'Invalid device credentials');
      return;
    }

    // Update last seen timestamp
    await prisma.device.update({
      where: { deviceId },
      data: { lastSeen: new Date(), status: 'ONLINE' },
    });

    req.deviceId = device.deviceId;
    req.deviceContext = {
      id: device.id,
      deviceId: device.deviceId,
      zoneId: device.zoneId,
      status: device.status,
    };

    next();
  } catch (error) {
    unauthorized(res, 'Device authentication failed');
  }
}
