import { Request, Response, NextFunction } from 'express';
import { weatherService } from './weather.service';
import * as R from '../../utils/response';

export class WeatherController {
  async getFarmWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const weather = await weatherService.getWeatherForFarm(req.params.farmId);
      R.success(res, weather);
    } catch (error) {
      next(error);
    }
  }
}

export const weatherController = new WeatherController();
