import prisma from '../../config/prisma';
import { CreateFarmInput, UpdateFarmInput } from './farms.schema';

export class FarmsService {
  /** List all farms for the authenticated user */
  async listFarms(userId: string) {
    return prisma.farm.findMany({
      where: { userId },
      include: {
        zones: {
          select: {
            id: true,
            name: true,
            cropType: true,
            areaSize: true,
            isAutoIrrigationEnabled: true,
          },
        },
        _count: { select: { zones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get single farm — verifies ownership */
  async getFarm(farmId: string, userId: string) {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, userId },
      include: {
        zones: {
          include: {
            devices: {
              select: { id: true, deviceId: true, role: true, type: true, status: true, lastSeen: true },
            },
            _count: { select: { sensorReadings: true } },
          },
        },
      },
    });

    if (!farm) throw new Error('Farm not found');
    return farm;
  }

  /** Create a new farm */
  async createFarm(userId: string, data: CreateFarmInput) {
    return prisma.farm.create({
      data: { userId, ...data },
    });
  }

  /** Update farm — verifies ownership */
  async updateFarm(farmId: string, userId: string, data: UpdateFarmInput) {
    const farm = await prisma.farm.findFirst({ where: { id: farmId, userId } });
    if (!farm) throw new Error('Farm not found');

    return prisma.farm.update({ where: { id: farmId }, data });
  }

  /** Delete farm and all its zones/devices (cascading via Prisma) */
  async deleteFarm(farmId: string, userId: string) {
    const farm = await prisma.farm.findFirst({ where: { id: farmId, userId } });
    if (!farm) throw new Error('Farm not found');

    await prisma.farm.delete({ where: { id: farmId } });
  }
}

export const farmsService = new FarmsService();
