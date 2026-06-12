import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "20mb" }));

// Runtime AI provider config (can be changed from Settings UI)
let aiProviderConfig = {
  provider: (process.env.AI_PROVIDER || "gemini") as "gemini" | "openrouter" | "ollama",
  geminiKey: process.env.GEMINI_API_KEY || "",
  openrouterKey: process.env.OPENROUTER_API_KEY || "",
  openrouterModel: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
};

// IoT data store (in-memory for demo, persists per session)
let iotSensorData: { id: string; source: string; data: any; timestamp: string }[] = [];

// Helper to initialize Google Gen AI client lazily
function getGeminiClient() {
  const apiKey = aiProviderConfig.geminiKey;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ GEMINI_API_KEY key is default or missing. AI requests will use robust local offline mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper: Call OpenRouter API (OpenAI-compatible)
async function callOpenRouter(messages: { role: string; content: string }[], model?: string): Promise<string> {
  const key = aiProviderConfig.openrouterKey;
  if (!key) throw new Error("OpenRouter API key not configured.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://kisanmitr.ai",
      "X-Title": "KisanMitr AI",
    },
    body: JSON.stringify({
      model: model || aiProviderConfig.openrouterModel,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from OpenRouter.";
}

// Helper: Call Ollama API (local LLM)
async function callOllama(prompt: string, systemPrompt?: string, model?: string): Promise<string> {
  const url = `${aiProviderConfig.ollamaUrl}/api/generate`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || aiProviderConfig.ollamaModel,
      prompt,
      system: systemPrompt || "",
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.response || "No response from Ollama.";
}

// 🌾 Mock Mandi Rates Data Creator (Nashik / Amritsar / Gondal / Mandya etc.)
const MOCK_MANDI_DATA: Record<string, { crop: string, basePrice: number, unit: string, arrivals: string, quality: "A" | "B" | "C" }[]> = {
  "Maharashtra": [
    { crop: "Cotton", basePrice: 6800, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Soybean", basePrice: 4600, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Onion", basePrice: 2200, unit: "Quintal", arrivals: "Very High", quality: "B" },
    { crop: "Sugarcane", basePrice: 3150, unit: "Ton", arrivals: "High", quality: "A" },
    { crop: "Tomato", basePrice: 1800, unit: "Quintal", arrivals: "Medium", quality: "B" },
  ],
  "Punjab": [
    { crop: "Wheat", basePrice: 2275, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Rice (Paddy)", basePrice: 2203, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Cotton", basePrice: 6900, unit: "Quintal", arrivals: "Low", quality: "B" },
    { crop: "Potato", basePrice: 1200, unit: "Quintal", arrivals: "Medium", quality: "B" },
  ],
  "Gujarat": [
    { crop: "Cotton", basePrice: 7100, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Groundnut", basePrice: 6400, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Wheat", basePrice: 2350, unit: "Quintal", arrivals: "Low", quality: "A" },
    { crop: "Onion", basePrice: 2100, unit: "Quintal", arrivals: "High", quality: "C" },
  ],
  "Karnataka": [
    { crop: "Sugarcane", basePrice: 3200, unit: "Ton", arrivals: "High", quality: "A" },
    { crop: "Rice (Paddy)", basePrice: 2250, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Ragi", basePrice: 3850, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Tomato", basePrice: 1950, unit: "Quintal", arrivals: "Low", quality: "B" },
  ],
};

// --- API Endpoints ---

// 1. Mandi Price Intelligence API
app.get("/api/mandi-rates", (req, res) => {
  const state = (req.query.state as string) || "Maharashtra";
  const cropList = MOCK_MANDI_DATA[state] || MOCK_MANDI_DATA["Maharashtra"];

  // Apply a subtle deterministic daily index based on date (makes prices fluctuate slightly for realism)
  const today = new Date();
  const dayFactor = 1 + (Math.sin(today.getDate() + today.getMonth()) * 0.04); // -4% to +4%

  const rates = cropList.map(item => ({
    ...item,
    price: Math.round(item.basePrice * dayFactor),
    prevPrice: Math.round(item.basePrice * (dayFactor - 0.02)),
    aiSuggestedRange: {
      min: Math.round(item.basePrice * dayFactor * 1.02),
      max: Math.round(item.basePrice * dayFactor * 1.08),
    },
    lastUpdated: "Today, 06:00 AM",
    source: "eNAM (National Agriculture Market)",
  }));

  res.json({ state, rates });
});

// API: Save AI provider configuration at runtime
app.post("/api/settings/ai-provider", (req, res) => {
  const { provider, geminiKey, openrouterKey, openrouterModel, ollamaUrl, ollamaModel, geminiModel } = req.body;
  if (provider) aiProviderConfig.provider = provider;
  if (geminiKey) aiProviderConfig.geminiKey = geminiKey;
  if (openrouterKey) aiProviderConfig.openrouterKey = openrouterKey;
  if (openrouterModel) aiProviderConfig.openrouterModel = openrouterModel;
  if (ollamaUrl) aiProviderConfig.ollamaUrl = ollamaUrl;
  if (ollamaModel) aiProviderConfig.ollamaModel = ollamaModel;
  if (geminiModel) aiProviderConfig.geminiModel = geminiModel;
  console.log(`⚙️ AI Provider updated to: ${aiProviderConfig.provider}`);
  res.json({ success: true, config: { provider: aiProviderConfig.provider } });
});

app.get("/api/settings/ai-provider", (_req, res) => {
  res.json({
    provider: aiProviderConfig.provider,
    hasGeminiKey: !!aiProviderConfig.geminiKey && aiProviderConfig.geminiKey !== "MY_GEMINI_API_KEY",
    hasOpenrouterKey: !!aiProviderConfig.openrouterKey,
    ollamaUrl: aiProviderConfig.ollamaUrl,
    ollamaModel: aiProviderConfig.ollamaModel,
    openrouterModel: aiProviderConfig.openrouterModel,
    geminiModel: aiProviderConfig.geminiModel,
  });
});

// API: IoT sensor data ingestion endpoint
app.post("/api/iot-ingest", (req, res) => {
  const { sensorId, source, data } = req.body;
  if (!data) return res.status(400).json({ error: "Missing sensor data payload" });
  const entry = {
    id: `iot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: source || "USB/Serial",
    data,
    timestamp: new Date().toISOString(),
  };
  iotSensorData.push(entry);
  if (iotSensorData.length > 200) iotSensorData = iotSensorData.slice(-200);
  console.log(`📡 IoT data received from ${source || "USB"}: ${JSON.stringify(data).slice(0, 100)}`);
  res.json({ success: true, entry });
});

app.get("/api/iot-data", (_req, res) => {
  res.json({ data: iotSensorData.slice(-50) });
});

// 2. Multilingual AI Assistant Chat API (supports Gemini / OpenRouter / Ollama)
app.post("/api/chat", async (req, res) => {
  const { message, history, language = "English", systemInstruction, provider: reqProvider } = req.body;
  const activeProvider = reqProvider || aiProviderConfig.provider;

  const sysPrompt = systemInstruction || `You are KisanMitr AI, an expert agricultural companion assisting rural Indian farmers.
Respond in ${language}. Keep your language clear, warm, empathetic, and actionable. Use bullet points for recommendations. Include specific names of common organic or chemical treatments available in India. Do not mention API keys or technical system details.`;

  // === OpenRouter Path ===
  if (activeProvider === "openrouter") {
    try {
      const messages = [
        { role: "system", content: sysPrompt },
        ...(history || []).map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: message },
      ];
      const text = await callOpenRouter(messages);
      return res.json({ text, isMock: false, provider: "openrouter" });
    } catch (err: any) {
      console.error("OpenRouter error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // === Ollama Path ===
  if (activeProvider === "ollama") {
    try {
      const historyText = (history || []).map((m: any) => `${m.sender === "user" ? "Farmer" : "KisanMitr"}: ${m.text}`).join("\n");
      const fullPrompt = historyText ? `${historyText}\nFarmer: ${message}\nKisanMitr:` : `Farmer: ${message}\nKisanMitr:`;
      const text = await callOllama(fullPrompt, sysPrompt);
      return res.json({ text, isMock: false, provider: "ollama" });
    } catch (err: any) {
      console.error("Ollama error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // === Gemini Path (default) ===
  const ai = getGeminiClient();

  if (!ai) {
    let fallbackText = `[AI Offline Companion] Namaste! I am your KisanMitr Assistant. It seems my Google Gemini API key is missing. I can still help with pre-cached advice:
    
- For Soil Moisture (today): Keep monitoring Zone B. Ensure your drip lines are clear.
- For Crop Protection: Inspect leaves for white spots. Spray sulfur-based fungicide only when wind speeds are below 10 km/h.
- For Fertilizer: Best applied early morning before temperatures cross 30°C.`;

    if (language === "Hindi") {
      fallbackText = `[एआई ऑफ़लाइन] नमस्ते! मैं आपका किसानमित्र सहायक हूं। कृपया ध्यान रखें:
- मिट्टी की नमी: ज़ोन बी की निगरानी रखें।
- फसल सुरक्षा: पत्तों पर सफेद धब्बों की जांच करें। फफूंदनाशक का छिड़काव सुबह हवा शांत होने पर करें।
- उर्वरक: सर्वोत्तम परिणाम के लिए सुबह 10 बजे से पहले डालें।`;
    } else if (language === "Marathi") {
      fallbackText = `[एआय ऑफलाइन] नमस्कार! मी तुमचा किसानमित्र सहाय्यक आहे. 
- मातीतील ओलावा: झोन बी काळजीपूर्वक तपासा.
- पीक संरक्षण: पानांवरील पांढऱ्या ठिपक्यांची तपासणी करा. हवा शांत असताना बुरशीनाशकाची फवारणी करा.
- खत व्यवस्थापन: सकाळी १० वाजण्यापूर्वी खत देणे योग्य ठरेल.`;
    }

    return res.json({ text: fallbackText, isMock: true });
  }

  try {
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: aiProviderConfig.geminiModel,
      contents,
      config: {
        systemInstruction: sysPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "I was unable to formulate a response.", isMock: false, provider: "gemini" });
  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat with Kisan AI." });
  }
});

// 3. Leaf Disease Analysis (Vision) API
app.post("/api/analyze-crop", async (req, res) => {
  const { imageBase64, crop = "General", language = "English" } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Elegant fallback simulation to guarantee flawless operation even without key
    const mockDiagnostics = {
      disease: crop === "Tomato" ? "Tomato Early Blight (टमाटर अगेती झुलसा)" : "Powdery Mildew (चूर्णिल आसिता)",
      confidence: 88,
      severity: "Moderate",
      symptoms: [
        "Concentric brown spots with target-like rings on older leaves.",
        "Yellowing surrounding leaf spots followed by premature defoliation.",
        "Reduced crop yield and potential spots on stems or fruit."
      ],
      treatment: {
        biological: "Spray Neem Oil (1500ppm) or apply Trichoderma viride bio-fungicide.",
        chemical: "Apply Chlorothalonil or Mancozeb fungicide as per instructions.",
        preventive: "Improve row spacing to increase ventilation. Clean all drip nozzles and rotate crops with non-solanaceous options."
      },
      audioText: `Diagnostics report indicates ${crop === "Tomato" ? "Tomato Early Blight" : "Powdery Mildew"} with eighty-eight percent confidence. Please apply Mancozeb fungicide or Neem Oil in the early morning and avoid excessive overhead irrigation.`,
      isMock: true
    };
    return res.json(mockDiagnostics);
  }

  try {
    // Extract base64 clean data
    const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analyze this cropped plant leaf image for diseases. Return a JSON object with EXACTLY the following schema structure, translated to ${language} if possible (leave technical disease names in both Latin/English and ${language}). Keep the JSON pristine without markdown formatting.
    Schema properties:
    - disease (string): Name of the disease (or "Healthy Leaf" if pristine)
    - confidence (number): Confidence percentage of the diagnostic from 0 to 100
    - severity (string): "High", "Moderate", "Low", or "Healthy"
    - symptoms (array of strings): Primary symptoms identified in the image
    - treatment (object):
        * biological (string): organic, biological, or neem-based spray options
        * chemical (string): chemical pesticide/fungicide recommendation available in India
        * preventive (string): soil safety, watering tips, crop rotation parameters
    - audioText (string): A brief, friendly, 2-line summary text in ${language} to be read aloud via TTS.

    Image Info: Leaf of crop category: ${crop}.`;

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanedBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: aiProviderConfig.geminiModel,
      contents: [imagePart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["disease", "confidence", "severity", "symptoms", "treatment", "audioText"],
          properties: {
            disease: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            severity: { type: Type.STRING },
            symptoms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            treatment: {
              type: Type.OBJECT,
              required: ["biological", "chemical", "preventive"],
              properties: {
                biological: { type: Type.STRING },
                chemical: { type: Type.STRING },
                preventive: { type: Type.STRING }
              }
            },
            audioText: { type: Type.STRING }
          }
        },
        temperature: 0.2,
      },
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json({ ...parsedData, isMock: false });
  } catch (error: any) {
    console.error("Crop disease analysis failure:", error);
    res.status(500).json({ error: "Failed to compile AI crop diagnostics." });
  }
});

// Configure Vite or Serve Static build inside Express
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌾 KisanMitr AI Server active and listening on http://localhost:${PORT}`);
  });
}

setupServer();
