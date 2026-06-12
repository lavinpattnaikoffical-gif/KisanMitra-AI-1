import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, 
  CloudRain, 
  ThermometerSun, 
  Droplet, 
  Wifi, 
  WifiOff, 
  ChevronRight,
  AlertTriangle,
  Plus,
  X,
  Sprout
} from "lucide-react";
import { UserProfile } from "../types";
import { ZoneData } from "./Dashboard";
import ZoneDetails from "./ZoneDetails";

interface ZonesProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
  zones: ZoneData[];
  onAddZone: (zone: ZoneData) => void;
}

const CROP_OPTIONS = ["Tomato", "Cotton", "Wheat", "Rice", "Corn", "Sugarcane", "Soybean", "Groundnut", "Onion", "Other"];

export default function Zones({ profile, zones, onAddZone }: ZonesProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);

  // New zone form state
  const [newName, setNewName] = useState("");
  const [newCrop, setNewCrop] = useState("Tomato");
  const [newArea, setNewArea] = useState("");

  const handleCreateZone = () => {
    if (!newName.trim() || !newArea.trim()) return;
    const zone: ZoneData = {
      id: `zone-${Date.now()}`,
      name: newName.trim(),
      crop: newCrop,
      area: `${newArea} Acres`,
      health: 100,
      status: "healthy",
      metrics: { moisture: "--", temp: "--", weather: "No data" },
      connectivity: false,
    };
    onAddZone(zone);
    setNewName("");
    setNewCrop("Tomato");
    setNewArea("");
    setShowAddZone(false);
  };

  if (selectedZone) {
    const zoneData = zones.find(z => z.id === selectedZone);
    if (zoneData) {
      return <ZoneDetails zone={zoneData} onBack={() => setSelectedZone(null)} />;
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-bold text-content-primary flex items-center gap-3">
            <Layers className="text-signal-success" size={28} /> My Farm Zones
          </h1>
          <p className="text-body-md text-content-secondary">
            {zones.length > 0
              ? `You have ${zones.length} zone${zones.length > 1 ? "s" : ""} configured.`
              : "Create zones to organize and monitor sections of your farm."}
          </p>
        </div>
        <button 
          onClick={() => setShowAddZone(true)}
          className="flex items-center gap-2 bg-content-primary text-surface-base px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={20} /> Add Zone
        </button>
      </div>

      {/* === EMPTY STATE === */}
      {zones.length === 0 && (
        <div className="material-surface p-12 rounded-[2rem] border-2 border-dashed border-border-strong flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-signal-success/10 flex items-center justify-center">
            <Sprout size={36} className="text-signal-success" />
          </div>
          <div>
            <h2 className="text-h3 font-bold text-content-primary">No Zones Yet</h2>
            <p className="text-body-md text-content-secondary mt-2 max-w-md">
              A zone is a section of your farm. For example: "North Field (Tomato)", "Greenhouse 1 (Cotton)", or "East Plot (Wheat)".
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddZone(true)}
            className="flex items-center gap-2 bg-content-primary text-surface-base px-8 py-4 rounded-2xl font-bold text-body-md hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
          >
            <Plus size={20} /> Create Your First Zone
          </motion.button>
        </div>
      )}

      {/* === ZONE CARDS === */}
      {zones.length > 0 && (
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
                  <h3 className="text-h3 font-bold text-content-primary">{zone.name}</h3>
                  <p className="text-body-sm font-medium text-content-secondary">{zone.crop} • {zone.area}</p>
                </div>
                <div className="text-right">
                  <div className={`text-h2 font-bold ${zone.status === "warning" ? "text-signal-warning" : "text-signal-success"}`}>
                    {zone.health}%
                  </div>
                  <p className="text-micro font-bold uppercase tracking-wide text-content-muted">Health</p>
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
                    <WifiOff size={18} className="text-content-muted mb-1" />
                  )}
                  <span className={`text-body-sm font-bold ${zone.connectivity ? "text-signal-success" : "text-content-muted"}`}>
                    {zone.connectivity ? "Online" : "No Device"}
                  </span>
                </div>
              </div>

              {/* Warning Banner */}
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
      )}

      {/* Add Zone Modal */}
      <AnimatePresence>
        {showAddZone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddZone(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-base border border-border-subtle rounded-3xl p-8 w-full max-w-lg relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-h3 font-bold text-content-primary">Create New Zone</h2>
                <button onClick={() => setShowAddZone(false)} className="text-content-muted hover:text-content-primary cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-body-sm font-bold text-content-secondary">Zone Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. North Field, Greenhouse 1"
                    className="w-full p-3 rounded-xl bg-surface-elevated border border-border-subtle text-content-primary focus:outline-none focus:border-signal-info placeholder-content-muted"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-body-sm font-bold text-content-secondary">Crop Type</label>
                  <select
                    value={newCrop}
                    onChange={(e) => setNewCrop(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-elevated border border-border-subtle text-content-primary focus:outline-none focus:border-signal-info"
                  >
                    {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-body-sm font-bold text-content-secondary">Area (Acres)</label>
                  <input
                    type="number"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="e.g. 1.5"
                    min="0"
                    step="0.1"
                    className="w-full p-3 rounded-xl bg-surface-elevated border border-border-subtle text-content-primary focus:outline-none focus:border-signal-info placeholder-content-muted"
                  />
                </div>

                <div className="pt-3 flex gap-3 justify-end">
                  <button onClick={() => setShowAddZone(false)} className="px-6 py-3 rounded-xl font-bold text-content-secondary hover:bg-surface-elevated transition-colors cursor-pointer">Cancel</button>
                  <button 
                    onClick={handleCreateZone}
                    disabled={!newName.trim() || !newArea.trim()}
                    className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                  >
                    Create Zone
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
