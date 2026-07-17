/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CropSearchInput — Debounced autocomplete against /api/mandi-prices/commodities.
 * Normalizes user input to a valid Agmarknet commodity string before the parent
 * triggers a price query. Shows recent searches as quick-select chips.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X } from "lucide-react";
import { api } from "../../utils/api";

interface CropSearchInputProps {
  value: string;
  onChange: (crop: string) => void;
  placeholder?: string;
  className?: string;
}

const RECENT_KEY = "kisan_recent_crops";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(crop: string): void {
  const prev = loadRecent().filter((c) => c !== crop);
  localStorage.setItem(RECENT_KEY, JSON.stringify([crop, ...prev].slice(0, MAX_RECENT)));
}

export default function CropSearchInput({
  value,
  onChange,
  placeholder = "Search crop e.g. Tomato, Onion...",
  className = "",
}: CropSearchInputProps) {
  const [inputText, setInputText] = useState(value);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [loadingCommodities, setLoadingCommodities] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch commodity index once on mount
  useEffect(() => {
    setLoadingCommodities(true);
    api.mandiCommodities()
      .then((res) => {
        if (res?.commodities) setCommodities(res.commodities);
      })
      .catch(() => {})
      .finally(() => setLoadingCommodities(false));
  }, []);

  // Sync external value → internal text
  useEffect(() => {
    setInputText(value);
  }, [value]);

  // Debounced filter
  const filterSuggestions = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const norm = text.trim().toLowerCase();
        if (!norm) {
          setSuggestions([]);
          return;
        }
        setSuggestions(
          commodities
            .filter((c) => c.toLowerCase().includes(norm))
            .slice(0, 8)
        );
      }, 280);
    },
    [commodities]
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    filterSuggestions(text);
    setOpen(true);
    // If user clears, propagate immediately
    if (!text.trim()) onChange("");
  };

  const selectCrop = (crop: string) => {
    setInputText(crop);
    setSuggestions([]);
    setOpen(false);
    saveRecent(crop);
    setRecent(loadRecent());
    onChange(crop);
  };

  const clearInput = () => {
    setInputText("");
    setSuggestions([]);
    setOpen(false);
    onChange("");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && (suggestions.length > 0 || (recent.length > 0 && !inputText.trim()));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative flex items-center">
        <Search
          size={18}
          className="absolute left-4 text-content-muted pointer-events-none shrink-0"
        />
        <input
          id="crop-search-input"
          type="text"
          autoComplete="off"
          value={inputText}
          placeholder={loadingCommodities ? "Loading crops..." : placeholder}
          disabled={loadingCommodities}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          className="w-full h-12 bg-surface-base text-body-sm font-bold text-content-primary border border-border-subtle rounded-2xl pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-all duration-normal placeholder-content-muted disabled:opacity-60"
        />
        {inputText && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 text-content-muted hover:text-content-primary transition-colors cursor-pointer"
            aria-label="Clear crop search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-surface-elevated border border-border-subtle rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {/* Recent searches */}
          {!inputText.trim() && recent.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-micro font-bold text-content-muted uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Recent
              </p>
              {recent.map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectCrop(crop); }}
                  className="w-full px-4 py-2.5 text-left text-body-sm font-semibold text-content-primary hover:bg-surface-base transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Clock size={14} className="text-content-muted shrink-0" />
                  {crop}
                </button>
              ))}
              <div className="border-t border-border-subtle mx-3 my-1" />
            </div>
          )}

          {/* Filtered suggestions */}
          {suggestions.map((crop) => (
            <button
              key={crop}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectCrop(crop); }}
              className="w-full px-4 py-2.5 text-left text-body-sm font-semibold text-content-primary hover:bg-surface-base transition-colors cursor-pointer"
            >
              {/* Highlight matching text */}
              {highlightMatch(crop, inputText)}
            </button>
          ))}

          {inputText.trim() && suggestions.length === 0 && (
            <div className="px-4 py-4 text-body-sm text-content-muted font-medium text-center">
              No matching crop found. Try a different name.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Highlight the matching substring in bold */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-signal-success">{text.slice(idx, idx + query.trim().length)}</strong>
      {text.slice(idx + query.trim().length)}
    </>
  );
}
