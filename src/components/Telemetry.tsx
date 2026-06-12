/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Droplet, 
  Thermometer, 
  Leaf, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Database, 
  TrendingUp, 
  Sliders, 
  Layers,
  Sparkles,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, FarmActivityLog, MetricItem } from "../types";
import { TRANSLATIONS, LanguageCode } from "../translations";

interface TelemetryProps {
  profile: UserProfile;
  selectedLanguage: LanguageCode;
  onNavigateTab: (tab: any) => void;
  logs: FarmActivityLog[];
  onAddLog: (log: FarmActivityLog) => void;
  metrics: MetricItem[];
  onTriggerIrrigation: (zone: string) => void;
}

export default function Telemetry({
  profile,
  selectedLanguage,
  onNavigateTab,
  logs,
  onAddLog,
  metrics,
  onTriggerIrrigation
}: TelemetryProps) {
  const t = TRANSLATIONS[selectedLanguage];

  const [activeZone, setActiveZone] = useState("Zone B");
  const [logType, setLogType] = useState<"Irrigation" | "Fertilizing" | "Spraying" | "Harvesting" | "Sowing">("Irrigation");
  const [logAmount, setLogAmount] = useState("10 Liters/emitter");
  const [logNotes, setLogNotes] = useState("");
  const [logSuccess, setLogSuccess] = useState(false);

  // Irrigation hydration valve state trigger
  const [irrigateInProg, setIrrigateInProg] = useState(false);

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAmount) return;

    const newLog: FarmActivityLog = {
      id: `log-${Date.now()}`,
      activityType: logType,
      cropName: profile.cropType,
      amount: logAmount,
      notes: logNotes || "Scheduled manual field observation run completed.",
      timestamp: new Date().toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    onAddLog(newLog);
    setLogSuccess(true);
    setLogNotes("");
    setTimeout(() => setLogSuccess(false), 3000);
  };

  const executeHydrateTrigger = () => {
    setIrrigateInProg(true);
    setTimeout(() => {
      onTriggerIrrigation(activeZone);
      setIrrigateInProg(false);
      
      // Auto commit log as a smart action!
      const autoLog: FarmActivityLog = {
        id: `log-auto-${Date.now()}`,
        activityType: "Irrigation",
        cropName: profile.cropType,
        amount: "15 Liters/min",
        notes: `Smart action triggered: Hydration executed for ${activeZone} sensor zone grid.`,
        timestamp: "Just now"
      };
      onAddLog(autoLog);
    }, 1500);
  };

  // Historic data points for structured SVGs
  const historicTelemetryData = [
    { label: "Mon", moisture: 64, temp: 29 },
    { label: "Tue", moisture: 58, temp: 31 },
    { label: "Wed", moisture: 52, temp: 32 },
    { label: "Thu", moisture: 48, temp: 30 },
    { label: "Fri", moisture: 43, temp: 33 },
    { label: "Sat", moisture: 42, temp: 34 },
    { label: "Sun (Today)", moisture: 65, temp: 28 }, // Recovered moisture due to simulation trigger!
  ];

  const currentSoilMoistureMetric = metrics.find(m => m.id === "soil-moisture")?.value || "42%";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none font-sans">
      {/* Soil telemetry line charts - 7 cols */}
      <div className="lg:col-span-7 space-y-6">
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-subtle">
            <div>
              <h2 className="text-body-md font-bold text-content-primary tracking-widest uppercase flex items-center gap-2">
                <Database size={20} className="text-signal-success" />
                IoT SENSOR METRIC TRENDS
              </h2>
              <p className="text-caption text-content-muted font-semibold mt-1">Real-time parameters plotted over 7 tracking cycles</p>
            </div>
            
            <span className="text-micro font-bold text-signal-success bg-signal-success/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
              <Zap size={14} className="animate-pulse" /> Live Feed Link
            </span>
          </div>

          {/* Interactive Line Chart utilizing pure inline SVGs (fully customized, reliable, responsive, styling-centric) */}
          <div className="bg-surface-base p-5 rounded-2xl relative select-none shadow-inner border border-border-subtle">
            <h4 className="text-body-sm font-bold text-content-primary mb-5">Soil Moisture % vs Ambient Weather temp (°C)</h4>

            <div className="relative h-44 w-full select-none" aria-hidden="true">
              {/* SVG representation with plotted circles & indicators */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* Grid backdrop */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="#8E8E93" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.2" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#8E8E93" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.2" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#8E8E93" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.2" />

                {/* Plotting points - line 1 (Moisture %) */}
                {/* Values: mon:64, tue:58, wed:52, thu:48, fri:43, sat:42, sun:65. Mapping Y to: 120 - val */}
                <path
                  d="M 10 56 Q 73 62 136 68 T 262 77 T 325 78 T 390 55"
                  fill="none"
                  stroke="var(--color-signal-success)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                
                {/* Dots along paths */}
                <circle cx="10" cy="56" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="73" cy="62" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="136" cy="68" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="199" cy="72" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="262" cy="77" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="325" cy="78" r="3.5" fill="var(--color-signal-critical)" className="animate-ping" />
                <circle cx="10" cy="56" r="3.5" fill="var(--color-signal-success)" />
                <circle cx="390" cy="55" r="4.5" fill="var(--color-signal-success)" />

                {/* Line 2 (Temperature °C) */}
                {/* Values: mon:29, tue:31, wed:32, thu:30, fri:33, sat:34, sun:28. Mapping Y to: 120 - val*2 */}
                <path
                  d="M 10 62 L 73 58 L 136 56 L 199 60 L 262 54 L 325 52 L 390 64"
                  fill="none"
                  stroke="var(--color-signal-warning)"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              </svg>

              {/* Day Labels positioned horizontally */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[9px] font-bold text-content-muted font-mono tracking-widest">
                <span>MON (64%)</span>
                <span>WED (52%)</span>
                <span>FRI (43%)</span>
                <span>SAT (42%)</span>
                <span>TODAY ({currentSoilMoistureMetric})</span>
              </div>
            </div>

            {/* Custom interactive tooltip simulation mapping current status */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-micro font-medium">
              <span className="text-content-muted flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-signal-success shadow-sm" /> Soil Moisture % (Ideal: 50% - 70%)
              </span>
              <span className="text-content-muted flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-dashed border-signal-warning" /> Temperature °C (Ideal: 25 - 32°C)
              </span>
            </div>
          </div>
        </section>

        {/* Dynamic Zone Boundaries breakdown */}
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <h3 className="text-micro font-bold text-content-muted uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle pb-3">{t.activeZones}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "Zone A", label: "Zone A - North (Tomato)", value: "68% - Good", status: "success" },
              { id: "Zone B", label: "Zone B - Core (Cotton)", value: `${currentSoilMoistureMetric} - Dry Alert`, status: currentSoilMoistureMetric === "65%" ? "success" : "danger" },
              { id: "Zone C", label: "Zone C - South (Sowing)", value: "54% - Stable", status: "neutral" },
            ].map((zone) => (
              <motion.div
                key={zone.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveZone(zone.id)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-colors shadow-sm ${
                  activeZone === zone.id
                    ? "bg-signal-success/10 border-signal-success"
                    : "bg-surface-base border-border-subtle hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-sm font-bold text-content-primary">{zone.id}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    zone.status === "success" ? "bg-signal-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    zone.status === "danger" ? "bg-signal-critical animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-signal-info shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                  }`} />
                </div>
                <p className="text-caption text-content-muted truncate mt-1.5">{zone.label}</p>
                <p className={`text-body-sm font-bold mt-1.5 font-mono ${
                  zone.status === "danger" ? "text-signal-critical" : "text-content-primary"
                }`}>
                  {zone.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Interactive Hydrator trigger action specific to selected zone */}
          <div className="bg-surface-base p-5 rounded-2xl border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner mt-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-micro font-bold text-signal-warning bg-signal-warning/10 px-2.5 py-1 rounded-md uppercase tracking-widest block mb-2 max-w-max mx-auto sm:mx-0">SMART IRRIGATION SYSTEM</span>
              <p className="text-body-sm font-bold text-content-primary">Control active valves for {activeZone}</p>
              <p className="text-caption text-content-muted font-medium mt-1">WebUSB communication link matches real moisture telemetry parameters</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="telemetry-valve-btn"
              disabled={irrigateInProg}
              onClick={executeHydrateTrigger}
              className={`h-12 px-6 rounded-xl font-bold text-body-sm text-surface-base transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 w-full sm:w-auto mt-2 sm:mt-0 ${
                activeZone === "Zone B" && currentSoilMoistureMetric !== "65%"
                  ? "bg-signal-success hover:bg-signal-success/80 animate-pulse"
                  : "bg-content-muted hover:bg-content-primary"
              }`}
            >
              {irrigateInProg ? (
                <>
                  <span className="w-4 h-4 border-2 border-surface-base border-t-transparent rounded-full animate-spin" />
                  <span>Activating Solenite Valve...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Execute hydration for {activeZone}</span>
                </>
              )}
            </motion.button>
          </div>
        </section>
      </div>

      {/* Manual activity Logger Form - 5 cols */}
      <div className="lg:col-span-5 space-y-6">
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="border-b border-border-subtle pb-4 flex items-center justify-between">
            <h3 className="text-body-md font-bold text-content-primary tracking-widest uppercase flex items-center gap-2">
              <PlusCircle size={20} className="text-signal-success" />
              {t.recentActivities}
            </h3>
            
            <span className="text-micro font-bold text-content-muted bg-surface-base border border-border-subtle px-2.5 py-1 rounded-md">LOG WORK</span>
          </div>

          <form onSubmit={handleCreateLog} className="space-y-5">
            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block mb-1" htmlFor="activity-type-select">{t.activityType}</label>
              <select
                id="activity-type-select"
                value={logType}
                onChange={(e: any) => {
                  const s = e.target.value;
                  setLogType(s);
                  // Provide sensible smart defaults to save clicking time
                  if (s === "Irrigation") setLogAmount("10 Liters/emitter");
                  else if (s === "Fertilizing") setLogAmount("2.5 kg organic NPK");
                  else if (s === "Spraying") setLogAmount("500ml Neem spray");
                  else if (s === "Harvesting") setLogAmount("12 Quintals total cargo");
                  else if (s === "Sowing") setLogAmount("2kg seeds");
                }}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:border-signal-success focus:ring-1 focus:ring-signal-success transition-all cursor-pointer"
              >
                <option value="Irrigation">Irrigation / सिंचाई</option>
                <option value="Fertilizing">Fertilizing / खत व्यवस्थापन</option>
                <option value="Spraying">Spraying / छिड़काव</option>
                <option value="Harvesting">Harvesting / कटाई</option>
                <option value="Sowing">Sowing / बुवाई</option>
              </select>
            </div>

            {/* Amount / Weight text */}
            <div className="space-y-1">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block mb-1" htmlFor="amount-input">Resource Volume / Dosage</label>
              <input
                id="amount-input"
                type="text"
                required
                placeholder="e.g. 500ml or 2 kg"
                value={logAmount}
                onChange={(e) => setLogAmount(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:border-signal-success focus:ring-1 focus:ring-signal-success transition-all placeholder:text-content-muted"
              />
            </div>

            {/* Detailed notes */}
            <div className="space-y-1">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block mb-1" htmlFor="notes-textarea">Observation Notes</label>
              <textarea
                id="notes-textarea"
                placeholder={t.notesPlaceholder}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={3}
                className="w-full bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl p-4 focus:outline-none focus:border-signal-success focus:ring-1 focus:ring-signal-success resize-none transition-all placeholder:text-content-muted"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="add-log-btn"
              type="submit"
              className="w-full h-12 bg-content-primary hover:opacity-90 text-surface-base font-bold text-body-sm rounded-xl transition-opacity cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <PlusCircle size={16} />
              <span>{t.addLog}</span>
            </motion.button>
          </form>

          {logSuccess && (
            <div className="text-center p-3 bg-signal-success/10 rounded-xl border border-signal-success/20">
              <p className="text-body-sm text-signal-success font-bold">✓ Log registered to offline SQLite sync database.</p>
            </div>
          )}
        </section>

        {/* List historic items committed */}
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-micro font-bold text-content-muted tracking-widest uppercase mb-2">{t.historyLogs}</h3>

          <div className="space-y-3 max-h-[260px] overflow-y-auto no-scrollbar">
            {logs.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center mb-3 shadow-sm">
                  <FileText className="text-content-muted" size={24} />
                </div>
                <p className="text-body-md font-bold text-content-primary mb-1">No Recent Activities</p>
                <p className="text-caption text-content-secondary max-w-xs mx-auto leading-relaxed">Log your farming actions above to build a historical timeline.</p>
              </div>
            ) : (
              logs.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-surface-base border-l-4 border-signal-success rounded-xl text-left shadow-sm border-y border-r border-border-subtle hover:border-border-strong transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2">
                    <span className="text-body-sm font-bold text-content-primary uppercase tracking-widest">
                      {item.activityType}
                    </span>
                    <span className="text-caption text-content-muted font-bold font-mono">{item.timestamp}</span>
                  </div>
                  <p className="text-body-sm font-bold text-content-primary mt-2">Cargo Dosage: <span className="font-mono text-signal-success">{item.amount}</span></p>
                  <p className="text-caption text-content-muted font-medium leading-relaxed mt-1">{item.notes}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
