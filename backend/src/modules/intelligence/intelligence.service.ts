import prisma from '../../config/prisma';
import { weatherService } from '../weather/weather.service';
import { EvaluationResult } from './intelligence.schema';
import { emitIrrigationTriggered } from '../telemetry/telemetry.socket';

export class IntelligenceService {
  /**
   * Evaluates a single zone and triggers irrigation if conditions are met.
   * This is a deterministic rule engine (no AI involved).
   */
  async evaluateZone(zoneId: string, userId: string, io?: any): Promise<EvaluationResult> {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, farm: { userId } },
      include: {
        devices: {
          where: { role: 'RECEIVER', type: { in: ['PUMP', 'VALVE', 'RELAY'] } },
        },
      },
    });

    if (!zone) throw new Error('Zone not found or access denied');

    const latestReading = await prisma.sensorReading.findFirst({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestReading || latestReading.moisture === null) {
      return {
        zoneId,
        needIrrigation: false,
        priority: 'NONE',
        reason: 'No moisture data available',
        actionTaken: null,
      };
    }

    const moisture = latestReading.moisture;
    const threshold = zone.moistureThreshold;
    
    // Attempt to get weather. If farm has no coords, we still want to evaluate moisture.
    let weather;
    try {
      weather = await weatherService.getWeatherForFarm(zone.farmId);
    } catch (e) {
      // Fallback: assume no rain if weather fails due to missing coords
      weather = { rainProbability: 0 }; 
    }
    
    let needIrrigation = false;
    let priority: 'HIGH' | 'LOW' | 'NONE' = 'NONE';
    let reason = '';

    // 3-Level Severity Logic
    if (moisture < 20) {
      // Critical
      needIrrigation = true;
      priority = 'HIGH';
      reason = `Critical: Moisture (${moisture}%) is below 20%. Auto-irrigation required immediately.`;
    } else if (moisture < threshold) {
      // Warning
      if (weather.rainProbability < 30) {
        needIrrigation = true;
        priority = 'LOW';
        reason = `Warning: Moisture (${moisture}%) below threshold (${threshold}%) and low rain probability (${weather.rainProbability}%). Irrigation recommended.`;
      } else {
        reason = `Warning: Moisture below threshold, but high rain probability (${weather.rainProbability}%). Irrigation deferred.`;
      }
    } else {
      // Healthy
      reason = `Healthy: Moisture (${moisture}%) is adequate (>= ${threshold}%).`;
    }

    let actionTaken = null;

    if (needIrrigation && zone.isAutoIrrigationEnabled) {
      // Prioritize: PUMP -> VALVE -> RELAY
      let receiver = zone.devices.find(d => d.type === 'PUMP');
      if (!receiver) receiver = zone.devices.find(d => d.type === 'VALVE');
      if (!receiver) receiver = zone.devices.find(d => d.type === 'RELAY');

      if (receiver) {
        // Create Device Command
        await prisma.deviceCommandRecord.create({
          data: {
            deviceId: receiver.id,
            command: 'START_PUMP',
            payload: { duration: 300 }, // 5 minutes default
            status: 'PENDING',
          },
        });

        // Create Irrigation Event
        await prisma.irrigationEvent.create({
          data: {
            zoneId,
            triggeredBy: 'AUTO_RULE',
            durationMinutes: 5,
            status: 'PENDING',
            notes: reason,
          },
        });

        actionTaken = `Queued command for ${receiver.type} device ${receiver.deviceId}`;

        // Emit Socket.IO event if io is provided
        if (io) {
          emitIrrigationTriggered(io, zone.id, {
            command: 'START_PUMP',
            deviceId: receiver.deviceId,
            triggeredBy: 'AUTO_RULE',
          });
        }
      } else {
        actionTaken = 'Irrigation needed, but no RECEIVER device found in zone.';
      }
    } else if (needIrrigation && !zone.isAutoIrrigationEnabled) {
      actionTaken = 'Irrigation needed, but Auto Irrigation is disabled. Manual action required.';
    }

    return {
      zoneId,
      needIrrigation,
      priority,
      reason,
      actionTaken,
    };
  }

  /**
   * Evaluates all zones in a farm.
   */
  async evaluateFarm(farmId: string, userId: string, io?: any): Promise<EvaluationResult[]> {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, userId },
      include: { zones: { select: { id: true } } },
    });

    if (!farm) throw new Error('Farm not found or access denied');

    const results: EvaluationResult[] = [];
    for (const zone of farm.zones) {
      try {
        const res = await this.evaluateZone(zone.id, userId, io);
        results.push(res);
      } catch (err: any) {
        results.push({
          zoneId: zone.id,
          needIrrigation: false,
          priority: 'NONE',
          reason: `Error evaluating zone: ${err.message}`,
          actionTaken: null,
        });
      }
    }

    return results;
  }
}

export const intelligenceService = new IntelligenceService();

