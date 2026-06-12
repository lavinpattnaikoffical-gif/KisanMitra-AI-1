import { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { telemetryService } from './telemetry.service';
import {
  emitTelemetryUpdate,
  emitDeviceOnline,
  emitIrrigationTriggered,
} from './telemetry.socket';
import * as R from '../../utils/response';
import prisma from '../../config/prisma';

export class TelemetryController {
  /**
   * POST /api/telemetry/ingest
   * ESP32 SENDER device uploads sensor data.
   * Auth: deviceAuthMiddleware (x-device-id + x-device-secret)
   */
  async ingest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = req.deviceContext;
      if (!ctx) {
        R.unauthorized(res, 'Device context missing');
        return;
      }

      // Get full device info for type check and previous status
      const device = await prisma.device.findUnique({
        where: { id: ctx.id },
        select: { id: true, deviceId: true, role: true, type: true, zoneId: true, status: true },
      });

      if (!device) {
        R.notFound(res, 'Device not found');
        return;
      }

      if (device.role !== 'SENDER') {
        R.badRequest(res, 'Only SENDER devices can upload telemetry');
        return;
      }

      // Store reading
      const reading = await telemetryService.ingestReading(device.id, device.zoneId, req.body);

      // Socket.IO: emit real-time update to zone subscribers
      const io: SocketIOServer | undefined = req.app.locals.io;
      if (io) {
        emitTelemetryUpdate(io, device.zoneId, reading);

        // If device was previously OFFLINE or PROVISIONED, emit online event
        if (ctx.status !== 'ONLINE') {
          emitDeviceOnline(io, device.zoneId, device.deviceId, device.type);
        }
      }

      R.success(res, { id: reading.id, createdAt: reading.createdAt }, 'Reading stored');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/device/commands
   * RECEIVER ESP32 polls for pending commands.
   * Auth: deviceAuthMiddleware
   */
  async getCommands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = req.deviceContext;
      if (!ctx) {
        R.unauthorized(res, 'Device context missing');
        return;
      }

      const commands = await telemetryService.getPendingCommands(ctx.id);

      // Format for ESP32 — minimal payload
      const formatted = commands.map((cmd) => ({
        commandId: cmd.id,
        command: cmd.command,
        payload: cmd.payload,
      }));

      R.success(res, formatted);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/device/ack
   * RECEIVER ESP32 acknowledges command execution.
   * Auth: deviceAuthMiddleware
   */
  async ackCommand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = req.deviceContext;
      if (!ctx) {
        R.unauthorized(res, 'Device context missing');
        return;
      }

      const result = await telemetryService.ackCommand(ctx.id, req.body);
      R.success(res, { id: result.id, status: result.status }, 'Command acknowledged');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/telemetry/command
   * User creates a command for a RECEIVER device (e.g. START_PUMP).
   * Auth: authMiddleware (JWT)
   */
  async createCommand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const command = await telemetryService.createCommand(req.user!.id, req.body);

      // Emit irrigation event if command is pump/valve related
      const io: SocketIOServer | undefined = req.app.locals.io;
      if (io && /PUMP|VALVE|IRRIGAT/i.test(command.command)) {
        const device = await prisma.device.findUnique({
          where: { id: command.deviceId },
          select: { zoneId: true, deviceId: true },
        });
        if (device) {
          emitIrrigationTriggered(io, device.zoneId, {
            command: command.command,
            deviceId: device.deviceId,
            triggeredBy: 'MANUAL',
          });
        }
      }

      R.created(res, command, 'Command queued');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/telemetry/:zoneId/latest
   * Get latest sensor reading for a zone.
   * Auth: authMiddleware (JWT)
   */
  async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reading = await telemetryService.getLatestByZone(req.params.zoneId);
      if (!reading) {
        R.success(res, null, 'No readings yet');
        return;
      }
      R.success(res, reading);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/telemetry/:zoneId/history
   * Paginated historical readings.
   * Auth: authMiddleware (JWT)
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, pageSize, from, to } = req.query as any;
      const result = await telemetryService.getHistory(
        req.params.zoneId,
        Number(page) || 1,
        Number(pageSize) || 50,
        from,
        to
      );
      R.success(res, result.readings, 'Success', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard
   * Aggregated dashboard metrics for the authenticated user.
   * Auth: authMiddleware (JWT)
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await telemetryService.getDashboard(req.user!.id);
      R.success(res, dashboard);
    } catch (error) {
      next(error);
    }
  }
}

export const telemetryController = new TelemetryController();
