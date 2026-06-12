import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import * as R from '../../utils/response';

export class AIController {
  async getRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await aiService.generateRecommendation(req.params.zoneId, req.user!.id);
      R.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await aiService.chat(req.user!.id, req.body.message);
      R.success(res, { answer: result });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
