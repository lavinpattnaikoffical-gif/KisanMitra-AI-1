import React from "react";
import { 
  CloudRain, 
  Wind, 
  ThermometerSun, 
  Activity, 
  Radio, 
  Map, 
  AlertTriangle,
  Info,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import { UserProfile } from "../types";

interface DashboardProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
  metrics: any[];
  alerts: any[];
}

export default function Dashboard({
  profile,
  onNavigateTab,
}: DashboardProps) {
  // Mock data for Farm Command Center
  const farmHealthScore = 85;
  const activeZonesCount = 4;
  const connectedDevicesCount = 8;
  const activeAlertsCount = 2;

  const recommendations = [
    { id: "r1", type: "critical", text: "Zone A moisture below threshold (42%). Immediate irrigation recommended." },
    { id: "r2", type: "warning", text: "Weather forecast indicates high heat tomorrow. Prepare shade nets if applicable." },
    { id: "r3", type: "info", text: "All 8 devices are currently online and transmitting telemetry normally." }
  ];

  const zones = [
    { id: "Zone A", crop: "Tomato", health: 82, status: "warning" },
    { id: "Zone B", crop: "Cotton", health: 95, status: "healthy" },
    { id: "Zone C", crop: "Wheat", health: 88, status: "healthy" },
    { id: "Zone D", crop: "Corn", health: 91, status: "healthy" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-bold text-content-primary">Farm Command Center</h1>
        <p className="text-body-md text-content-secondary">Overview of {profile.name}'s Farm</p>
      </div>

      {/* Top Cards: Weather & Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weather Card */}
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
                  <p className="text-h4 font-bold text-content-primary">{activeZonesCount}</p>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Farm Map View */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
            <Map size={24} className="text-content-secondary" /> Farm Map Layout
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {zones.map((zone, idx) => (
              <motion.div
                key={zone.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateTab("zones")} // Routes to zones tab for now
                className={`cursor-pointer material-surface p-6 rounded-[2rem] border relative overflow-hidden group min-h-[160px] flex flex-col justify-between ${
                  zone.status === "warning" ? "border-signal-warning/50 bg-signal-warning/5" : "border-border-subtle"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-h4 font-bold text-content-primary">{zone.id}</h3>
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

        {/* Right Column: AI Recommendations Feed */}
        <div className="space-y-4">
          <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
            <Sparkles size={24} className="text-signal-info" /> AI Recommendations
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className={`p-4 rounded-2xl flex items-start gap-3 border ${
                  rec.type === "critical" ? "bg-signal-critical/10 border-signal-critical/20" :
                  rec.type === "warning" ? "bg-signal-warning/10 border-signal-warning/20" :
                  "bg-signal-success/10 border-signal-success/20"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {rec.type === "critical" && <AlertTriangle size={18} className="text-signal-critical" />}
                  {rec.type === "warning" && <AlertTriangle size={18} className="text-signal-warning" />}
                  {rec.type === "info" && <Info size={18} className="text-signal-success" />}
                </div>
                <p className={`text-body-sm font-medium ${
                  rec.type === "critical" ? "text-content-primary" :
                  rec.type === "warning" ? "text-content-primary" :
                  "text-content-secondary"
                }`}>
                  {rec.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
