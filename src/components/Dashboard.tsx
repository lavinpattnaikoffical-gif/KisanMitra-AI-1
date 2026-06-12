import React, { useState, useEffect, useCallback } from "react";
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
  Plus,
  Droplets,
  Thermometer,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { api } from "../utils/api";
import { io as socketIO } from "socket.io-client";

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

interface LiveTelemetry {
  moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  battery: number | null;
  createdAt: string;
  device?: { deviceId: string; type: string; status: string };
}

interface DashboardStats {
  totalFarms: number;
  totalZones: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  averageMoisture: number | null;
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
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, LiveTelemetry>>({});
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch live telemetry for all zones
  const fetchTelemetry = useCallback(async () => {
    if (!hasZones) return;
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled(
        zones.map(async (zone) => {
          const res = await api.getZoneLatestTelemetry(zone.id);
          return { zoneId: zone.id, data: res.data };
        })
      );

      const telemetryMap: Record<string, LiveTelemetry> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.data) {
          telemetryMap[result.value.zoneId] = result.value.data;
        }
      });
      setLiveTelemetry(telemetryMap);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("Failed to fetch telemetry:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [zones, hasZones]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getDashboardStats();
      if (res.success) setDashStats(res.data);
    } catch (err) {
      console.warn("Failed to fetch dashboard stats:", err);
    }
  }, []);

  // Socket.IO for real-time updates + 5s polling fallback
  useEffect(() => {
    fetchTelemetry();
    fetchStats();

    // Fallback polling every 5 seconds
    const interval = setInterval(() => {
      fetchTelemetry();
      fetchStats();
    }, 5000);

    // Socket.IO real-time connection
    let socket: any = null;
    try {
      const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL || "https://52.90.130.245:4000";
      socket = socketIO(`${BACKEND_URL}/telemetry`, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      });

      socket.on("connect", () => {
        console.log("📡 Dashboard Socket.IO connected");
        // Subscribe to all zones
        zones.forEach((zone) => {
          socket.emit("subscribe:zone", zone.id);
        });
      });

      socket.on("telemetry:update", (data: any) => {
        if (data?.zoneId && data?.reading) {
          setLiveTelemetry((prev) => ({
            ...prev,
            [data.zoneId]: data.reading,
          }));
          setLastRefreshed(new Date());
        }
      });

      socket.on("device:online", (data: any) => {
        console.log("🟢 Device online:", data);
        fetchStats(); // Refresh device counts
      });

      socket.on("device:offline", (data: any) => {
        console.log("🔴 Device offline:", data);
        fetchStats();
      });

      socket.on("disconnect", () => {
        console.log("📡 Dashboard Socket.IO disconnected — using polling fallback");
      });
    } catch (err) {
      console.warn("Socket.IO not available, using polling fallback only");
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [fetchTelemetry, fetchStats]);

  // Computed from live data
  const farmHealthScore = hasZones
    ? Math.round(zones.reduce((sum, z) => sum + z.health, 0) / zones.length)
    : 0;
  const onlineDevices = dashStats?.onlineDevices ?? 0;
  const totalDevices = dashStats?.totalDevices ?? 0;
  const activeAlertsCount = zones.filter(z => z.status === "warning" || z.status === "critical").length;

  // Helper: format time ago
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Helper: moisture status
  const getMoistureStatus = (moisture: number | null) => {
    if (moisture === null) return { color: "text-content-muted", bg: "bg-surface-elevated", label: "No data" };
    if (moisture < 30) return { color: "text-signal-critical", bg: "bg-signal-critical/10", label: "Critical" };
    if (moisture < 50) return { color: "text-signal-warning", bg: "bg-signal-warning/10", label: "Low" };
    return { color: "text-signal-success", bg: "bg-signal-success/10", label: "Optimal" };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h3 font-bold text-content-primary">Farm Command Center</h1>
          <p className="text-body-md text-content-secondary">Welcome, {profile.name}</p>
        </div>
        {hasZones && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { fetchTelemetry(); fetchStats(); }}
            className="flex items-center gap-2 text-body-sm text-content-secondary hover:text-content-primary px-3 py-2 rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">
              {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </motion.button>
        )}
      </div>

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
          {/* ── Live Stats Banner ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Farm Health */}
            <div className="material-surface p-5 rounded-2xl border border-border-subtle text-center">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center mb-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-border-subtle" />
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray="163.36" strokeDashoffset={163.36 - (163.36 * farmHealthScore) / 100} className="text-signal-success transition-all duration-1000" />
                </svg>
                <span className="absolute text-body-lg font-bold text-content-primary">{farmHealthScore}</span>
              </div>
              <p className="text-micro text-content-muted uppercase tracking-wider font-medium">Health Score</p>
            </div>

            {/* Online Devices */}
            <div className="material-surface p-5 rounded-2xl border border-border-subtle text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center mb-2 rounded-full bg-signal-success/10">
                {onlineDevices > 0 ? (
                  <Wifi size={24} className="text-signal-success" />
                ) : (
                  <WifiOff size={24} className="text-content-muted" />
                )}
              </div>
              <p className="text-body-lg font-bold text-content-primary">{onlineDevices}/{totalDevices}</p>
              <p className="text-micro text-content-muted uppercase tracking-wider font-medium">Devices Online</p>
            </div>

            {/* Avg Moisture */}
            <div className="material-surface p-5 rounded-2xl border border-border-subtle text-center">
              <div className={`w-16 h-16 mx-auto flex items-center justify-center mb-2 rounded-full ${getMoistureStatus(dashStats?.averageMoisture ?? null).bg}`}>
                <Droplets size={24} className={getMoistureStatus(dashStats?.averageMoisture ?? null).color} />
              </div>
              <p className="text-body-lg font-bold text-content-primary">
                {dashStats?.averageMoisture !== null && dashStats?.averageMoisture !== undefined ? `${dashStats.averageMoisture}%` : "—"}
              </p>
              <p className="text-micro text-content-muted uppercase tracking-wider font-medium">Avg Moisture</p>
            </div>

            {/* Active Alerts */}
            <div className="material-surface p-5 rounded-2xl border border-border-subtle text-center">
              <div className={`w-16 h-16 mx-auto flex items-center justify-center mb-2 rounded-full ${activeAlertsCount > 0 ? "bg-signal-critical/10" : "bg-signal-success/10"}`}>
                <AlertTriangle size={24} className={activeAlertsCount > 0 ? "text-signal-critical" : "text-signal-success"} />
              </div>
              <p className="text-body-lg font-bold text-content-primary">{activeAlertsCount}</p>
              <p className="text-micro text-content-muted uppercase tracking-wider font-medium">Active Alerts</p>
            </div>
          </div>

          {/* ── Zone Telemetry Cards ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                <Map size={24} className="text-content-secondary" /> Zone Telemetry
              </h2>
              <div className="flex items-center gap-2 text-micro text-content-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse" />
                Live — updates every 10s
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => {
                const telemetry = liveTelemetry[zone.id];
                const hasTelemetry = !!telemetry;
                const moistureStatus = getMoistureStatus(telemetry?.moisture ?? null);

                return (
                  <motion.div
                    key={zone.id}
                    whileHover={{ scale: 1.01 }}
                    className={`material-surface p-6 rounded-[2rem] border relative overflow-hidden group ${
                      zone.status === "critical" ? "border-signal-critical/50" :
                      zone.status === "warning" ? "border-signal-warning/50" : "border-border-subtle"
                    }`}
                  >
                    {/* Zone Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-h4 font-bold text-content-primary">{zone.name}</h3>
                        <p className="text-body-sm font-medium text-content-secondary">{zone.crop} • {zone.area}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-micro font-bold ${
                        zone.status === "critical" ? "bg-signal-critical/20 text-signal-critical" :
                        zone.status === "warning" ? "bg-signal-warning/20 text-signal-warning" :
                        "bg-signal-success/20 text-signal-success"
                      }`}>
                        {zone.health}% Health
                      </div>
                    </div>

                    {/* Live Sensor Grid */}
                    {hasTelemetry ? (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {/* Moisture */}
                        <div className={`p-3 rounded-xl ${moistureStatus.bg} text-center`}>
                          <Droplets size={18} className={`mx-auto mb-1 ${moistureStatus.color}`} />
                          <p className={`text-body-lg font-bold ${moistureStatus.color}`}>
                            {telemetry.moisture !== null ? `${telemetry.moisture}%` : "—"}
                          </p>
                          <p className="text-micro text-content-muted">Moisture</p>
                        </div>

                        {/* Temperature */}
                        <div className="p-3 rounded-xl bg-signal-warning/10 text-center">
                          <Thermometer size={18} className="mx-auto mb-1 text-signal-warning" />
                          <p className="text-body-lg font-bold text-signal-warning">
                            {telemetry.temperature !== null ? `${telemetry.temperature}°C` : "—"}
                          </p>
                          <p className="text-micro text-content-muted">Temp</p>
                        </div>

                        {/* Humidity */}
                        <div className="p-3 rounded-xl bg-signal-info/10 text-center">
                          <CloudRain size={18} className="mx-auto mb-1 text-signal-info" />
                          <p className="text-body-lg font-bold text-signal-info">
                            {telemetry.humidity !== null ? `${telemetry.humidity}%` : "—"}
                          </p>
                          <p className="text-micro text-content-muted">Humidity</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-surface-elevated text-center mb-4 border border-dashed border-border-strong">
                        <Radio size={20} className="mx-auto text-content-muted mb-2" />
                        <p className="text-body-sm text-content-muted">No sensor data yet</p>
                        <p className="text-micro text-content-muted mt-1">Connect an ESP32 device to this zone</p>
                      </div>
                    )}

                    {/* Footer: Last update + Navigate */}
                    <div className="flex items-center justify-between text-content-muted">
                      {hasTelemetry && (
                        <div className="flex items-center gap-2 text-micro">
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-success" />
                          <span>Updated {timeAgo(telemetry.createdAt)}</span>
                          {telemetry.device && (
                            <span className="text-content-muted">• {telemetry.device.deviceId}</span>
                          )}
                        </div>
                      )}
                      {!hasTelemetry && <span />}
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => onNavigateTab("zones")}
                        className="flex items-center gap-1 text-body-sm text-content-secondary hover:text-content-primary cursor-pointer transition-colors"
                      >
                        Details <ChevronRight size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
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
        </>
      )}
    </div>
  );
}
