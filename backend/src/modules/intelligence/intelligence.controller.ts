import { Request, Response, NextFunction } from 'express';
import { intelligenceService } from './intelligence.service';
import * as R from '../../utils/response';

export class IntelligenceController {
  async evaluateZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await intelligenceService.evaluateZone(req.params.zoneId, req.user!.id, req.app.locals.io);
      R.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async evaluateFarm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await intelligenceService.evaluateFarm(req.params.farmId, req.user!.id, req.app.locals.io);
      R.success(res, results);
    } catch (error) {
      next(error);
    }
  }
}

export const intelligenceController = new IntelligenceController();
