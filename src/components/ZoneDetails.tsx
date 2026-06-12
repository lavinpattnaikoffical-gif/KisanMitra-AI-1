import React, { useState } from "react";
import { 
  ArrowLeft, 
  Droplets, 
  Thermometer, 
  Activity, 
  Bot, 
  Clock, 
  Radio, 
  Power 
} from "lucide-react";
import { motion } from "motion/react";

interface ZoneDetailsProps {
  zone: any;
  onBack: () => void;
}

export default function ZoneDetails({ zone, onBack }: ZoneDetailsProps) {
  const [isIrrigating, setIsIrrigating] = useState(false);

  const handleIrrigate = () => {
    setIsIrrigating(true);
    setTimeout(() => setIsIrrigating(false), 3000); // Simulate action
  };

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
          <h1 className="text-h2 font-bold text-content-primary">{zone.id}</h1>
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
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
              <Activity size={20} className="text-signal-info" /> Live Telemetry
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <p className="text-content-secondary text-body-sm mb-1">Moisture</p>
                <p className="text-h3 font-bold text-content-primary">{zone.metrics.moisture}</p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <p className="text-content-secondary text-body-sm mb-1">Temperature</p>
                <p className="text-h3 font-bold text-content-primary">{zone.metrics.temp}</p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <p className="text-content-secondary text-body-sm mb-1">Humidity</p>
                <p className="text-h3 font-bold text-content-primary">48%</p>
              </div>
              <div className="p-4 bg-surface-base rounded-2xl border border-border-subtle text-center">
                <p className="text-content-secondary text-body-sm mb-1">Light</p>
                <p className="text-h3 font-bold text-content-primary">820 lx</p>
              </div>
            </div>
          </div>

          {/* Irrigation Controls */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle bg-gradient-to-br from-surface-elevated to-surface-base">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-h4 font-bold text-content-primary flex items-center gap-2">
                  <Droplets size={20} className="text-blue-500" /> Smart Irrigation
                </h2>
                <p className="text-body-sm text-content-secondary mt-1">
                  Control the main pump for {zone.id}. Automated by Ramu AI based on soil thresholds.
                </p>
              </div>
              <button 
                onClick={handleIrrigate}
                disabled={isIrrigating}
                className={`shrink-0 px-8 py-4 rounded-2xl text-h4 font-bold text-white transition-all shadow-lg flex items-center gap-3 ${
                  isIrrigating ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-1"
                }`}
              >
                <Power size={24} className={isIrrigating ? "animate-spin" : ""} />
                {isIrrigating ? "Pumping..." : "Trigger Pump"}
              </button>
            </div>
          </div>

          {/* Irrigation History */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
              <Clock size={20} className="text-content-secondary" /> Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-surface-base rounded-2xl border border-border-subtle">
                <div className="flex items-center gap-3">
                  <Droplets size={16} className="text-blue-500" />
                  <div>
                    <p className="font-bold text-content-primary">Irrigation Cycle</p>
                    <p className="text-body-sm text-content-secondary">Auto-triggered (Moisture below 40%)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-content-primary">15 mins</p>
                  <p className="text-body-sm text-content-secondary">Yesterday, 06:30 AM</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-surface-base rounded-2xl border border-border-subtle">
                <div className="flex items-center gap-3">
                  <Thermometer size={16} className="text-signal-warning" />
                  <div>
                    <p className="font-bold text-content-primary">Heat Warning</p>
                    <p className="text-body-sm text-content-secondary">Temperature exceeded 35°C</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body-sm text-content-secondary">2 days ago, 02:15 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Devices & AI Insights */}
        <div className="space-y-6">
          
          {/* AI Insights specific to this zone */}
          <div className="material-surface p-6 rounded-[2rem] border border-signal-info/30 bg-signal-info/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={80} /></div>
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2 relative z-10">
              <Bot size={20} className="text-signal-info" /> Ramu's Insight
            </h2>
            <p className="text-body-sm text-content-primary leading-relaxed relative z-10">
              Based on the current weather forecast (no rain expected for 3 days) and dropping moisture levels ({zone.metrics.moisture}), I recommend triggering a 15-minute irrigation cycle before sunset today to prevent heat stress on the {zone.crop}.
            </p>
          </div>

          {/* Assigned Devices */}
          <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
            <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
              <Radio size={20} className="text-content-secondary" /> Zone Devices
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-surface-base rounded-xl border border-border-subtle flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-bold text-content-primary">KM-S-A1 (Sensor)</p>
                  <p className="text-micro text-content-secondary">ESP32 • v1.2</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-signal-success animate-pulse"></div>
              </div>
              <div className="p-3 bg-surface-base rounded-xl border border-border-subtle flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-bold text-content-primary">KM-R-A1 (Pump Relay)</p>
                  <p className="text-micro text-content-secondary">ESP32 • v1.1</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-signal-success"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
