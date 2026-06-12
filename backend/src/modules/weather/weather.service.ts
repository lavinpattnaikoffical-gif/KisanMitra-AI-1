import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { WeatherData, WeatherForecast } from './weather.schema';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class WeatherService {
  /**
   * Get weather for a farm using Open-Meteo.
   * Throws an error if the farm lacks latitude or longitude.
   * Caches responses for 15 minutes to avoid rate limiting.
   */
  async getWeatherForFarm(farmId: string): Promise<WeatherData> {
    // 1. Check Cache
    const now = new Date();
    const cached = await prisma.weatherCache.findFirst({
      where: {
        farmId,
        expiresAt: { gt: now },
      },
      orderBy: { fetchedAt: 'desc' },
    });

    if (cached) {
      return cached.payload as unknown as WeatherData;
    }

    // 2. Fetch Farm Coordinates
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: { lat: true, lng: true },
    });

    if (!farm) {
      throw new Error('Farm not found');
    }

    if (farm.lat === null || farm.lng === null || farm.lat === 0 || farm.lng === 0) {
      throw new Error('Farm location not configured. Please update farm location with GPS coordinates.');
    }

    const { lat, lng } = farm;

    // 3. Fetch from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo API returned ${response.status}`);
      }

      const data: any = await response.json();

      const current = data.current || {};
      const daily = data.daily || {};

      const forecast: WeatherForecast[] = [];
      if (daily.time && Array.isArray(daily.time)) {
        for (let i = 0; i < daily.time.length; i++) {
          forecast.push({
            date: daily.time[i],
            maxTemp: daily.temperature_2m_max[i] ?? 0,
            minTemp: daily.temperature_2m_min[i] ?? 0,
            precipitationProb: daily.precipitation_probability_max[i] ?? 0,
          });
        }
      }

      const weatherData: WeatherData = {
        temperature: current.temperature_2m ?? 0,
        humidity: current.relative_humidity_2m ?? 0,
        rainProbability: current.precipitation_probability ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        forecast,
      };

      // 4. Save to Cache
      await prisma.weatherCache.create({
        data: {
          farmId,
          payload: weatherData as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
        },
      });

      // Cleanup old cache entries (fire and forget)
      prisma.weatherCache.deleteMany({
        where: { expiresAt: { lte: now } },
      }).catch(err => console.error('[WeatherCache Cleanup] Error:', err));

      return weatherData;
    } catch (error) {
      console.error('[WeatherService] Error fetching weather:', error);
      throw new Error('Failed to fetch weather data');
    }
  }
}

export const weatherService = new WeatherService();

