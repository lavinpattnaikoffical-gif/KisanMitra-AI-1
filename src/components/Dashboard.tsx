/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Droplet, 
  Thermometer, 
  Leaf, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LivingSurface from "./LivingSurface";
import { UserProfile, MetricItem, InboxAlert } from "../types";
import { TRANSLATIONS, LanguageCode } from "../translations";

interface DashboardProps {
  profile: UserProfile;
  selectedLanguage: LanguageCode;
  onNavigateTab: (tab: any) => void;
  metrics: MetricItem[];
  alertList: InboxAlert[];
  onDismissAlert: (id: string) => void;
  onTriggerIrrigation: (zone: string) => void;
  onAddPriorityLog: (activityType: string, amount: string, notes: string) => void;
}

export default function Dashboard({
  profile,
  selectedLanguage,
  onNavigateTab,
  metrics,
  alertList,
  onDismissAlert,
  onTriggerIrrigation,
  onAddPriorityLog
}: DashboardProps) {
  const t = TRANSLATIONS[selectedLanguage];

  const [feedMode, setFeedMode] = useState<"IoT Sensor" | "Manual Log" | "Satellite Estimate">("IoT Sensor");
  const [irrigationLoading, setIrrigationLoading] = useState<string | null>(null);

  // Filter metrics based on feed mode selected
  const activeMetrics = metrics.map(m => ({
    ...m,
    value: feedMode === "Manual Log" 
      ? (m.id === "soil-moisture" ? "48%" : m.id === "soil-temp" ? "28°C" : "80%") 
      : feedMode === "Satellite Estimate"
      ? (m.id === "soil-moisture" ? "44%" : m.id === "soil-temp" ? "33°C" : "86%")
      : m.value, // IoT Live
    sourceType: feedMode
  }));

  // Simple checks list state for daily priorities
  const [tasks, setTasks] = useState([
    { id: "task-1", text: "Apply organic NPK fertilizer before 10:00 AM", done: false },
    { id: "task-2", text: "Check drip irrigation lines in East boundary section", done: false },
    { id: "task-3", text: "Inspect lower foliage for mildew signs due to high night humidity", done: false },
  ]);

  const handleTaskToggle = (id: string, text: string) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, done: !task.done } : task));
    // Commit a log automatically when a task is completed as a helpful smart tool
    const task = tasks.find(tk => tk.id === id);
    if (task && !task.done) {
      onAddPriorityLog("Fertilizing", "Standard dosage", `Completed task: ${text}`);
    }
  };

  const handleTriggerAction = (alert: InboxAlert) => {
    if (alert.actionKey === "triggerIrr") {
      setIrrigationLoading(alert.id);
      setTimeout(() => {
        onTriggerIrrigation("Zone B");
        onDismissAlert(alert.id);
        setIrrigationLoading(null);
      }, 1800);
    } else if (alert.tabTarget) {
      onNavigateTab(alert.tabTarget);
    }
  };

  // Weather mapping enhancement
  const weatherMap: Record<string, { temp: string, condition: string, relative: string, icon: string, wind: string, gradient: string, recommendation: string }> = {
    "Maharashtra": { temp: "34°C", condition: "Warm & Mostly Sunny", relative: "Low rain chance today", icon: "☀️", wind: "14 km/h", gradient: "from-amber-500/10 to-transparent border-amber-500/20", recommendation: "Optimal spraying conditions today. Avoid peak noon." },
    "Punjab": { temp: "31°C", condition: "Sunny & Air Quality PM2.5 Moderate", relative: "Dust suspension in West", icon: "🌤️", wind: "9 km/h", gradient: "from-yellow-500/10 to-transparent border-yellow-500/20", recommendation: "Monitor leaf dust accumulation. Wash foliage if necessary." },
    "Gujarat": { temp: "35°C", condition: "High Heat Index Alert", relative: "Avoid spraying during peak noon", icon: "🌡️", wind: "16 km/h", gradient: "from-red-500/10 to-transparent border-red-500/20", recommendation: "Ensure adequate root hydration. Suspend mid-day field work." },
    "Karnataka": { temp: "29°C", condition: "Humid & Light Showers Expected", relative: "80% cloud density", icon: "🌦️", wind: "12 km/h", gradient: "from-blue-500/10 to-transparent border-blue-500/20", recommendation: "High humidity increases fungal risk tonight. Inspect lower leaves tomorrow morning." }
  };

  const localStateWeather = weatherMap[profile.state] || weatherMap["Maharashtra"];
  const [showHealthDetails, setShowHealthDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. RAMU DAILY BRIEF */}
      <LivingSurface tier="premium" as="section" className="material-glass edge-lighting rounded-3xl p-6 border-border-subtle">
        <h2 className="text-micro font-bold text-content-muted tracking-widest uppercase mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-signal-success" /> RAMU Daily Brief
        </h2>
        <div className="space-y-4">
          <h1 className="text-[2.5rem] leading-tight font-bold text-content-primary tracking-tight">Good Morning {profile.name}</h1>
          <div className="space-y-2">
            <p className="text-body-md text-content-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-content-muted" /> Today your farm health is 87/100.
            </p>
            <p className="text-body-md text-content-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-content-muted" /> {localStateWeather.condition}.
            </p>
            <p className="text-body-md text-content-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-critical" /> Cotton pest activity is elevated in Zone B.
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-border-subtle">
            <h3 className="text-caption font-bold text-content-primary uppercase tracking-widest mb-1">Recommended Action</h3>
            <p className="text-body-md font-medium text-signal-warning">Inspect Zone B before noon.</p>
          </div>
        </div>
      </LivingSurface>

      {/* 2. URGENT ACTIONS (Hides entirely when empty) */}
      <AnimatePresence>
        {alertList.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="overflow-hidden">
              <LivingSurface tier="premium" className="material-elevated rounded-3xl p-6 border border-border-subtle mb-6">
                <div className="flex items-center justify-between mb-5 border-b border-border-subtle pb-4">
                  <div>
                  <h2 className="text-body-sm font-bold text-content-primary tracking-widest uppercase flex items-center gap-2">
                    <AlertTriangle size={18} className="text-signal-warning" />
                    {t.urgentAlerts}
                  </h2>
                </div>
                <span className="text-micro font-bold px-3 py-1 bg-signal-critical/10 text-signal-critical rounded-full uppercase tracking-wider">
                  {alertList.length} Action{alertList.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-3">
                {alertList.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors duration-fast ${
                      alert.severity === "high"
                        ? "bg-red-500/10 hover:bg-red-500/15"
                        : "bg-amber-500/10 hover:bg-amber-500/15"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shadow-sm ${alert.severity === "high" ? "bg-signal-critical animate-pulse" : "bg-signal-warning"}`} />
                        <h3 className="text-body-md font-bold text-content-primary tracking-tight">
                          {alert.titleKey === "moistureAlertTitle" ? "Critical: Zone B Soil Moisture 42%" : alert.titleKey === "pestAdvisorTitle" ? "Seasonal Alert: Cotton Pest Cycle" : alert.titleKey}
                        </h3>
                      </div>
                      <p className="text-body-sm text-content-secondary font-medium leading-relaxed">
                        {alert.descKey === "moistureAlertDesc" ? "Moisture fell below the critical 45% threshold. Ensure drip systems are initiated immediately." : alert.descKey === "pestAdvisorDesc" ? "Nashik district forecast shows elevated risk of early cotton spot infestation due to night cooling parameters." : alert.descKey}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 mt-2 sm:mt-0">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onDismissAlert(alert.id)}
                        className="text-body-sm font-bold text-content-muted hover:text-content-primary px-4 py-2 bg-transparent rounded-xl transition-colors cursor-pointer"
                      >
                        Ignore
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={irrigationLoading === alert.id}
                        onClick={() => handleTriggerAction(alert)}
                        className={`text-body-sm font-bold px-5 py-2.5 rounded-xl text-surface-base transition-opacity shadow-md flex items-center gap-2 cursor-pointer hover:opacity-90 ${
                          alert.severity === "high" ? "bg-signal-critical" : "bg-content-primary"
                        }`}
                      >
                        {irrigationLoading === alert.id ? (
                          <>
                            <span className="w-4 h-4 border-2 border-surface-base border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Executing...</span>
                          </>
                        ) : (
                          <span>{t[alert.actionKey] || alert.actionKey}</span>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                </div>
              </LivingSurface>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 3. FARM HEALTH SCORE */}
      <LivingSurface tier="lite" as="section" onClick={() => setShowHealthDetails(!showHealthDetails)} className="material-elevated rounded-3xl p-6 border border-border-subtle cursor-pointer hover:border-border-strong transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-micro font-bold text-content-muted tracking-widest uppercase flex items-center gap-2">
              <Leaf size={16} className="text-signal-success" /> Farm Health Score
            </h2>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-[4.5rem] leading-none font-bold tracking-tighter text-content-primary">87</span>
              <span className="text-[2rem] font-bold text-content-muted">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-4 py-2 rounded-full bg-signal-success/10 text-signal-success font-bold text-body-sm tracking-wide">
              Healthy
            </span>
          </div>
        </div>
        
        <AnimatePresence>
          {showHealthDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-4 border-t border-border-subtle space-y-3">
                <p className="text-caption font-bold text-content-muted uppercase tracking-widest mb-2">Health Contributors</p>
                <div className="flex justify-between text-body-sm font-medium">
                  <span className="text-content-secondary">Crop Vitality</span>
                  <span className="text-signal-success">+18</span>
                </div>
                <div className="flex justify-between text-body-sm font-medium">
                  <span className="text-content-secondary">Weather Conditions</span>
                  <span className="text-signal-success">+22</span>
                </div>
                <div className="flex justify-between text-body-sm font-medium">
                  <span className="text-content-secondary">Soil Moisture</span>
                  <span className="text-signal-critical">-8</span>
                </div>
                <div className="flex justify-between text-body-sm font-medium">
                  <span className="text-content-secondary">Pest Risk</span>
                  <span className="text-signal-critical">-5</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LivingSurface>

      {/* 4. WEATHER INTELLIGENCE - Crown Jewel */}
      <LivingSurface tier="premium" as="section" className="material-glass edge-lighting rounded-3xl p-6 transition-colors overflow-hidden relative group">
        {/* Atmospheric depth layer with calm motion */}
        <motion.div 
          className={`absolute inset-0 z-0 bg-gradient-to-br ${localStateWeather.gradient}`}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <motion.span 
              className="text-6xl drop-shadow-sm shrink-0" 
              role="img" aria-label="weather-icon"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              {localStateWeather.icon}
            </motion.span>
            <div>
              <p className="text-body-md font-bold text-content-secondary mb-1">
                {profile.district}, {profile.state}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-[4rem] leading-none font-bold text-content-primary tracking-tighter">{localStateWeather.temp}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 sm:ml-8 border-l-0 sm:border-l border-t sm:border-t-0 border-border-strong pt-4 sm:pt-0 sm:pl-8">
            <h3 className="text-caption font-bold text-content-primary uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" /> RAMU Insight
            </h3>
            <p className="text-body-sm text-content-secondary leading-relaxed font-medium">
              {localStateWeather.recommendation}
            </p>
          </div>
        </div>
      </LivingSurface>

      {/* 🧱 Unified Soil & Crop Analytics Metrics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-caption font-bold text-content-secondary tracking-widest uppercase flex items-center gap-2 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-success" /> {t.sourceSelector}
          </h2>
          {/* Feed Switch Selector */}
          <div className="flex bg-surface-elevated rounded-full p-1 border border-border-subtle shadow-inner">
            {["IoT Sensor", "Manual Log", "Satellite Estimate"].map((mode) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id={`feed-btn-${mode.replace(/\s+/g, "")}`}
                onClick={() => setFeedMode(mode as any)}
                className={`px-4 py-1.5 text-caption font-bold rounded-full transition-colors cursor-pointer ${
                  feedMode === mode
                    ? "bg-content-primary text-surface-base shadow-sm"
                    : "text-content-muted hover:text-content-primary"
                }`}
              >
                {mode === "IoT Sensor" ? "IoT Grid" : mode === "Manual Log" ? "Manual" : "Satellite"}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {activeMetrics.map((card) => (
            <LivingSurface
              tier="lite"
              key={card.id}
              className="material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm relative flex flex-col justify-between hover:border-border-strong hover:shadow-md transition-all duration-normal group h-full"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-caption font-bold text-content-secondary">
                    {card.id === "soil-moisture" && <Droplet size={16} className="text-blue-500" />}
                    {card.id === "soil-temp" && <Thermometer size={16} className="text-orange-500" />}
                    {card.id === "crop-vitality" && <Leaf size={16} className="text-signal-success" />}
                    <span className="uppercase tracking-widest">{t[card.id === "soil-moisture" ? "soilMoisture" : card.id === "soil-temp" ? "soilTemp" : "cropVitality"]}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    card.sourceType === "IoT Sensor"
                      ? "bg-signal-success/10 text-signal-success"
                      : card.sourceType === "Manual Log"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {card.sourceType === "IoT Sensor" ? "IoT Live" : card.sourceType === "Manual Log" ? "Manual" : "Satellite"}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-[3.5rem] leading-none font-bold font-mono text-content-primary tracking-tighter">{card.value}</span>
                  <div className="flex items-center text-body-sm font-bold">
                    {card.trend === "up" ? (
                      <span className="text-signal-success flex items-center gap-1">
                        <TrendingUp size={16} /> {card.trendText}
                      </span>
                    ) : card.trend === "down" ? (
                      <span className="text-signal-critical flex items-center gap-1">
                        <TrendingDown size={16} /> {card.trendText}
                      </span>
                    ) : (
                      <span className="text-content-muted font-mono">Stable</span>
                    )}
                  </div>
                </div>

                {/* Highly structured SVG Sparkline visualizer */}
                <div className="h-12 w-full mt-2 opacity-80 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={card.id === "soil-temp" ? "#f97316" : card.id === "soil-moisture" ? "#3b82f6" : "#4ade80"} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={card.id === "soil-temp" ? "#f97316" : card.id === "soil-moisture" ? "#3b82f6" : "#4ade80"} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {card.id === "soil-moisture" ? (
                      <>
                        <path d="M 0 25 Q 25 10 50 18 T 100 28" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                        <path d="M 0 25 Q 25 10 50 18 T 100 28 L 100 30 L 0 30 Z" fill={`url(#grad-${card.id})`} />
                      </>
                    ) : card.id === "soil-temp" ? (
                      <>
                        <path d="M 0 18 Q 25 22 50 10 T 100 15" fill="none" stroke="#f97316" strokeWidth="2.5" />
                        <path d="M 0 18 Q 25 22 50 10 T 100 15 L 100 30 L 0 30 Z" fill={`url(#grad-${card.id})`} />
                      </>
                    ) : (
                      <>
                        <path d="M 0 22 Q 25 20 50 15 T 100 8" fill="none" stroke="#4ade80" strokeWidth="2.5" />
                        <path d="M 0 22 Q 25 20 50 15 T 100 8 L 100 30 L 0 30 Z" fill={`url(#grad-${card.id})`} />
                        <circle cx="100" cy="8" r="4" fill="#4ade80" className="drop-shadow-sm" />
                      </>
                    )}
                  </svg>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between text-micro font-bold text-content-muted uppercase tracking-wider">
                <span>{t.lastUpdated}: {card.lastUpdated}</span>
                {card.id === "soil-moisture" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    id="trigger-irrigation-card-btn"
                    onClick={() => onTriggerIrrigation("Zone B")}
                    className="text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Quick Hydrate
                  </motion.button>
                )}
              </div>
            </LivingSurface>
          ))}
        </div>
      </section>

      {/* Grid containing Priority Checklist and Animated Vitality Forecast */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Priorities Checklist Action Card */}
        <LivingSurface tier="lite" className="material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-body-sm font-bold text-content-primary tracking-widest uppercase flex items-center gap-2">
                  <Clock size={18} className="text-signal-success" />
                  TODAY'S FARM TASKS
                </h3>
                <p className="text-caption text-content-secondary font-medium mt-1">Perform checkouts for best crop productivity</p>
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskToggle(task.id, task.text)}
                  className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer select-none transition-all duration-fast ${
                    task.done 
                      ? "bg-signal-success/5 border-signal-success/20 opacity-70" 
                      : "bg-surface-elevated border-border-subtle hover:border-border-strong hover:shadow-sm"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-all ${
                    task.done 
                      ? "bg-signal-success border-signal-success" 
                      : "border-content-muted"
                  }`}>
                    {task.done && <CheckCircle size={14} className="text-surface-base" />}
                  </div>
                  <span className={`text-body-sm font-medium leading-relaxed ${task.done ? "line-through text-content-muted" : "text-content-primary"}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle text-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="nav-to-activity-btn"
              onClick={() => onNavigateTab("activity")}
              className="text-body-sm font-bold text-content-primary hover:text-signal-success transition-colors flex items-center justify-center gap-1.5 w-full py-2 cursor-pointer"
            >
              <span>{t.recentActivities}</span>
              <Plus size={16} />
            </motion.button>
          </div>
        </LivingSurface>

        {/* Animated Outlook Visualization Card */}
        <LivingSurface tier="lite" className="material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-4">
              <h3 className="text-body-sm font-bold text-content-primary tracking-widest uppercase flex items-center gap-2">
                <Sparkles size={18} className="text-signal-success" />
                {t.trends7Days}
              </h3>
              <span className="text-micro font-bold text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                AI PROJECTED
              </span>
            </div>
            <p className="text-body-sm text-content-secondary font-medium mb-6 leading-relaxed">
              Based on historical data from {profile.district} county matching {profile.cropType} cultivation patterns during early rainy season.
            </p>

            {/* Simulated bar chart for 7 day predictions */}
            <div className="h-36 w-full flex items-end justify-between gap-2 mt-4 mb-4 select-none" aria-hidden="true">
              {[
                { day: "Mon", val: 82, text: "Ideal" },
                { day: "Tue", val: 84, text: "Ideal" },
                { day: "Wed", val: 81, text: "Ideal" },
                { day: "Thu", val: 78, text: "Cooling" },
                { day: "Fri", val: 85, text: "Ideal" },
                { day: "Sat", val: 88, text: "Peak" },
                { day: "Sun", val: 84, text: "Ideal" }
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-caption font-bold text-content-muted group-hover:text-content-primary transition-colors">{item.val}%</div>
                  <div className="w-full relative rounded-t-xl overflow-hidden bg-surface-base" style={{ height: "90px" }}>
                    <motion.div
                      style={{ height: "100%" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: item.val / 100 }}
                      originY={1}
                      transition={{ type: "spring", stiffness: 100, delay: idx * 0.05 }}
                      className={`w-full rounded-t-xl shadow-inner ${
                        item.val >= 85 
                          ? "bg-signal-success" 
                          : item.val >= 80 
                          ? "bg-signal-success/70" 
                          : "bg-signal-warning"
                      }`}
                    />
                  </div>
                  <div className="text-caption font-bold text-content-primary font-mono uppercase">{item.day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-caption text-content-muted">
            <span className="font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-signal-success shadow-sm" /> Vitality Target Range
            </span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="explain-trends-btn"
              onClick={() => onNavigateTab("ai")}
              className="font-bold text-content-primary hover:text-signal-success transition-colors flex items-center gap-1 group cursor-pointer"
            >
              <span>Analyze with Kisan AI</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </LivingSurface>
      </section>
    </div>
  );
}
