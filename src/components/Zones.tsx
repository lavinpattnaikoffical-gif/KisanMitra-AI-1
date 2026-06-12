import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, 
  Map, 
  CloudRain, 
  ThermometerSun, 
  Droplet, 
  Wifi, 
  WifiOff, 
  ChevronRight,
  Activity,
  AlertTriangle
} from "lucide-react";
import { UserProfile } from "../types";
import ZoneDetails from "./ZoneDetails";

interface ZonesProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
}

export default function Zones({ profile, selectedLanguage, onNavigateTab }: ZonesProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Mock data for zones reflecting hardware reality
  const zones = [
    { 
      id: "Zone A", 
      crop: "Tomato", 
      area: "1.2 Acres", 
      health: 82, 
      status: "warning",
      metrics: { moisture: "54%", temp: "32°C", weather: "Good" },
      connectivity: true 
    },
    { 
      id: "Zone B", 
      crop: "Cotton", 
      area: "2.0 Acres", 
      health: 95, 
      status: "healthy",
      metrics: { moisture: "68%", temp: "31°C", weather: "Good" },
      connectivity: true 
    },
    { 
      id: "Zone C", 
      crop: "Wheat", 
      area: "1.5 Acres", 
      health: 88, 
      status: "healthy",
      metrics: { moisture: "61%", temp: "30°C", weather: "Cloudy" },
      connectivity: true 
    },
    { 
      id: "Zone D", 
      crop: "Corn", 
      area: "0.8 Acres", 
      health: 91, 
      status: "healthy",
      metrics: { moisture: "65%", temp: "33°C", weather: "Good" },
      connectivity: false 
    },
  ];

  if (selectedZone) {
    const zoneData = zones.find(z => z.id === selectedZone);
    return <ZoneDetails zone={zoneData} onBack={() => setSelectedZone(null)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-bold text-content-primary flex items-center gap-3">
          <Layers className="text-signal-success" size={28} /> My Farm Zones
        </h1>
        <p className="text-body-md text-content-secondary">Manage and monitor specific sectors of your farm.</p>
      </div>

      {/* Zones List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zones.map((zone, idx) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedZone(zone.id)}
            className={`cursor-pointer material-surface rounded-[2rem] border overflow-hidden group transition-shadow hover:shadow-xl ${
              zone.status === "warning" ? "border-signal-warning/40" : "border-border-subtle"
            }`}
          >
            {/* Zone Header */}
            <div className={`p-5 flex justify-between items-center border-b ${
              zone.status === "warning" ? "bg-signal-warning/10 border-signal-warning/20" : "bg-surface-elevated border-border-subtle"
            }`}>
              <div>
                <h3 className="text-h3 font-bold text-content-primary">{zone.id}</h3>
                <p className="text-body-sm font-medium text-content-secondary">{zone.crop} • {zone.area}</p>
              </div>
              <div className="text-right">
                <div className={`text-h2 font-bold ${zone.status === "warning" ? "text-signal-warning" : "text-signal-success"}`}>
                  {zone.health}%
                </div>
                <p className="text-micro font-bold uppercase tracking-wide text-content-muted">Health Score</p>
              </div>
            </div>

            {/* Zone Metrics */}
            <div className="p-5 grid grid-cols-4 gap-4">
              <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                <Droplet size={18} className="text-signal-info mb-1" />
                <span className="text-body-md font-bold text-content-primary">{zone.metrics.moisture}</span>
              </div>
              <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                <ThermometerSun size={18} className="text-signal-warning mb-1" />
                <span className="text-body-md font-bold text-content-primary">{zone.metrics.temp}</span>
              </div>
              <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                <CloudRain size={18} className="text-content-secondary mb-1" />
                <span className="text-body-md font-bold text-content-primary">{zone.metrics.weather}</span>
              </div>
              <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                {zone.connectivity ? (
                  <Wifi size={18} className="text-signal-success mb-1" />
                ) : (
                  <WifiOff size={18} className="text-signal-critical mb-1" />
                )}
                <span className={`text-body-sm font-bold ${zone.connectivity ? "text-signal-success" : "text-signal-critical"}`}>
                  {zone.connectivity ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Warning Banner if applicable */}
            {zone.status === "warning" && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 text-signal-warning bg-signal-warning/10 p-3 rounded-xl border border-signal-warning/20">
                  <AlertTriangle size={16} />
                  <span className="text-body-sm font-medium">Moisture levels dropping. Check irrigation schedule.</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
