/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PriceCard — Displays a single Agmarknet mandi price record.
 * Shows market, district, min/modal/max price (₹/quintal), arrival date,
 * variety + grade badges, and a copy-price button.
 */

import React, { useState } from "react";
import { MapPin, Calendar, Copy, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "motion/react";

export interface PriceRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  fetchedAt: string;
}

interface PriceCardProps extends React.Attributes {
  record: PriceRecord;
  index?: number;
}

function formatDate(ddmmyyyy: string): string {
  if (!ddmmyyyy) return "—";
  const [day, month, year] = ddmmyyyy.split("/");
  if (!day || !month || !year) return ddmmyyyy;
  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function priceSpreadPercent(min: number, max: number): number {
  if (!min || !max || max === min) return 0;
  return Math.round(((max - min) / min) * 100);
}

export default function PriceCard({ record, index = 0 }: PriceCardProps) {
  const [copied, setCopied] = useState(false);

  const spread = priceSpreadPercent(record.minPrice, record.maxPrice);
  const spreadLabel =
    spread > 15 ? "High spread" : spread > 7 ? "Moderate spread" : "Stable";
  const spreadColor =
    spread > 15 ? "text-signal-critical" : spread > 7 ? "text-signal-warning" : "text-signal-success";

  const TrendIcon = spread > 15 ? TrendingDown : spread > 7 ? Minus : TrendingUp;

  const handleCopy = () => {
    const text = `${record.commodity} @ ${record.market} Mandi (${record.district}, ${record.state}): ₹${record.modalPrice}/qtl | ${formatDate(record.arrivalDate)} — KisanMitra AI`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      className="material-elevated border border-border-subtle rounded-3xl p-5 shadow-sm hover:border-signal-success/30 transition-all duration-normal group relative overflow-hidden"
    >
      {/* Top row: Market + location */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-body-sm font-bold text-content-primary truncate leading-snug">
            {record.market || record.district} Mandi
          </h4>
          <div className="flex items-center gap-1.5 mt-1 text-micro font-semibold text-content-muted">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{record.district}, {record.state}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {record.variety && record.variety !== "General" && (
            <span className="text-micro font-bold px-2 py-0.5 rounded-md bg-surface-base border border-border-subtle text-content-muted uppercase tracking-wide">
              {record.variety}
            </span>
          )}
          <span className="text-micro font-bold px-2 py-0.5 rounded-md bg-signal-success/10 text-signal-success uppercase tracking-wide">
            {record.grade}-Grade
          </span>
        </div>
      </div>

      {/* Price display */}
      <div className="space-y-3">
        {/* Modal price (most important) */}
        <div className="flex items-baseline gap-2">
          <span className="text-h3 font-bold font-mono text-content-primary tracking-tight">
            ₹{record.modalPrice.toLocaleString("en-IN")}
          </span>
          <span className="text-body-sm font-semibold text-content-muted">/quintal</span>
          <span className={`ml-auto flex items-center gap-1 text-micro font-bold ${spreadColor}`}>
            <TrendIcon size={13} />
            {spreadLabel}
          </span>
        </div>

        {/* Min / Max bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-micro font-semibold text-content-muted mb-1">
              <span>Min ₹{record.minPrice.toLocaleString("en-IN")}</span>
              <span>Max ₹{record.maxPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-1.5 bg-surface-base rounded-full border border-border-subtle overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-signal-warning to-signal-success rounded-full"
                style={{
                  width: record.maxPrice
                    ? `${Math.round(((record.modalPrice - record.minPrice) / (record.maxPrice - record.minPrice)) * 100)}%`
                    : "50%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Arrival date + copy */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-micro font-semibold text-content-muted">
            <Calendar size={12} className="shrink-0" />
            <span>{formatDate(record.arrivalDate)}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            type="button"
            id={`copy-price-btn-${record.market}-${record.commodity}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-micro font-bold border border-border-subtle bg-surface-base hover:border-signal-success/50 hover:text-signal-success text-content-muted transition-all duration-fast cursor-pointer shadow-sm"
            title="Copy price to clipboard"
          >
            {copied ? (
              <>
                <Check size={12} className="text-signal-success" />
                <span className="text-signal-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Subtle hover accent */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-signal-success/0 group-hover:ring-signal-success/20 transition-all duration-normal pointer-events-none" />
    </motion.div>
  );
}
