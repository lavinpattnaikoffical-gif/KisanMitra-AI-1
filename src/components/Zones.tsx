import React, { useState, useEffect, useCallback } from "react";
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
  Sprout,
  Loader2,
  Bot,
  Radio,
  ArrowRight,
  CheckCircle2,
  Beaker
} from "lucide-react";
import { UserProfile } from "../types";
import { ZoneData } from "./Dashboard";
import ZoneDetails from "./ZoneDetails";
import { api } from "../utils/api";

interface ZonesProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
  zones: ZoneData[];
  onAddZone: (zone: ZoneData) => void;
}

const CROP_OPTIONS = ["Tomato", "Cotton", "Wheat", "Rice", "Corn", "Sugarcane", "Soybean", "Groundnut", "Onion", "Other"];

export default function Zones({ profile, zones, onAddZone, onNavigateTab }: ZonesProps) {
  // Time-ago helper
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreatedZone, setJustCreatedZone] = useState<string | null>(null);

  // Live telemetry for each zone
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, {
    moisture: number | null;
    temperature: number | null;
    humidity: number | null;
    ph: number | null;
    battery: number | null;
    createdAt: string;
    device?: { deviceId: string; status: string };
  }>>({});

  // Fetch live telemetry for all zones
  const fetchAllTelemetry = useCallback(async () => {
    if (zones.length === 0) return;
    try {
      const results = await Promise.allSettled(
        zones.map(z => api.getZoneLatestTelemetry(z.id))
      );
      const updated: typeof liveTelemetry = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled" && res.value?.success && res.value.data) {
          updated[zones[i].id] = res.value.data;
        }
      });
      setLiveTelemetry(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.warn("Zone telemetry fetch failed:", err);
    }
  }, [zones]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchAllTelemetry();
    const interval = setInterval(fetchAllTelemetry, 5000);
    return () => clearInterval(interval);
  }, [fetchAllTelemetry]);

  // New zone form state
  const [newName, setNewName] = useState("");
  const [newCrop, setNewCrop] = useState("Tomato");
  const [customCrop, setCustomCrop] = useState(""); // For "Other" option
  const [newArea, setNewArea] = useState("");

  const handleCreateZone = async () => {
    if (!newName.trim() || !newArea.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      // Step 1: Get or create a farm
      let farmId: string | null = null;
      const farmsRes = await api.getFarms();
      if (farmsRes.success && farmsRes.data?.length > 0) {
        farmId = farmsRes.data[0].id;
      } else {
        // Auto-create a default farm
        const createFarmRes = await api.createFarm({
          name: `${profile.name}'s Farm`,
          location: profile.district || "Unknown",
          totalArea: parseFloat(newArea) || 1,
          areaUnit: "ACRES",
        });
        if (createFarmRes.success) {
          farmId = createFarmRes.data.id;
        }
      }

      if (!farmId) {
        throw new Error("Could not create farm. Please try again.");
      }

      // Step 2: Create zone under the farm via backend
      const effectiveCrop = newCrop === "Other" ? (customCrop.trim() || "Other") : newCrop;
      const zoneRes = await api.createZone(farmId, {
        name: newName.trim(),
        cropType: effectiveCrop,
        areaSize: parseFloat(newArea) || 0,
        areaUnit: "ACRES",
        irrigationType: "DRIP",
        moistureThreshold: 40,
      });

      if (zoneRes.success) {
        const zone: ZoneData = {
          id: zoneRes.data.id, // Real CUID from database!
          name: zoneRes.data.name,
          crop: zoneRes.data.cropType || effectiveCrop,
          area: `${newArea} Acres`,
          health: 100,
          status: "healthy",
          metrics: { moisture: "--", temp: "--", weather: "No data" },
          connectivity: false,
        };
        onAddZone(zone);
        setNewName("");
        setNewCrop("Tomato");
        setCustomCrop("");
        setNewArea("");
        setShowAddZone(false);
        setJustCreatedZone(zoneRes.data.name); // Show success + next step
      } else {
        setCreateError(zoneRes.message || "Failed to create zone.");
      }
    } catch (err: any) {
      console.warn("Backend zone creation failed, creating locally:", err);
      // Fallback to local-only
      const effectiveCropFallback = newCrop === "Other" ? (customCrop.trim() || "Other") : newCrop;
      const zone: ZoneData = {
        id: `zone-${Date.now()}`,
        name: newName.trim(),
        crop: effectiveCropFallback,
        area: `${newArea} Acres`,
        health: 100,
        status: "healthy",
        metrics: { moisture: "--", temp: "--", weather: "No data" },
        connectivity: false,
      };
      onAddZone(zone);
      setCreateError("⚠️ Created locally (backend unavailable). Devices won't link until online.");
      setNewName("");
      setNewCrop("Tomato");
      setCustomCrop("");
      setNewArea("");
      setTimeout(() => setShowAddZone(false), 2000);
    } finally {
      setCreating(false);
    }
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

      {/* 🤖 Ramu: Zone Created Success + Next Step */}
      <AnimatePresence>
        {justCreatedZone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-signal-success/10 border border-signal-success/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-signal-success/20 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-signal-success" />
              </div>
              <div>
                <p className="text-body-md font-bold text-content-primary">
                  ✅ Zone "{justCreatedZone}" created successfully!
                </p>
                <p className="text-body-sm text-content-secondary mt-1">
                  🤖 <strong>Ramu says:</strong> Great! Now connect an IoT sensor device to this zone so I can start monitoring soil moisture, temperature, and humidity for you.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setJustCreatedZone(null); onNavigateTab("devices"); }}
                className="flex items-center gap-2 bg-content-primary text-surface-base px-5 py-2.5 rounded-xl font-bold text-body-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md"
              >
                <Radio size={16} /> Add Device <ArrowRight size={14} />
              </button>
              <button
                onClick={() => setJustCreatedZone(null)}
                className="px-3 py-2.5 rounded-xl text-body-sm font-bold text-content-muted hover:text-content-primary transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤖 Ramu: Contextual Setup Guide */}
      {!justCreatedZone && zones.length > 0 && !zones.some(z => z.connectivity) && (
        <div className="bg-signal-info/10 border border-signal-info/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-signal-info/20 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-signal-info" />
          </div>
          <div className="flex-1">
            <p className="text-body-sm font-medium text-content-primary">
              🤖 <strong>Ramu:</strong> You have {zones.length} zone{zones.length > 1 ? "s" : ""} but no devices connected yet.
              <button
                onClick={() => onNavigateTab("devices")}
                className="ml-1 text-signal-info font-bold hover:underline cursor-pointer"
              >
                Connect a sensor →
              </button>
            </p>
          </div>
        </div>
      )}

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

              {/* Zone Metrics — Live Telemetry */}
              <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
                {(() => {
                  const t = liveTelemetry[zone.id];
                  const hasTelemetry = t && (t.moisture != null || t.temperature != null || t.humidity != null);
                  const moisture = hasTelemetry && t.moisture != null ? `${t.moisture}%` : zone.metrics.moisture;
                  const temp = hasTelemetry && t.temperature != null ? `${t.temperature}°` : zone.metrics.temp;
                  const humidity = hasTelemetry && t.humidity != null ? `${t.humidity}%` : zone.metrics.weather;
                  const ph = hasTelemetry && t.ph != null ? t.ph.toFixed(1) : "--";
                  return (
                    <>
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                        <Droplet size={18} className="text-signal-info mb-1" />
                        <span className={`text-body-md font-bold ${hasTelemetry ? "text-content-primary" : "text-content-muted"}`}>{moisture}</span>
                        <span className="text-micro text-content-muted">Moisture</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                        <ThermometerSun size={18} className="text-signal-warning mb-1" />
                        <span className={`text-body-md font-bold ${hasTelemetry ? "text-content-primary" : "text-content-muted"}`}>{temp}</span>
                        <span className="text-micro text-content-muted">Temp</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                        <CloudRain size={18} className="text-content-secondary mb-1" />
                        <span className={`text-body-md font-bold ${hasTelemetry ? "text-content-primary" : "text-content-muted"}`}>{humidity}</span>
                        <span className="text-micro text-content-muted">Humidity</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                        <Beaker size={18} className="text-purple-500 mb-1" />
                        <span className={`text-body-md font-bold ${hasTelemetry ? "text-content-primary" : "text-content-muted"}`}>{ph}</span>
                        <span className="text-micro text-content-muted">Soil pH</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-base border border-border-subtle">
                        {hasTelemetry ? (
                          <Wifi size={18} className="text-signal-success mb-1" />
                        ) : zone.connectivity ? (
                          <Wifi size={18} className="text-signal-success mb-1" />
                        ) : (
                          <WifiOff size={18} className="text-content-muted mb-1" />
                        )}
                        <span className={`text-body-sm font-bold ${hasTelemetry || zone.connectivity ? "text-signal-success" : "text-content-muted"}`}>
                          {hasTelemetry ? "Live" : zone.connectivity ? "Online" : "No Device"}
                        </span>
                        <span className="text-micro text-content-muted">Status</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Last updated timestamp */}
              {liveTelemetry[zone.id] && (
                <div className="px-5 pb-3">
                  <p className="text-micro text-content-muted flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-success inline-block" />
                    Updated {timeAgo(liveTelemetry[zone.id].createdAt)}
                    {liveTelemetry[zone.id].device && (
                      <span> • {liveTelemetry[zone.id].device!.deviceId}</span>
                    )}
                  </p>
                </div>
              )}

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
                    onChange={(e) => {
                      setNewCrop(e.target.value);
                      if (e.target.value !== "Other") setCustomCrop("");
                    }}
                    className="w-full p-3 rounded-xl bg-surface-elevated border border-border-subtle text-content-primary focus:outline-none focus:border-signal-info"
                  >
                    {CROP_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {/* Custom text input when "Other" is selected */}
                  <AnimatePresence>
                    {newCrop === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          placeholder="e.g. Dragon Fruit, Banana, Turmeric..."
                          value={customCrop}
                          onChange={(e) => setCustomCrop(e.target.value)}
                          className="w-full p-3 rounded-xl bg-surface-elevated border border-signal-info/40 text-content-primary focus:outline-none focus:border-signal-info placeholder-content-muted mt-2"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
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

                {createError && (
                  <div className="p-3 rounded-xl bg-signal-warning/10 border border-signal-warning/20 text-body-sm text-signal-warning">
                    {createError}
                  </div>
                )}

                <div className="pt-3 flex gap-3 justify-end">
                  <button onClick={() => { setShowAddZone(false); setCreateError(null); }} className="px-6 py-3 rounded-xl font-bold text-content-secondary hover:bg-surface-elevated transition-colors cursor-pointer">Cancel</button>
                  <button 
                    onClick={handleCreateZone}
                    disabled={!newName.trim() || !newArea.trim() || creating}
                    className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center gap-2"
                  >
                    {creating && <Loader2 size={16} className="animate-spin" />}
                    {creating ? "Creating..." : "Create Zone"}
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
