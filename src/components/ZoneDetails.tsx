import React, { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Droplets, 
  Thermometer, 
  Activity, 
  Bot, 
  Clock, 
  Radio, 
  Power,
  Wifi,
  WifiOff,
  RefreshCw,
  CloudRain,
  Sparkles,
  Battery
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../utils/api";

interface ZoneDetailsProps {
  zone: any;
  onBack: () => void;
}

interface TelemetryData {
  moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  battery: number | null;
  createdAt: string;
  device?: { deviceId: string; type: string; role: string; status: string };
}

interface DeviceInfo {
  id: string;
  deviceId: string;
  type: string;
  role: string;
  status: string;
  lastSeen: string | null;
}

export default function ZoneDetails({ zone, onBack }: ZoneDetailsProps) {
  const [isIrrigating, setIsIrrigating] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);

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

  // Fetch live telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await api.getZoneLatestTelemetry(zone.id);
      if (res.success && res.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.warn("Telemetry fetch failed:", err);
    }
  }, [zone.id]);

  // Fetch devices for this zone
  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.getDevicesByZone(zone.id);
      if (res.success && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (err) {
      console.warn("Devices fetch failed:", err);
    }
  }, [zone.id]);

  // Fetch AI insight for this zone
  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const res = await api.getAIRecommendation(zone.id);
      if (res.success && res.data) {
        setAiInsight(`${res.data.recommendation} — ${res.data.reason} (Confidence: ${res.data.confidence}%)`);
      }
    } catch (err) {
      console.warn("AI insight fetch failed:", err);
    } finally {
      setLoadingInsight(false);
    }
  }, [zone.id]);

  // Initial load + polling
  useEffect(() => {
    fetchTelemetry();
    fetchDevices();
    fetchInsight();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [fetchTelemetry, fetchDevices, fetchInsight]);

  const handleIrrigate = () => {
    setIsIrrigating(true);
    setTimeout(() => setIsIrrigating(false), 3000);
  };

  const hasTelemetry = telemetry && (telemetry.moisture !== null || telemetry.temperature !== null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header & Back Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-surface-elevated hover:bg-border-subtle flex items-center justify-center transition-colors cursor-pointer text-content-primary"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-h2 font-bold text-content-primary">{zone.name}</h1>
          <p className="text-body-md text-content-secondary">{zone.crop} • {zone.area}</p>
        </div>
        <div className={`ml-auto px-4 py-2 rounded-full text-body-sm font-bold ${
          zone.status === "warning" ? "bg-signal-warning/20 text-signal-warning" : "bg-signal-success/20 text-signal-success"
        }`}>
          {zone.health}% Health Score
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Telemetry & Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Telemetry */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                <Activity size={20} className="text-signal-info" /> Live Telemetry
              </h2>
              {hasTelemetry && (
                <span className="text-micro text-content-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse" />
                  Updated {timeAgo(telemetry!.createdAt)}
                  {telemetry?.device && <span> • {telemetry.device.deviceId}</span>}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <Droplets size={20} className="text-signal-info mx-auto mb-2" />
                <p className="text-content-secondary text-body-sm mb-1">Moisture</p>
                <p className={`text-h3 font-bold ${hasTelemetry && telemetry!.moisture !== null ? "text-content-primary" : "text-content-muted"}`}>
                  {hasTelemetry && telemetry!.moisture !== null ? `${telemetry!.moisture}%` : "--"}
                </p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <Thermometer size={20} className="text-signal-warning mx-auto mb-2" />
                <p className="text-content-secondary text-body-sm mb-1">Temperature</p>
                <p className={`text-h3 font-bold ${hasTelemetry && telemetry!.temperature !== null ? "text-content-primary" : "text-content-muted"}`}>
                  {hasTelemetry && telemetry!.temperature !== null ? `${telemetry!.temperature}°C` : "--"}
                </p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <CloudRain size={20} className="text-content-secondary mx-auto mb-2" />
                <p className="text-content-secondary text-body-sm mb-1">Humidity</p>
                <p className={`text-h3 font-bold ${hasTelemetry && telemetry!.humidity !== null ? "text-content-primary" : "text-content-muted"}`}>
                  {hasTelemetry && telemetry!.humidity !== null ? `${telemetry!.humidity}%` : "--"}
                </p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <Battery size={20} className="text-signal-success mx-auto mb-2" />
                <p className="text-content-secondary text-body-sm mb-1">Battery</p>
                <p className={`text-h3 font-bold ${hasTelemetry && telemetry!.battery !== null ? "text-content-primary" : "text-content-muted"}`}>
                  {hasTelemetry && telemetry!.battery !== null ? `${telemetry!.battery}%` : "--"}
                </p>
              </div>
            </div>

            {/* No data notice */}
            {!hasTelemetry && (
              <div className="mt-4 p-3 rounded-xl bg-signal-warning/10 border border-signal-warning/20 flex items-center gap-2">
                <Bot size={16} className="text-signal-warning shrink-0" />
                <p className="text-body-sm text-content-primary">
                  🤖 <strong>Ramu:</strong> No sensor data yet. Connect an ESP32 device to this zone to see live readings.
                </p>
              </div>
            )}
          </div>

          {/* Irrigation Controls */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle bg-gradient-to-br from-surface-elevated to-surface-base">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                  <Droplets size={20} className="text-blue-500" /> Smart Irrigation
                </h2>
                <p className="text-body-sm text-content-secondary mt-1">
                  Control the pump for <strong>{zone.name}</strong>. Automated by Ramu AI based on soil thresholds.
                </p>
              </div>
              <button 
                onClick={handleIrrigate}
                disabled={isIrrigating}
                className={`shrink-0 px-8 py-4 rounded-2xl text-h4 font-bold text-white transition-all shadow-lg flex items-center gap-3 cursor-pointer ${
                  isIrrigating ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-1"
                }`}
              >
                <Power size={24} className={isIrrigating ? "animate-spin" : ""} />
                {isIrrigating ? "Pumping..." : "Trigger Pump"}
              </button>
            </div>
          </div>

          {/* Sensor Reading Summary */}
          {hasTelemetry && (
            <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
              <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
                <Clock size={20} className="text-content-secondary" /> Sensor Status
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-surface-base rounded-2xl border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <Droplets size={16} className="text-blue-500" />
                    <div>
                      <p className="font-bold text-content-primary">Latest Reading</p>
                      <p className="text-body-sm text-content-secondary">
                        Moisture: {telemetry!.moisture ?? '--'}% | Temp: {telemetry!.temperature ?? '--'}°C | Humidity: {telemetry!.humidity ?? '--'}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm text-content-secondary">{timeAgo(telemetry!.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Devices & AI Insights */}
        <div className="space-y-6">
          
          {/* AI Insights specific to this zone */}
          <div className="material-surface p-6 rounded-[2rem] border border-signal-info/30 bg-signal-info/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={80} /></div>
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2 relative z-10">
              <Bot size={20} className="text-signal-info" /> Ramu's Insight
            </h2>
            {loadingInsight ? (
              <div className="flex items-center gap-2 relative z-10">
                <RefreshCw size={16} className="animate-spin text-signal-info" />
                <p className="text-body-sm text-content-muted">Analyzing zone data...</p>
              </div>
            ) : aiInsight ? (
              <p className="text-body-sm text-content-primary leading-relaxed relative z-10">
                {aiInsight}
              </p>
            ) : hasTelemetry ? (
              <p className="text-body-sm text-content-primary leading-relaxed relative z-10">
                📊 Current readings — Moisture: <strong>{telemetry!.moisture}%</strong>, Temp: <strong>{telemetry!.temperature}°C</strong>, Humidity: <strong>{telemetry!.humidity}%</strong>.
                {telemetry!.moisture !== null && telemetry!.moisture < 40 
                  ? " ⚠️ Moisture is below threshold! Consider irrigating soon."
                  : " ✅ All parameters look normal for your " + zone.crop + " crop."}
              </p>
            ) : (
              <p className="text-body-sm text-content-muted leading-relaxed relative z-10">
                Connect a sensor device to this zone to get AI-powered insights and recommendations.
              </p>
            )}
          </div>

          {/* Assigned Devices — LIVE from backend */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
              <Radio size={20} className="text-content-secondary" /> Zone Devices
            </h2>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((d) => (
                  <div key={d.id} className="p-3 bg-surface-base rounded-xl border border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="text-body-sm font-bold text-content-primary">
                        {d.deviceId} ({d.type})
                      </p>
                      <p className="text-micro text-content-secondary">
                        {d.role} {d.lastSeen ? `• Last seen ${timeAgo(d.lastSeen)}` : ""}
                      </p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      d.status === "ONLINE" ? "bg-signal-success animate-pulse" : "bg-content-muted"
                    }`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <WifiOff size={24} className="text-content-muted mx-auto mb-2" />
                <p className="text-body-sm text-content-muted">No devices linked to this zone yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
