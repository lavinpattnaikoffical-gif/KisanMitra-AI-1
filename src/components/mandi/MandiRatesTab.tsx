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
  Globe, AlertTriangle, Info, RefreshCw, Layers
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
            className="text-center py-16 material-elevated border border-border-subtle rounded-3xl shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Globe size={24} className="text-content-muted" />
            </div>
            <p className="text-body-md font-bold text-content-primary mb-1">Search for a Crop</p>
            <p className="text-body-sm text-content-secondary max-w-xs mx-auto leading-relaxed font-medium">
              Type a crop name above to see today's mandi prices from Agmarknet.
            </p>
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
