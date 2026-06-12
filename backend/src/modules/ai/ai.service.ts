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
  async chat(userId: string, message: string, language: string = 'English', history: Array<{role: string; text: string}> = []): Promise<string> {
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
        contextData += `  Zone: ${zone.name} (Crop: ${zone.cropType}, Irrigation: ${zone.irrigationType}, Threshold: ${zone.moistureThreshold}%)\n`;
        
        // Latest reading — includes ALL sensor data
        const latestReading = await prisma.sensorReading.findFirst({
          where: { zoneId: zone.id },
          orderBy: { createdAt: 'desc' },
          include: { device: { select: { deviceId: true, status: true } } },
        });

        // 24h Averages for ALL metrics
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const agg = await prisma.sensorReading.aggregate({
          where: { zoneId: zone.id, createdAt: { gte: yesterday } },
          _avg: { moisture: true, temperature: true, humidity: true },
          _count: true,
        });

        if (latestReading) {
          const readingAge = Math.round((Date.now() - new Date(latestReading.createdAt).getTime()) / 60000);
          contextData += `    📊 LIVE SENSOR DATA (${readingAge} minutes ago):\n`;
          contextData += `      Soil Moisture: ${latestReading.moisture ?? 'N/A'}%\n`;
          contextData += `      Temperature: ${latestReading.temperature ?? 'N/A'}°C\n`;
          contextData += `      Humidity: ${latestReading.humidity ?? 'N/A'}%\n`;
          contextData += `      Battery: ${latestReading.battery ?? 'N/A'}%\n`;
          if (latestReading.device) {
            contextData += `      Device: ${latestReading.device.deviceId} (${latestReading.device.status})\n`;
          }
        } else {
          contextData += `    ⚠️ No sensor readings yet for this zone.\n`;
        }

        contextData += `    📈 24h AVERAGES (${agg._count} readings):\n`;
        contextData += `      Avg Moisture: ${agg._avg.moisture ? Math.round(agg._avg.moisture) : 'N/A'}%\n`;
        contextData += `      Avg Temperature: ${agg._avg.temperature ? Math.round(agg._avg.temperature * 10) / 10 : 'N/A'}°C\n`;
        contextData += `      Avg Humidity: ${agg._avg.humidity ? Math.round(agg._avg.humidity) : 'N/A'}%\n`;

        // Latest Recommendation
        const latestRec = await prisma.aIRecommendation.findFirst({
          where: { zoneId: zone.id },
          orderBy: { createdAt: 'desc' },
        });

        if (latestRec) {
          contextData += `    🤖 Latest AI Rec: ${latestRec.recommendation} (${latestRec.reason})\n`;
        }
        contextData += '\n';
      }
    }

    const systemPrompt = `
You are "Ramu", an expert agricultural AI assistant for the KisanMitra platform.
You have REAL-TIME ACCESS to the farmer's IoT sensor data. Here is their current farm context:

---
${contextData}
---

Instructions:
1. Answer the farmer's question clearly, concisely, and practically.
2. ALWAYS reference the LIVE SENSOR DATA above when answering questions about moisture, temperature, humidity, or farm conditions. Quote the exact numbers.
3. If soil moisture is below the threshold, proactively warn about irrigation needs.
4. If temperature is above 35°C or below 10°C, warn about crop stress.
5. If humidity is above 80%, warn about fungal disease risk.
6. Be polite and speak in a helpful, encouraging tone. Use emojis sparingly.
7. If asked about something outside of agriculture or the farm's context, politely decline.
8. IMPORTANT: You MUST respond entirely in ${language}. ${language === 'Hindi' ? 'Use Devanagari script (हिन्दी में जवाब दें).' : language === 'Marathi' ? 'Use Devanagari script (मराठीत उत्तर द्या).' : 'Respond in English.'}
    `;

    // Build multi-turn conversation contents
    const contents: Array<{role: string; parts: Array<{text: string}>}> = [
      { role: 'user', parts: [{ text: systemPrompt }] },
    ];

    // Add conversation history (last 10 turns for token efficiency)
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      });
    }

    // Add the current message
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Try Gemini first, fallback to OpenRouter, then offline message
    try {
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents,
        config: {
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (geminiError: any) {
      console.warn('Gemini AI chat error (will try fallback):', geminiError?.message || geminiError);
    }

    // Fallback: Try OpenRouter if configured
    if (env.OPENROUTER_API_KEY) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://kisanmitr.ai',
            'X-Title': 'KisanMitr AI',
          },
          body: JSON.stringify({
            model: env.OPENROUTER_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.7,
          }),
        });

        if (orRes.ok) {
          const orData: any = await orRes.json();
          const orText = orData.choices?.[0]?.message?.content;
          if (orText && orText.trim().length > 0) {
            return orText;
          }
        }
      } catch (orError: any) {
        console.warn('OpenRouter fallback also failed:', orError?.message || orError);
      }
    }

    // Final fallback: helpful offline message
    const farmSummary = farms.length > 0
      ? `Based on your ${farms.length} farm(s), here is my general advice:\n- Monitor soil moisture levels closely and irrigate when below threshold.\n- Check weather forecasts before applying fertilizers or pesticides.\n- Inspect crop leaves regularly for early signs of disease.`
      : 'Please set up your farm and zones first so I can provide personalized advice.';

    return `Namaste! I'm Ramu, your agricultural assistant. The AI service is temporarily busy, but I can still help!\n\n${farmSummary}\n\nPlease try again in a few moments for detailed AI-powered analysis.`;
  }
}

export const aiService = new AIService();
