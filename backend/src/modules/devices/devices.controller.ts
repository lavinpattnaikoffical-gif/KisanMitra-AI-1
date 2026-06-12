import { Request, Response, NextFunction } from 'express';
import { devicesService } from './devices.service';
import * as R from '../../utils/response';

export class DevicesController {
  async provision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await devicesService.provisionDevice(req.user!.id, req.body);
      // ⚠️ deviceSecret shown ONCE — not stored in plain text
      R.created(res, result, '⚠️ Save the deviceSecret now — it will not be shown again');
    } catch (error) {
      next(error);
    }
  }

  async listByZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await devicesService.listDevicesByZone(req.params.zoneId, req.user!.id);
      R.success(res, devices);
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await devicesService.getDevice(req.params.id, req.user!.id);
      R.success(res, device);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await devicesService.updateDevice(req.params.id, req.user!.id, req.body);
      R.success(res, device, 'Device updated');
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await devicesService.deleteDevice(req.params.id, req.user!.id);
      R.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const devicesController = new DevicesController();
