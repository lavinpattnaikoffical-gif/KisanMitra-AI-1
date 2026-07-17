/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * mandiPriceIngestion.ts — Scheduled cron job that pulls fresh Agmarknet
 * data from data.gov.in and writes to the local JSON cache.
 *
 * Runs twice daily (6 AM & 6 PM IST) via node-cron in server.ts.
 * Never called on every request — this is the "fetch once, serve cached" pattern.
 *
 * NON-NEGOTIABLES enforced here:
 *  - DATA_GOV_API_KEY read from process.env only (never hardcoded)
 *  - Sequential requests with delay to respect data.gov.in rate limits
 *  - Exponential backoff on 429 / 5xx
 *  - Idempotent upsert — re-runs do not duplicate records (newest fetch overwrites)
 *  - Graceful no-op if API key is not configured
 */

import {
  MandiCacheRecord,
  readCache,
  writeCache,
  writeCommodityIndex,
  invalidateMemCache,
} from "./mandiCache.js";

// ── Tracked Commodity List ─────────────────────────────────────────────────
// Exact-match commodity names as they appear in the Agmarknet / data.gov.in API.
// NOTE: These must match the API's commodity field precisely — common gotchas:
//   "Soyabean" (not "Soybean"), "Chilly" (not "Chilli"), "Bhindi(Ladies Finger)" etc.
// Expand this list as needed — ingestion is sequential so adding more just takes longer.

export const TRACKED_COMMODITIES: string[] = [
  // Vegetables
  "Tomato", "Onion", "Potato", "Garlic", "Ginger",
  "Bhindi(Ladies Finger)", "Brinjal", "Cabbage", "Cauliflower", "Carrot",
  "Peas Wet", "Bitter Gourd", "Bottle Gourd", "Pumpkin", "Cucumber",
  // Fruits
  "Banana", "Mango", "Lemon", "Coconut",
  // Cereals & Grains
  "Wheat", "Maize", "Paddy(Dhan)(Common)", "Jowar(Sorghum)", "Bajra(Pearl Millet)",
  "Rice", "Ragi (Finger Millet)",
  // Cash / Oilseed Crops
  "Cotton", "Soyabean", "Groundnut", "Mustard", "Sunflower Seed", "Sugarcane",
  // Spices
  "Turmeric", "Chilly", "Coriander(Leaves)", "Cumin(Jeera)",
  // Pulses
  "Arhar (Tur/Red Gram)(Whole)", "Moong (Whole)", "Urad (Black Gram)(Whole)",
  "Bengal Gram(Chana)(Whole)", "Lentil (Masur)(Whole)",
  // Plantation
  "Coffee",
];

// ── Constants ──────────────────────────────────────────────────────────────

const AGMARKNET_API =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

/** Delay between sequential API calls to respect rate limits */
const CALL_DELAY_MS = 350;

/** Records to fetch per commodity per run */
const RECORDS_PER_COMMODITY = 500;

const MAX_RETRIES = 3;

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt = 1): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });

    // Retryable server-side errors
    if (res.status === 429 || res.status >= 500) {
      if (attempt > MAX_RETRIES) {
        throw new Error(`Agmarknet ${res.status} after ${MAX_RETRIES} retries`);
      }
      const backoffMs = Math.pow(2, attempt) * 1_000; // 2s, 4s, 8s
      console.warn(
        `  ↩ Agmarknet ${res.status} — backing off ${backoffMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(backoffMs);
      return fetchWithRetry(url, attempt + 1);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    if (attempt > MAX_RETRIES) throw err;
    const backoffMs = Math.pow(2, attempt) * 1_000;
    console.warn(
      `  ↩ Fetch error (attempt ${attempt}/${MAX_RETRIES}): ${err.message} — retrying in ${backoffMs}ms`
    );
    await sleep(backoffMs);
    return fetchWithRetry(url, attempt + 1);
  }
}

// ── Core fetch for one commodity ───────────────────────────────────────────

async function fetchCommodityRecords(
  commodity: string,
  apiKey: string
): Promise<MandiCacheRecord[]> {
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(RECORDS_PER_COMMODITY),
    offset: "0",
    "filters[commodity]": commodity,
  });

  const url = `${AGMARKNET_API}?${params.toString()}`;

  try {
    const data = await fetchWithRetry(url);
    const items: any[] = data?.records ?? [];

    return items
      .filter((item) => item.modal_price && parseFloat(item.modal_price) > 0)
      .map((item): MandiCacheRecord => ({
        state: (item.state ?? "").trim(),
        district: (item.district ?? "").trim(),
        market: (item.market ?? "").trim(),
        commodity: (item.commodity ?? commodity).trim(),
        variety: (item.variety ?? "General").trim(),
        grade: (item.grade ?? "FAQ").trim(),
        arrivalDate: (item.arrival_date ?? "").trim(),
        minPrice: parseFloat(item.min_price) || 0,
        maxPrice: parseFloat(item.max_price) || 0,
        modalPrice: parseFloat(item.modal_price) || 0,
        fetchedAt: new Date().toISOString(),
      }));
  } catch (err: any) {
    console.error(`  ✗ "${commodity}" failed: ${err.message}`);
    return [];
  }
}

// ── Main ingestion entry point ─────────────────────────────────────────────

export async function runIngestion(): Promise<void> {
  const startedAt = new Date();
  console.log(`\n🌾 [${startedAt.toISOString()}] Mandi ingestion starting (${TRACKED_COMMODITIES.length} commodities)...`);

  const apiKey = process.env.DATA_GOV_API_KEY ?? "";

  if (!apiKey || apiKey === "your_data_gov_in_api_key_here") {
    console.warn("⚠️  DATA_GOV_API_KEY not configured — skipping live ingestion. Mock data remains active.");
    return;
  }

  const allRecords: MandiCacheRecord[] = [];
  const discoveredCommodities = new Set<string>(TRACKED_COMMODITIES);
  let successCount = 0;
  let failCount = 0;

  for (const commodity of TRACKED_COMMODITIES) {
    const records = await fetchCommodityRecords(commodity, apiKey);

    if (records.length > 0) {
      allRecords.push(...records);
      records.forEach((r) => discoveredCommodities.add(r.commodity));
      successCount++;
      console.log(`  ✓ ${commodity.padEnd(40)} ${records.length} records`);
    } else {
      failCount++;
      console.log(`  ○ ${commodity.padEnd(40)} 0 records (no data today / API error)`);
    }

    await sleep(CALL_DELAY_MS); // Respect rate limits — no unbounded parallel requests
  }

  // Read previous failure count to detect consecutive failures
  const prev = readCache();
  const consecutiveFailures = allRecords.length === 0
    ? prev.consecutiveFailures + 1
    : 0;

  const newStatus = consecutiveFailures >= 3 ? "failed" : "ok";

  // Idempotent upsert — write overwrites previous records for same day's run
  writeCache({
    records: allRecords,
    lastUpdated: new Date().toISOString(),
    ingestionStatus: newStatus,
    consecutiveFailures,
  });

  // Update commodity index for frontend autocomplete
  const sortedCommodities = [...discoveredCommodities].sort((a, b) =>
    a.localeCompare(b)
  );
  writeCommodityIndex(sortedCommodities, new Date().toISOString());

  // Invalidate in-memory cache so next read picks up fresh data
  invalidateMemCache();

  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
  console.log(
    `\n✅ Ingestion done in ${elapsed}s — ${allRecords.length} records (${successCount} ok, ${failCount} empty/failed). Status: ${newStatus}\n`
  );

  if (consecutiveFailures >= 3) {
    console.error(
      `\n🔴 ═══════════════════════════════════════════════════════════════════`
    );
    console.error(
      `🔴 MANDI INGESTION ALERT: ${consecutiveFailures} consecutive failures detected!`
    );
    console.error(
      `🔴 Check DATA_GOV_API_KEY validity and https://api.data.gov.in status.`
    );
    console.error(
      `🔴 Frontend will display stale-data warning to users until sync recovers.`
    );
    console.error(
      `🔴 ═══════════════════════════════════════════════════════════════════\n`
    );
  }
}
