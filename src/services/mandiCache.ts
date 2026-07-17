/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * mandiCache.ts — File-backed + in-memory cache for Agmarknet price records.
 * Works on both Windows dev (process.cwd()/tmp/) and Linux EC2 (/tmp inside project dir).
 * This file is only executed in Node.js context (server.ts / cron) — never in the browser.
 */

import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "tmp");
const CACHE_FILE = path.join(CACHE_DIR, "mandi-cache.json");
const COMMODITY_INDEX_FILE = path.join(CACHE_DIR, "commodity-index.json");

// ── Types ──────────────────────────────────────────────────────────────────

export interface MandiCacheRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string;  // "dd/mm/yyyy" from Agmarknet
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  fetchedAt: string;    // ISO timestamp
}

export interface MandiCacheStore {
  records: MandiCacheRecord[];
  lastUpdated: string;         // ISO timestamp of last successful ingestion
  ingestionStatus: "ok" | "failed" | "never";
  consecutiveFailures: number;
}

export interface CommodityIndex {
  commodities: string[];
  updatedAt: string;
}

export interface QueryResult {
  records: MandiCacheRecord[];
  exactMatch: boolean;
  lastUpdated: string;
  ingestionStatus: "ok" | "failed" | "never";
  isStale: boolean;
}

// ── In-memory layer ────────────────────────────────────────────────────────

const MEM_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let _memCache: MandiCacheStore | null = null;
let _memCacheLoadedAt = 0;

// ── File helpers ───────────────────────────────────────────────────────────

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function atomicWrite(filePath: string, data: object): void {
  ensureCacheDir();
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

// ── Public: Main cache ─────────────────────────────────────────────────────

export function readCache(): MandiCacheStore {
  const now = Date.now();

  // Serve from in-memory if still fresh
  if (_memCache && now - _memCacheLoadedAt < MEM_CACHE_TTL_MS) {
    return _memCache;
  }

  ensureCacheDir();

  if (!fs.existsSync(CACHE_FILE)) {
    return { records: [], lastUpdated: "", ingestionStatus: "never", consecutiveFailures: 0 };
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    _memCache = JSON.parse(raw) as MandiCacheStore;
    _memCacheLoadedAt = now;
    return _memCache;
  } catch {
    return { records: [], lastUpdated: "", ingestionStatus: "never", consecutiveFailures: 0 };
  }
}

export function writeCache(store: MandiCacheStore): void {
  atomicWrite(CACHE_FILE, store);
  // Refresh in-memory
  _memCache = store;
  _memCacheLoadedAt = Date.now();
}

export function invalidateMemCache(): void {
  _memCache = null;
  _memCacheLoadedAt = 0;
}

// ── Public: Commodity Index ────────────────────────────────────────────────

export function readCommodityIndex(): CommodityIndex {
  ensureCacheDir();
  if (!fs.existsSync(COMMODITY_INDEX_FILE)) {
    return { commodities: [], updatedAt: "" };
  }
  try {
    const raw = fs.readFileSync(COMMODITY_INDEX_FILE, "utf-8");
    return JSON.parse(raw) as CommodityIndex;
  } catch {
    return { commodities: [], updatedAt: "" };
  }
}

export function writeCommodityIndex(commodities: string[], updatedAt: string): void {
  atomicWrite(COMMODITY_INDEX_FILE, { commodities, updatedAt });
}

// ── Public: Query ──────────────────────────────────────────────────────────

/**
 * Query records from cache.
 * Priority: exact commodity+state+district → exact commodity+state → all commodity
 * If state is given but no records exist for it, exactMatch = false and we return
 * all records for that commodity from any state (nearest-available fallback).
 */
export function getRecords(
  commodity: string,
  state?: string,
  district?: string
): QueryResult {
  const cache = readCache();
  const commodityNorm = commodity.trim().toLowerCase();

  // Check staleness: if last update was > 26 hours ago, flag as stale
  const lastUpdatedMs = cache.lastUpdated ? new Date(cache.lastUpdated).getTime() : 0;
  const isStale = !cache.lastUpdated || Date.now() - lastUpdatedMs > 26 * 60 * 60 * 1000;

  // Filter by commodity (case-insensitive)
  let matched = cache.records.filter(
    (r) => r.commodity.toLowerCase() === commodityNorm
  );

  const base: Omit<QueryResult, "records" | "exactMatch"> = {
    lastUpdated: cache.lastUpdated,
    ingestionStatus: cache.ingestionStatus,
    isStale,
  };

  if (!state || matched.length === 0) {
    // Sort by arrivalDate desc
    return { ...base, records: sortByDate(matched), exactMatch: !state };
  }

  // Filter by state
  const stateNorm = state.trim().toLowerCase();
  const stateMatched = matched.filter((r) => r.state.toLowerCase() === stateNorm);

  if (stateMatched.length === 0) {
    // Fallback: no data for this state → return all-state results
    return { ...base, records: sortByDate(matched), exactMatch: false };
  }

  // Optionally filter by district
  if (district) {
    const districtNorm = district.trim().toLowerCase();
    const districtMatched = stateMatched.filter((r) =>
      r.district.toLowerCase().includes(districtNorm)
    );
    if (districtMatched.length > 0) {
      return { ...base, records: sortByDate(districtMatched), exactMatch: true };
    }
  }

  return { ...base, records: sortByDate(stateMatched), exactMatch: true };
}

function sortByDate(records: MandiCacheRecord[]): MandiCacheRecord[] {
  return [...records].sort((a, b) => {
    // arrivalDate is "dd/mm/yyyy" — convert for comparison
    const parse = (d: string) => {
      const [day, month, year] = d.split("/");
      return new Date(`${year}-${month}-${day}`).getTime();
    };
    return parse(b.arrivalDate) - parse(a.arrivalDate);
  });
}
