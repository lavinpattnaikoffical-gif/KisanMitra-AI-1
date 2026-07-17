/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MandiRatesTab — The complete Mandi Market "Live Rates" tab.
 * Replaces the old 4-state static segment in Marketplace.tsx.
 *
 * Features:
 * - CropSearchInput (debounced autocomplete against commodity API)
 * - State + district filters (reuses INDIAN_STATES constants)
 * - Skeleton loading cards
 * - Multi-variety grouping with toggle pills
 * - Empty state with exact/fallback distinction
 * - Error state (graceful, not a raw dump)
 * - LastUpdatedBadge ("Updated this morning at 6:00 AM IST")
 * - Stale data warning banner
 * - Agmarknet disclaimer footer
 *
 * Non-negotiable copy: no "live" or "real-time" language — this is daily cached data.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe, AlertTriangle, Info, RefreshCw, Layers, TrendingUp
} from "lucide-react";
import { INDIAN_STATES, UNION_TERRITORIES } from "../../utils/constants";
import { api } from "../../utils/api";
import CropSearchInput from "./CropSearchInput";
import PriceCard, { PriceRecord } from "./PriceCard";

// ── Types ──────────────────────────────────────────────────────────────────

interface MandiResponse {
  crop: string;
  state: string | null;
  district: string | null;
  records: PriceRecord[];
  lastUpdated: string;
  exactMatch: boolean;
  isStale: boolean;
  source: "Agmarknet / data.gov.in" | "mock";
  note?: string;
  totalResults: number;
}

const DEMO_MANDI_DATA: PriceRecord[] = [
  // Maharashtra
  { state: "Maharashtra", district: "Nashik", market: "Lasalgaon", commodity: "Onion", variety: "Red", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1500, maxPrice: 2200, modalPrice: 1800, fetchedAt: new Date().toISOString() },
  { state: "Maharashtra", district: "Pune", market: "Pune", commodity: "Tomato", variety: "Local", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 800, maxPrice: 1400, modalPrice: 1100, fetchedAt: new Date().toISOString() },
  { state: "Maharashtra", district: "Nagpur", market: "Nagpur", commodity: "Orange", variety: "Nagpur Mandarin", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2500, maxPrice: 4000, modalPrice: 3200, fetchedAt: new Date().toISOString() },
  { state: "Maharashtra", district: "Jalgaon", market: "Jalgaon", commodity: "Banana", variety: "Robusta", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1000, maxPrice: 1500, modalPrice: 1250, fetchedAt: new Date().toISOString() },
  // Punjab
  { state: "Punjab", district: "Amritsar", market: "Amritsar", commodity: "Wheat", variety: "147", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2100, maxPrice: 2300, modalPrice: 2250, fetchedAt: new Date().toISOString() },
  { state: "Punjab", district: "Ludhiana", market: "Ludhiana", commodity: "Paddy(Dhan)", variety: "PR 126", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2200, maxPrice: 2400, modalPrice: 2320, fetchedAt: new Date().toISOString() },
  { state: "Punjab", district: "Jalandhar", market: "Jalandhar", commodity: "Potato", variety: "Kufri Jyoti", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 800, maxPrice: 1100, modalPrice: 950, fetchedAt: new Date().toISOString() },
  // Haryana
  { state: "Haryana", district: "Karnal", market: "Karnal", commodity: "Paddy(Dhan)", variety: "Basmati", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 3200, maxPrice: 3800, modalPrice: 3500, fetchedAt: new Date().toISOString() },
  { state: "Haryana", district: "Hisar", market: "Hisar", commodity: "Cotton", variety: "BT", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 6600, maxPrice: 7100, modalPrice: 6900, fetchedAt: new Date().toISOString() },
  { state: "Haryana", district: "Rohtak", market: "Rohtak", commodity: "Wheat", variety: "HD 2967", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2125, maxPrice: 2250, modalPrice: 2150, fetchedAt: new Date().toISOString() },
  // Gujarat
  { state: "Gujarat", district: "Rajkot", market: "Rajkot", commodity: "Cotton", variety: "Shankar 6", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 6500, maxPrice: 7200, modalPrice: 6800, fetchedAt: new Date().toISOString() },
  { state: "Gujarat", district: "Junagadh", market: "Junagadh", commodity: "Groundnut", variety: "G20", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 5500, maxPrice: 6200, modalPrice: 5800, fetchedAt: new Date().toISOString() },
  { state: "Gujarat", district: "Ahmedabad", market: "Ahmedabad", commodity: "Wheat", variety: "Lokwan", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2300, maxPrice: 2600, modalPrice: 2450, fetchedAt: new Date().toISOString() },
  { state: "Gujarat", district: "Surat", market: "Surat", commodity: "Sugarcane", variety: "Co-86032", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 280, maxPrice: 350, modalPrice: 310, fetchedAt: new Date().toISOString() },
  // Madhya Pradesh
  { state: "Madhya Pradesh", district: "Indore", market: "Indore", commodity: "Soyabean", variety: "Yellow", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 4200, maxPrice: 4800, modalPrice: 4500, fetchedAt: new Date().toISOString() },
  { state: "Madhya Pradesh", district: "Ujjain", market: "Ujjain", commodity: "Wheat", variety: "Sharbati", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2800, maxPrice: 3500, modalPrice: 3100, fetchedAt: new Date().toISOString() },
  { state: "Madhya Pradesh", district: "Bhopal", market: "Bhopal", commodity: "Bengal Gram", variety: "Desi", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 5200, maxPrice: 5600, modalPrice: 5400, fetchedAt: new Date().toISOString() },
  // Uttar Pradesh
  { state: "Uttar Pradesh", district: "Agra", market: "Agra", commodity: "Potato", variety: "Desi", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1000, maxPrice: 1400, modalPrice: 1200, fetchedAt: new Date().toISOString() },
  { state: "Uttar Pradesh", district: "Kanpur", market: "Kanpur", commodity: "Wheat", variety: "Local", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2125, maxPrice: 2300, modalPrice: 2200, fetchedAt: new Date().toISOString() },
  { state: "Uttar Pradesh", district: "Lucknow", market: "Lucknow", commodity: "Mango", variety: "Dasheri", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 3000, maxPrice: 4500, modalPrice: 3800, fetchedAt: new Date().toISOString() },
  { state: "Uttar Pradesh", district: "Meerut", market: "Meerut", commodity: "Sugarcane", variety: "Co-0238", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 340, maxPrice: 370, modalPrice: 350, fetchedAt: new Date().toISOString() },
  // Telangana
  { state: "Telangana", district: "Nizamabad", market: "Nizamabad", commodity: "Turmeric", variety: "Bulb", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 6500, maxPrice: 7500, modalPrice: 7000, fetchedAt: new Date().toISOString() },
  { state: "Telangana", district: "Warangal", market: "Warangal", commodity: "Cotton", variety: "BT", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 6800, maxPrice: 7300, modalPrice: 7000, fetchedAt: new Date().toISOString() },
  { state: "Telangana", district: "Hyderabad", market: "Bowenpally", commodity: "Onion", variety: "Nasik", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1600, maxPrice: 2100, modalPrice: 1850, fetchedAt: new Date().toISOString() },
  // Karnataka
  { state: "Karnataka", district: "Bengaluru", market: "Yeshwanthpur", commodity: "Tomato", variety: "Hybrid", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 900, maxPrice: 1600, modalPrice: 1200, fetchedAt: new Date().toISOString() },
  { state: "Karnataka", district: "Mysuru", market: "Mysuru", commodity: "Silk Cocoon", variety: "Bivoltine", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 45000, maxPrice: 60000, modalPrice: 52000, fetchedAt: new Date().toISOString() },
  { state: "Karnataka", district: "Hubballi", market: "Hubballi", commodity: "Cotton", variety: "DCH 32", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 7000, maxPrice: 8000, modalPrice: 7500, fetchedAt: new Date().toISOString() },
  // Rajasthan
  { state: "Rajasthan", district: "Jaipur", market: "Jaipur", commodity: "Mustard", variety: "Black", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 4800, maxPrice: 5300, modalPrice: 5100, fetchedAt: new Date().toISOString() },
  { state: "Rajasthan", district: "Jodhpur", market: "Jodhpur", commodity: "Guar Seed", variety: "Local", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 5200, maxPrice: 5800, modalPrice: 5500, fetchedAt: new Date().toISOString() },
  { state: "Rajasthan", district: "Kota", market: "Kota", commodity: "Soyabean", variety: "Yellow", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 4100, maxPrice: 4700, modalPrice: 4400, fetchedAt: new Date().toISOString() },
  // Bihar
  { state: "Bihar", district: "Patna", market: "Patna", commodity: "Paddy(Dhan)", variety: "Sona Masuri", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2000, maxPrice: 2300, modalPrice: 2150, fetchedAt: new Date().toISOString() },
  { state: "Bihar", district: "Muzaffarpur", market: "Muzaffarpur", commodity: "Litchi", variety: "Shahi", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 4000, maxPrice: 6000, modalPrice: 5000, fetchedAt: new Date().toISOString() },
  { state: "Bihar", district: "Purnia", market: "Purnia", commodity: "Maize", variety: "Hybrid", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1800, maxPrice: 2100, modalPrice: 1950, fetchedAt: new Date().toISOString() },
  // Andhra Pradesh
  { state: "Andhra Pradesh", district: "Guntur", market: "Guntur", commodity: "Dry Chilli", variety: "Teja", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 18000, maxPrice: 22000, modalPrice: 20000, fetchedAt: new Date().toISOString() },
  { state: "Andhra Pradesh", district: "Vijayawada", market: "Vijayawada", commodity: "Mango", variety: "Banganapalli", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 3500, maxPrice: 5000, modalPrice: 4200, fetchedAt: new Date().toISOString() },
  { state: "Andhra Pradesh", district: "Kurnool", market: "Kurnool", commodity: "Onion", variety: "Local", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1400, maxPrice: 2000, modalPrice: 1700, fetchedAt: new Date().toISOString() },
  // West Bengal
  { state: "West Bengal", district: "Bardhaman", market: "Bardhaman", commodity: "Paddy(Dhan)", variety: "Swarna", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 1900, maxPrice: 2100, modalPrice: 2000, fetchedAt: new Date().toISOString() },
  { state: "West Bengal", district: "Hooghly", market: "Singur", commodity: "Potato", variety: "Jyoti", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 900, maxPrice: 1200, modalPrice: 1050, fetchedAt: new Date().toISOString() },
  { state: "West Bengal", district: "Malda", market: "Malda", commodity: "Mango", variety: "Himsagar", grade: "FAQ", arrivalDate: new Date().toLocaleDateString("en-GB"), minPrice: 2500, maxPrice: 4000, modalPrice: 3200, fetchedAt: new Date().toISOString() }
];

// ── Helpers ────────────────────────────────────────────────────────────────

function friendlyUpdatedTime(iso: string): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Updated just now";
  if (diffHours < 6) return `Updated ${diffHours}h ago`;

  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === new Date(today.getTime() - 86400000).toDateString();

  if (isToday) return `Updated today at ${timeStr} IST`;
  if (isYesterday) return `Updated yesterday at ${timeStr} IST`;
  return `Updated ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${timeStr} IST`;
}

/** Group records by variety so multi-variety crops can be toggled */
function groupByVariety(records: PriceRecord[]): Record<string, PriceRecord[]> {
  const groups: Record<string, PriceRecord[]> = {};
  for (const r of records) {
    const key = r.variety || "General";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

// ── Skeleton Card ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="material-elevated border border-border-subtle rounded-3xl p-5 shadow-sm animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-border-subtle rounded-lg w-3/4" />
          <div className="h-3 bg-border-subtle rounded-lg w-1/2" />
        </div>
        <div className="h-5 bg-border-subtle rounded-lg w-14" />
      </div>
      <div className="h-8 bg-border-subtle rounded-lg w-2/5 mb-3" />
      <div className="h-1.5 bg-border-subtle rounded-full mb-3" />
      <div className="flex justify-between">
        <div className="h-3 bg-border-subtle rounded-lg w-28" />
        <div className="h-6 bg-border-subtle rounded-lg w-16" />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface MandiRatesTabProps {
  defaultState?: string;
}

export default function MandiRatesTab({ defaultState = "" }: MandiRatesTabProps) {
  const [crop, setCrop] = useState("");
  const [selectedState, setSelectedState] = useState(defaultState);
  const [district, setDistrict] = useState("");

  const [data, setData] = useState<MandiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-variety: which variety pill is active
  const [activeVariety, setActiveVariety] = useState<string>("all");

  // Debounce guard
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrices = useCallback(
    async (cropVal: string, stateVal: string, districtVal: string) => {
      if (!cropVal.trim()) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);
      setActiveVariety("all");

      try {
        const res = await api.mandiPrices(
          cropVal,
          stateVal || undefined,
          districtVal || undefined
        );
        setData(res as MandiResponse);
      } catch (err: any) {
        setError("Unable to fetch mandi prices. Please check your connection and try again.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce on district input changes
  useEffect(() => {
    if (!crop.trim()) return;
    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(() => {
      fetchPrices(crop, selectedState, district);
    }, 400);
    return () => { if (fetchRef.current) clearTimeout(fetchRef.current); };
  }, [crop, selectedState, district, fetchPrices]);

  // Derived: variety groups
  const varietyGroups = data ? groupByVariety(data.records) : {};
  const varietyKeys = Object.keys(varietyGroups);
  const hasMultiVariety = varietyKeys.length > 1;

  const displayRecords: PriceRecord[] = !data
    ? []
    : activeVariety === "all"
    ? (data.records as PriceRecord[])
    : (varietyGroups[activeVariety] ?? []) as PriceRecord[];

  let finalDemoRecords: PriceRecord[] = [];
  if (selectedState) {
    finalDemoRecords = DEMO_MANDI_DATA.filter((r) => r.state === selectedState);
  } else {
    finalDemoRecords = DEMO_MANDI_DATA.filter((r, i) => ["Maharashtra", "Punjab", "Gujarat", "Uttar Pradesh", "Karnataka", "Telangana"].includes(r.state) && i % 3 === 0).slice(0, 6);
  }

  return (
    <div className="space-y-5">
      {/* ── Header card: Search + Filters ── */}
      <div className="material-elevated border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-signal-success" />
          <span className="text-body-sm font-bold text-content-primary">Search Mandi Prices</span>
          {data && (
            <span className="ml-auto text-micro font-bold text-content-muted">
              {friendlyUpdatedTime(data.lastUpdated)}
            </span>
          )}
        </div>

        {/* Crop search */}
        <CropSearchInput
          value={crop}
          onChange={(val) => setCrop(val)}
          className="w-full"
        />

        {/* State + District filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-micro font-bold text-content-muted uppercase tracking-widest block">
              Filter by State / UT
            </label>
            <select
              id="mandi-rates-state-filter"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full h-11 bg-surface-base text-body-sm font-bold border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
            >
              <option value="">All States / UTs</option>
              <optgroup label="States">
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
              <optgroup label="Union Territories">
                {UNION_TERRITORIES.map((ut) => (
                  <option key={ut} value={ut}>{ut}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-micro font-bold text-content-muted uppercase tracking-widest block">
              Filter by District (optional)
            </label>
            <input
              id="mandi-rates-district-input"
              type="text"
              placeholder="e.g. Nashik, Amritsar..."
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-11 bg-surface-base text-body-sm font-bold border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm placeholder-content-muted"
            />
          </div>
        </div>
      </div>

      {/* ── Stale data warning ── */}
      <AnimatePresence>
        {data?.isStale && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-signal-warning/10 border border-signal-warning/30 rounded-2xl"
          >
            <AlertTriangle size={18} className="text-signal-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm font-bold text-signal-warning">Price data may be outdated</p>
              <p className="text-caption text-content-muted font-medium mt-0.5">
                The scheduled daily sync may have failed. Prices shown are from the last successful update.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Source note (when using mock) ── */}
      <AnimatePresence>
        {data?.source === "mock" && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-surface-elevated border border-border-subtle rounded-2xl"
          >
            <Info size={18} className="text-content-muted shrink-0 mt-0.5" />
            <p className="text-caption text-content-muted font-medium leading-relaxed">
              {data.note ?? "Showing estimated prices. Live Agmarknet data will appear once configured."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fallback location notice ── */}
      <AnimatePresence>
        {data && !data.exactMatch && selectedState && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-signal-success/5 border border-signal-success/20 rounded-2xl"
          >
            <Globe size={18} className="text-signal-success shrink-0 mt-0.5" />
            <p className="text-caption text-content-muted font-medium leading-relaxed">
              No prices found for <strong className="text-content-primary">{data.crop}</strong> in{" "}
              <strong className="text-content-primary">{selectedState}</strong> today — showing nearest available markets from other states.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Multi-variety pills ── */}
      <AnimatePresence>
        {hasMultiVariety && data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Layers size={14} className="text-content-muted shrink-0" />
            <span className="text-micro font-bold text-content-muted uppercase tracking-widest">Variety:</span>
            <button
              type="button"
              onClick={() => setActiveVariety("all")}
              className={`px-3 py-1.5 text-micro font-bold rounded-xl border transition-all duration-fast cursor-pointer ${
                activeVariety === "all"
                  ? "bg-content-primary text-surface-base border-content-primary shadow-sm"
                  : "bg-surface-base text-content-muted border-border-subtle hover:border-border-strong"
              }`}
            >
              All ({data.records.length})
            </button>
            {varietyKeys.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setActiveVariety(v)}
                className={`px-3 py-1.5 text-micro font-bold rounded-xl border transition-all duration-fast cursor-pointer ${
                  activeVariety === v
                    ? "bg-content-primary text-surface-base border-content-primary shadow-sm"
                    : "bg-surface-base text-content-muted border-border-subtle hover:border-border-strong"
                }`}
              >
                {v} ({varietyGroups[v].length})
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results area ── */}
      <AnimatePresence mode="wait">
        {/* Initial state — no crop entered */}
        {!crop.trim() && !loading && (
          <motion.div
            key="empty-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-body-md font-bold text-content-primary mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-signal-success" />
                Popular Markets Today {selectedState ? `in ${selectedState}` : ""}
              </h3>
              
              {finalDemoRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {finalDemoRecords.map((record, idx) => (
                    <PriceCard key={`demo-${idx}`} record={record} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 material-elevated border border-border-subtle rounded-3xl shadow-sm">
                  <Globe size={28} className="text-content-muted mx-auto mb-3" />
                  <p className="text-body-sm font-bold text-content-primary mb-1">
                    No popular market data available
                  </p>
                  <p className="text-caption text-content-muted font-medium max-w-xs mx-auto leading-relaxed">
                    We don't have popular demo data for <strong>{selectedState}</strong>. Please use the search bar above to look up specific crops.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </motion.div>
        )}

        {/* Error state */}
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 material-elevated border border-signal-critical/20 rounded-3xl shadow-sm"
          >
            <AlertTriangle size={28} className="text-signal-critical mx-auto mb-3" />
            <p className="text-body-sm font-bold text-content-primary mb-1">Couldn't Load Prices</p>
            <p className="text-caption text-content-muted font-medium max-w-xs mx-auto leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => fetchPrices(crop, selectedState, district)}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-surface-base border border-border-subtle rounded-xl text-body-sm font-bold text-content-primary hover:border-border-strong transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </motion.div>
        )}

        {/* No results for this crop/state */}
        {!loading && !error && data && displayRecords.length === 0 && crop.trim() && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 material-elevated border border-border-subtle rounded-3xl shadow-sm"
          >
            <Globe size={28} className="text-content-muted mx-auto mb-3" />
            <p className="text-body-sm font-bold text-content-primary mb-1">
              No prices reported today
            </p>
            <p className="text-caption text-content-muted font-medium max-w-xs mx-auto leading-relaxed">
              No mandi data found for <strong>{crop}</strong>
              {selectedState ? ` in ${selectedState}` : ""}. Try a broader filter or check back tomorrow.
            </p>
          </motion.div>
        )}

        {/* Results grid */}
        {!loading && !error && displayRecords.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {displayRecords.map((record, idx) => (
              <React.Fragment key={`${record.market}-${record.variety}-${record.arrivalDate}-${idx}`}>
                <PriceCard
                  record={record as PriceRecord}
                  index={idx}
                />
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agmarknet disclaimer (non-negotiable) ── */}
      {(data || loading) && (
        <div className="flex items-start gap-2 pt-2 border-t border-border-subtle">
          <Info size={13} className="text-content-muted shrink-0 mt-0.5" />
          <p className="text-micro text-content-muted font-medium leading-relaxed">
            Prices sourced from <strong>Agmarknet / data.gov.in</strong>, updated daily — may not reflect real-time mandi conditions.
            Modal price (₹/quintal) represents the most traded price at that market on the reported date.
          </p>
        </div>
      )}
    </div>
  );
}
