import { Request, Response, NextFunction } from 'express';
import { zonesService } from './zones.service';
import * as R from '../../utils/response';

export class ZonesController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zones = await zonesService.listZones(req.params.farmId, req.user!.id);
      R.success(res, zones);
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zonesService.getZone(req.params.id, req.user!.id);
      R.success(res, zone);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zonesService.createZone(req.params.farmId, req.user!.id, req.body);
      R.created(res, zone, 'Zone created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zonesService.updateZone(req.params.id, req.user!.id, req.body);
      R.success(res, zone, 'Zone updated');
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await zonesService.deleteZone(req.params.id, req.user!.id);
      R.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await zonesService.getOverview(req.params.id, req.user!.id);
      R.success(res, overview);
    } catch (error) {
      next(error);
    }
  }
}

export const zonesController = new ZonesController();
