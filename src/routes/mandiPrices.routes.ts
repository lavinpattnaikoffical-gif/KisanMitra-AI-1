/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * mandiPrices.routes.ts — Express routes for serving cached Agmarknet mandi price data.
 *
 * Routes:
 *   GET /api/mandi-prices             — query prices by crop, state, district
 *   GET /api/mandi-prices/commodities — commodity list for frontend autocomplete
 *   GET /api/mandi-prices/status      — ingestion health / last updated info
 *   GET /api/mandi-prices/refresh     — manual trigger (dev/staging only)
 */

import { Router, Request, Response } from "express";
import {
  getRecords,
  readCache,
  readCommodityIndex,
} from "../services/mandiCache.js";
import { TRACKED_COMMODITIES, runIngestion } from "../services/mandiPriceIngestion.js";

// ── Mock fallback data (used when live cache is empty / API key not set) ───
// This is the expanded 28-state dataset we already built in server.ts.
// Kept here as a pure function so both the old and new endpoints can use it.
const MOCK_MANDI_DATA: Record<string, { crop: string; basePrice: number; unit: string; arrivals: string; quality: "A" | "B" | "C" }[]> = {
  "Andhra Pradesh": [
    { crop: "Rice (Paddy)", basePrice: 2183, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Cotton", basePrice: 6750, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Chilli", basePrice: 12500, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Groundnut", basePrice: 5800, unit: "Quintal", arrivals: "Medium", quality: "B" },
  ],
  "Assam": [
    { crop: "Tea", basePrice: 18500, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Rice (Paddy)", basePrice: 2100, unit: "Quintal", arrivals: "High", quality: "A" },
  ],
  "Bihar": [
    { crop: "Wheat", basePrice: 2150, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Maize", basePrice: 1850, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Potato", basePrice: 1100, unit: "Quintal", arrivals: "High", quality: "B" },
  ],
  "Gujarat": [
    { crop: "Cotton", basePrice: 7100, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Groundnut", basePrice: 6400, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Onion", basePrice: 2100, unit: "Quintal", arrivals: "High", quality: "C" },
  ],
  "Haryana": [
    { crop: "Wheat", basePrice: 2260, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Mustard", basePrice: 5650, unit: "Quintal", arrivals: "Medium", quality: "A" },
  ],
  "Himachal Pradesh": [
    { crop: "Apple", basePrice: 6500, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Potato", basePrice: 1400, unit: "Quintal", arrivals: "High", quality: "A" },
  ],
  "Karnataka": [
    { crop: "Sugarcane", basePrice: 3200, unit: "Ton", arrivals: "High", quality: "A" },
    { crop: "Ragi", basePrice: 3850, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Coffee", basePrice: 28000, unit: "Quintal", arrivals: "High", quality: "A" },
  ],
  "Kerala": [
    { crop: "Coconut", basePrice: 3200, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Rubber", basePrice: 15500, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Pepper", basePrice: 42000, unit: "Quintal", arrivals: "Medium", quality: "A" },
  ],
  "Madhya Pradesh": [
    { crop: "Soybean", basePrice: 4650, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Wheat", basePrice: 2200, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Garlic", basePrice: 7500, unit: "Quintal", arrivals: "Medium", quality: "B" },
  ],
  "Maharashtra": [
    { crop: "Cotton", basePrice: 6800, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Soybean", basePrice: 4600, unit: "Quintal", arrivals: "Medium", quality: "A" },
    { crop: "Onion", basePrice: 2200, unit: "Quintal", arrivals: "Very High", quality: "B" },
    { crop: "Tomato", basePrice: 1800, unit: "Quintal", arrivals: "Medium", quality: "B" },
  ],
  "Odisha": [
    { crop: "Rice (Paddy)", basePrice: 2183, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Turmeric", basePrice: 7000, unit: "Quintal", arrivals: "Low", quality: "A" },
  ],
  "Punjab": [
    { crop: "Wheat", basePrice: 2275, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Rice (Paddy)", basePrice: 2203, unit: "Quintal", arrivals: "High", quality: "A" },
  ],
  "Rajasthan": [
    { crop: "Bajra (Pearl Millet)", basePrice: 2350, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Cumin", basePrice: 24000, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Mustard", basePrice: 5700, unit: "Quintal", arrivals: "High", quality: "A" },
  ],
  "Tamil Nadu": [
    { crop: "Rice (Paddy)", basePrice: 2183, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Banana", basePrice: 2500, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Groundnut", basePrice: 5900, unit: "Quintal", arrivals: "Medium", quality: "A" },
  ],
  "Telangana": [
    { crop: "Cotton", basePrice: 6900, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Rice (Paddy)", basePrice: 2183, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Chilli", basePrice: 11000, unit: "Quintal", arrivals: "Medium", quality: "A" },
  ],
  "Uttar Pradesh": [
    { crop: "Wheat", basePrice: 2200, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Sugarcane", basePrice: 3150, unit: "Ton", arrivals: "Very High", quality: "A" },
    { crop: "Potato", basePrice: 1050, unit: "Quintal", arrivals: "High", quality: "B" },
  ],
  "West Bengal": [
    { crop: "Rice (Paddy)", basePrice: 2183, unit: "Quintal", arrivals: "Very High", quality: "A" },
    { crop: "Jute", basePrice: 5300, unit: "Quintal", arrivals: "High", quality: "A" },
    { crop: "Potato", basePrice: 1050, unit: "Quintal", arrivals: "Very High", quality: "B" },
  ],
};

function getMockRates(crop: string, state?: string) {
  const today = new Date();
  const dayFactor = 1 + Math.sin(today.getDate() + today.getMonth()) * 0.04;
  const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  // Find mock entries that match crop (fuzzy)
  const cropNorm = crop.toLowerCase();
  const allEntries: { state: string; entry: any }[] = [];

  for (const [st, entries] of Object.entries(MOCK_MANDI_DATA)) {
    const matching = entries.filter(
      (e) =>
        e.crop.toLowerCase().includes(cropNorm) ||
        cropNorm.includes(e.crop.toLowerCase().split(" ")[0].toLowerCase())
    );
    matching.forEach((e) => allEntries.push({ state: st, entry: e }));
  }

  if (allEntries.length === 0) return { records: [], exactMatch: false };

  // Prefer exact state if provided
  const stateNorm = state?.toLowerCase() ?? "";
  const stateFiltered = stateNorm
    ? allEntries.filter((x) => x.state.toLowerCase() === stateNorm)
    : allEntries;

  const source = stateFiltered.length > 0 ? stateFiltered : allEntries;
  const exactMatch = stateFiltered.length > 0;

  const records = source.map(({ state: st, entry }) => ({
    state: st,
    district: "—",
    market: `${st} Mandi`,
    commodity: entry.crop,
    variety: "General",
    grade: entry.quality,
    arrivalDate: todayStr,
    minPrice: Math.round(entry.basePrice * dayFactor * 0.96),
    maxPrice: Math.round(entry.basePrice * dayFactor * 1.04),
    modalPrice: Math.round(entry.basePrice * dayFactor),
    fetchedAt: new Date().toISOString(),
  }));

  return { records, exactMatch };
}

// ── Router ─────────────────────────────────────────────────────────────────

const router = Router();

/**
 * GET /api/mandi-prices
 * Query: crop (required), state (optional), district (optional)
 */
router.get("/", async (req: Request, res: Response) => {
  const crop = ((req.query.crop as string) ?? "").trim();
  const state = ((req.query.state as string) ?? "").trim() || undefined;
  const district = ((req.query.district as string) ?? "").trim() || undefined;

  if (!crop) {
    return res.status(400).json({
      success: false,
      error: "Query param 'crop' is required",
    });
  }

  try {
    // Try live cache first
    const cache = readCache();
    const hasLiveData = cache.records.length > 0;

    if (hasLiveData) {
      const result = getRecords(crop, state, district);

      if (result.records.length > 0) {
        return res.json({
          crop,
          state: state ?? null,
          district: district ?? null,
          records: result.records,
          lastUpdated: result.lastUpdated,
          exactMatch: result.exactMatch,
          isStale: result.isStale,
          source: "Agmarknet / data.gov.in",
          totalResults: result.records.length,
        });
      }
    }

    // Fallback to mock data
    const mock = getMockRates(crop, state);
    return res.json({
      crop,
      state: state ?? null,
      district: district ?? null,
      records: mock.records,
      lastUpdated: new Date().toISOString(),
      exactMatch: mock.exactMatch,
      isStale: false,
      source: "mock",
      note: hasLiveData
        ? "No live records found for this crop/state combination. Showing estimated prices."
        : "Live data not yet available — showing estimated prices. Prices sourced from Agmarknet / data.gov.in after first scheduled sync.",
      totalResults: mock.records.length,
    });
  } catch (err: any) {
    console.error("mandi-prices query error:", err);
    res.status(500).json({ success: false, error: "Failed to query mandi prices" });
  }
});

/**
 * GET /api/mandi-prices/commodities
 * Returns the commodity index for frontend autocomplete.
 */
router.get("/commodities", (_req: Request, res: Response) => {
  const index = readCommodityIndex();

  // Always return at least the tracked list even if no ingestion has run yet
  const commodities =
    index.commodities.length > 0 ? index.commodities : [...TRACKED_COMMODITIES].sort();

  res.json({
    commodities,
    updatedAt: index.updatedAt || null,
    total: commodities.length,
  });
});

/**
 * GET /api/mandi-prices/status
 * Returns ingestion health info.
 */
router.get("/status", (_req: Request, res: Response) => {
  const cache = readCache();
  const index = readCommodityIndex();

  res.json({
    ingestionStatus: cache.ingestionStatus,
    lastUpdated: cache.lastUpdated || null,
    totalRecords: cache.records.length,
    consecutiveFailures: cache.consecutiveFailures,
    commodityCount: index.commodities.length,
    isStale: cache.lastUpdated
      ? Date.now() - new Date(cache.lastUpdated).getTime() > 26 * 60 * 60 * 1000
      : true,
  });
});

/**
 * GET /api/mandi-prices/refresh  (DEV / STAGING only)
 * Manually triggers an ingestion run. Never exposed in production.
 */
router.get("/refresh", async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Manual refresh not available in production." });
  }

  res.json({ message: "Ingestion started. Check server logs for progress." });

  // Fire and forget — response already sent
  runIngestion().catch((err) =>
    console.error("Manual ingestion error:", err)
  );
});

export default router;
