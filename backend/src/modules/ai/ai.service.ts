import prisma from '../../config/prisma';
import { env } from '../../config/env';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AIRecommendationPayload } from './ai.schema';
import { weatherService } from '../weather/weather.service';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class AIService {
  /**
   * Generate an irrigation recommendation using Gemini in JSON mode.
   * Does NOT directly trigger commands; only provides insight.
   */
  async generateRecommendation(zoneId: string, userId: string): Promise<AIRecommendationPayload> {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, farm: { userId } },
      include: { farm: true },
    });

    if (!zone) throw new Error('Zone not found or access denied');

    // 24h Average
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readings = await prisma.sensorReading.findMany({
      where: { zoneId, createdAt: { gte: yesterday } },
      select: { moisture: true, temperature: true, humidity: true },
    });

    const latestReading = readings[readings.length - 1];
    
    let avgMoisture = null;
    if (readings.length > 0) {
      avgMoisture = Math.round(readings.reduce((sum, r) => sum + (r.moisture || 0), 0) / readings.length);
    }

    let weather;
    try {
      weather = await weatherService.getWeatherForFarm(zone.farmId);
    } catch (e) {
      weather = { rainProbability: 'Unknown', forecast: [] };
    }

    const promptContext = `
You are an expert agronomist AI for the KisanMitra platform.
Based on the following data, provide a structured irrigation recommendation.

Data:
- Crop: ${zone.cropType}
- Moisture Threshold: ${zone.moistureThreshold}%
- Current Moisture: ${latestReading?.moisture ?? 'Unknown'}%
- 24h Avg Moisture: ${avgMoisture ?? 'Unknown'}%
- Current Temperature: ${latestReading?.temperature ?? 'Unknown'}°C
- Rain Probability (Weather): ${weather.rainProbability}%

Instructions:
1. Provide a short, actionable recommendation (e.g., "Irrigate within 6 hours" or "No irrigation needed").
2. Provide a clear reason for the recommendation.
3. Provide a confidence score between 0 and 100.
    `;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        recommendation: { type: Type.STRING },
        reason: { type: Type.STRING },
        confidence: { type: Type.INTEGER },
      },
      required: ['recommendation', 'reason', 'confidence'],
    };

    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: promptContext,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for deterministic agronomy advice
      },
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned empty response');

    const result = JSON.parse(text) as AIRecommendationPayload;

    // Save to DB
    await prisma.aIRecommendation.create({
      data: {
        zoneId,
        userId,
        recommendation: result.recommendation,
        reason: result.reason,
        confidence: result.confidence / 100, // DB stores 0-1
        category: 'IRRIGATION',
      },
    });

    return result;
  }

  /**
   * "Ramu AI" - Context-aware chatbot.
   * Compiles user's farm data and limits telemetry to latest + 24h avg to save tokens.
   */
  async chat(userId: string, message: string): Promise<string> {
    const farms = await prisma.farm.findMany({
      where: { userId },
      include: {
        zones: true,
      },
    });

    let contextData = '';
    
    // Build context per zone
    for (const farm of farms) {
      contextData += `Farm: ${farm.name} (Area: ${farm.totalArea})\n`;
      
      let weatherStr = 'Weather unavailable';
      try {
        const weather = await weatherService.getWeatherForFarm(farm.id);
        weatherStr = `Temp: ${weather.temperature}°C, Rain Prob: ${weather.rainProbability}%`;
      } catch (e) {}
      contextData += `Current Weather: ${weatherStr}\n\n`;

      for (const zone of farm.zones) {
        contextData += `  Zone: ${zone.name} (Crop: ${zone.cropType}, Threshold: ${zone.moistureThreshold}%)\n`;
        
        // Latest reading
        const latestReading = await prisma.sensorReading.findFirst({
          where: { zoneId: zone.id },
          orderBy: { createdAt: 'desc' },
        });

        // 24h Average
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const agg = await prisma.sensorReading.aggregate({
          where: { zoneId: zone.id, createdAt: { gte: yesterday } },
          _avg: { moisture: true },
        });

        contextData += `    Latest Moisture: ${latestReading?.moisture ?? 'N/A'}%\n`;
        contextData += `    24h Avg Moisture: ${agg._avg.moisture ? Math.round(agg._avg.moisture) : 'N/A'}%\n`;

        // Latest Recommendation
        const latestRec = await prisma.aIRecommendation.findFirst({
          where: { zoneId: zone.id },
          orderBy: { createdAt: 'desc' },
        });

        if (latestRec) {
          contextData += `    Latest AI Rec: ${latestRec.recommendation} (${latestRec.reason})\n`;
        }
        contextData += '\n';
      }
    }

    const systemPrompt = `
You are "Ramu", an expert agricultural AI assistant for the KisanMitra platform.
You are helping a farmer manage their farms. Here is their current farm context:

---
${contextData}
---

Instructions:
1. Answer the farmer's question clearly, concisely, and practically.
2. Use the context provided above to give specific advice (e.g., mention specific zones if they need irrigation).
3. Be polite and speak in a helpful, encouraging tone.
4. If asked about something outside of agriculture or the farm's context, politely decline to answer.
    `;

    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        temperature: 0.7,
      },
    });

    return response.text || 'I am sorry, I am unable to respond right now.';
  }
}

export const aiService = new AIService();
