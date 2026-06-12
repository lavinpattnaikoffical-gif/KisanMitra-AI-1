import prisma from '../../config/prisma';
import { CreateZoneInput, UpdateZoneInput } from './zones.schema';
import { weatherService } from '../weather/weather.service';

export class ZonesService {
  /** Verify farm belongs to user */
  private async assertFarmOwnership(farmId: string, userId: string): Promise<void> {
    const farm = await prisma.farm.findFirst({ where: { id: farmId, userId } });
    if (!farm) throw new Error('Farm not found');
  }

  /** Verify zone belongs to a farm owned by user */
  private async assertZoneOwnership(zoneId: string, userId: string): Promise<void> {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, farm: { userId } },
    });
    if (!zone) throw new Error('Zone not found');
  }

  async listZones(farmId: string, userId: string) {
    await this.assertFarmOwnership(farmId, userId);
    return prisma.zone.findMany({
      where: { farmId },
      include: {
        devices: {
          select: { id: true, deviceId: true, role: true, type: true, status: true, lastSeen: true },
        },
        _count: { select: { sensorReadings: true, irrigationEvents: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getZone(zoneId: string, userId: string) {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, farm: { userId } },
      include: {
        devices: true,
        aiRecommendations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        irrigationEvents: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
    if (!zone) throw new Error('Zone not found');
    return zone;
  }

  async createZone(farmId: string, userId: string, data: CreateZoneInput) {
    await this.assertFarmOwnership(farmId, userId);
    return prisma.zone.create({ data: { farmId, ...data } });
  }

  async updateZone(zoneId: string, userId: string, data: UpdateZoneInput) {
    await this.assertZoneOwnership(zoneId, userId);
    return prisma.zone.update({ where: { id: zoneId }, data });
  }

  async deleteZone(zoneId: string, userId: string) {
    await this.assertZoneOwnership(zoneId, userId);
    await prisma.zone.delete({ where: { id: zoneId } });
  }

  async getOverview(zoneId: string, userId: string) {
    const zone = await this.getZone(zoneId, userId);
    
    // Get weather via weatherService, handle if coords missing
    let weather: any = {};
    try {
      weather = await weatherService.getWeatherForFarm(zone.farmId);
    } catch(e: any) {
      weather = { error: e.message };
    }

    // Get latest telemetry
    const telemetry = await prisma.sensorReading.findFirst({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      zone: zone.name,
      crop: zone.cropType,
      weather,
      telemetry: telemetry || {},
      devices: zone.devices,
      recommendation: zone.aiRecommendations[0] || {},
    };
  }
}

export const zonesService = new ZonesService();
