import { Request, Response, NextFunction } from 'express';
import { farmsService } from './farms.service';
import * as R from '../../utils/response';

export class FarmsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farms = await farmsService.listFarms(req.user!.id);
      R.success(res, farms);
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farm = await farmsService.getFarm(req.params.id, req.user!.id);
      R.success(res, farm);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farm = await farmsService.createFarm(req.user!.id, req.body);
      R.created(res, farm, 'Farm created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const farm = await farmsService.updateFarm(req.params.id, req.user!.id, req.body);
      R.success(res, farm, 'Farm updated');
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await farmsService.deleteFarm(req.params.id, req.user!.id);
      R.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const farmsController = new FarmsController();
