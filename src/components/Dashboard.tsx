import React from "react";
import { 
  CloudRain, 
  Wind, 
  ThermometerSun, 
  Activity, 
  Map, 
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  Radio,
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { UserProfile } from "../types";

export interface ZoneData {
  id: string;
  name: string;
  crop: string;
  area: string;
  health: number;
  status: "healthy" | "warning" | "critical";
  metrics: { moisture: string; temp: string; weather: string };
  connectivity: boolean;
}

interface DashboardProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
  zones: ZoneData[];
}

export default function Dashboard({
  profile,
  onNavigateTab,
  zones,
}: DashboardProps) {
  const hasZones = zones.length > 0;
  const farmHealthScore = hasZones
    ? Math.round(zones.reduce((sum, z) => sum + z.health, 0) / zones.length)
    : 0;
  const connectedDevicesCount = zones.filter(z => z.connectivity).length * 2; // rough estimate
  const activeAlertsCount = zones.filter(z => z.status === "warning" || z.status === "critical").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-bold text-content-primary">Farm Command Center</h1>
        <p className="text-body-md text-content-secondary">Welcome, {profile.name}</p>
      </div>

      {/* Weather Card — always shown */}
      <div className="material-surface p-6 rounded-[2rem] border border-border-subtle relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <ThermometerSun size={120} />
        </div>
        <h2 className="text-body-lg font-bold text-content-primary mb-4 flex items-center gap-2">
          <CloudRain size={20} className="text-signal-info" /> Local Weather
        </h2>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-h1 font-bold text-content-primary">34°C</p>
            <p className="text-body-sm text-content-secondary">Partly Cloudy</p>
          </div>
          <div className="space-y-1 mb-1">
            <div className="flex items-center gap-2 text-body-sm text-content-secondary">
              <Wind size={14} /> 12 km/h
            </div>
            <div className="flex items-center gap-2 text-body-sm text-content-secondary">
              <CloudRain size={14} /> 20% Rain Prob.
            </div>
          </div>
        </div>
      </div>

      {/* === EMPTY STATE: No Zones Yet === */}
      {!hasZones && (
        <div className="material-surface p-10 rounded-[2rem] border-2 border-dashed border-border-strong flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-signal-success/10 flex items-center justify-center">
            <Layers size={36} className="text-signal-success" />
          </div>
          <div>
            <h2 className="text-h3 font-bold text-content-primary">Set Up Your Farm</h2>
            <p className="text-body-md text-content-secondary mt-2 max-w-md">
              Start by creating your first zone. A zone represents a section of your farm — like "North Field" or "Greenhouse 1".
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigateTab("zones")}
              className="flex items-center gap-2 bg-content-primary text-surface-base px-8 py-4 rounded-2xl font-bold text-body-md hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
            >
              <Plus size={20} /> Create First Zone
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigateTab("devices")}
              className="flex items-center gap-2 bg-surface-elevated text-content-primary px-8 py-4 rounded-2xl font-bold text-body-md border border-border-subtle hover:border-border-strong transition-colors cursor-pointer"
            >
              <Radio size={20} /> Add a Device
            </motion.button>
          </div>
          <p className="text-micro text-content-muted">You can also ask <strong>Ramu AI</strong> for help getting started.</p>
        </div>
      )}

      {/* === POPULATED STATE: Zones exist === */}
      {hasZones && (
        <>
          {/* Farm Health Score */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle flex flex-col justify-between">
            <h2 className="text-body-lg font-bold text-content-primary mb-2 flex items-center gap-2">
              <Activity size={20} className="text-signal-success" /> Overall Farm Health
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border-subtle" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * farmHealthScore) / 100} className="text-signal-success transition-all duration-1000" />
                </svg>
                <span className="absolute text-h3 font-bold text-content-primary">{farmHealthScore}</span>
              </div>
              <div className="space-y-2">
                <p className="text-body-sm text-content-secondary">Your farm is operating efficiently.</p>
                <div className="flex gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-h4 font-bold text-content-primary">{zones.length}</p>
                    <p className="text-micro text-content-muted uppercase tracking-wider">Zones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-h4 font-bold text-content-primary">{connectedDevicesCount}</p>
                    <p className="text-micro text-content-muted uppercase tracking-wider">Devices</p>
                  </div>
                  <div className="text-center">
                    <p className="text-h4 font-bold text-signal-critical">{activeAlertsCount}</p>
                    <p className="text-micro text-content-muted uppercase tracking-wider">Alerts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Farm Map View */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                <Map size={24} className="text-content-secondary" /> Farm Map Layout
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {zones.map((zone) => (
                  <motion.div
                    key={zone.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigateTab("zones")}
                    className={`cursor-pointer material-surface p-6 rounded-[2rem] border relative overflow-hidden group min-h-[160px] flex flex-col justify-between ${
                      zone.status === "warning" ? "border-signal-warning/50 bg-signal-warning/5" : "border-border-subtle"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-h4 font-bold text-content-primary">{zone.name}</h3>
                        <p className="text-body-sm font-medium text-content-secondary mt-1">{zone.crop}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-micro font-bold ${
                        zone.status === "warning" ? "bg-signal-warning/20 text-signal-warning" : "bg-signal-success/20 text-signal-success"
                      }`}>
                        {zone.health}% Health
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 text-content-muted group-hover:text-content-primary transition-colors">
                      <span className="text-body-sm">View Details</span>
                      <ChevronRight size={18} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="space-y-4">
              <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                <Sparkles size={24} className="text-signal-info" /> AI Recommendations
              </h2>
              <div className="p-5 rounded-2xl bg-signal-info/10 border border-signal-info/20 flex items-start gap-3">
                <Info size={18} className="text-signal-info shrink-0 mt-0.5" />
                <p className="text-body-sm font-medium text-content-primary">
                  Ramu is analyzing your {zones.length} zone{zones.length > 1 ? "s" : ""}. Recommendations will appear here based on real-time telemetry.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
