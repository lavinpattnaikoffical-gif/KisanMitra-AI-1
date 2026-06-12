import React, { useState } from "react";
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryMedium,
  BatteryLow,
  Plus, 
  Cpu,
  ArrowDown,
  Terminal,
  Copy,
  CheckCircle2,
  X,
  Satellite
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { ZoneData } from "./Dashboard";

export interface DeviceData {
  id: string;
  type: "SENSOR" | "PUMP" | "RELAY";
  zone: string;
  status: "online" | "offline";
  lastSeen: string;
  battery: number;
  firmware: string;
}

interface DevicesProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
  devices: DeviceData[];
  zones: ZoneData[];
  onAddDevice: (device: DeviceData) => void;
}

export default function Devices({ zones, devices, onAddDevice }: DevicesProps) {
  const [showProvisioning, setShowProvisioning] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState<"SENSOR" | "PUMP" | "RELAY">("SENSOR");
  const [newDeviceZone, setNewDeviceZone] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string, secret: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    const creds = {
      id: `KM-${newDeviceType.charAt(0)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      secret: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    };
    setGeneratedCreds(creds);

    // Add to devices list
    const device: DeviceData = {
      id: creds.id,
      type: newDeviceType,
      zone: newDeviceZone || "Unassigned",
      status: "offline",
      lastSeen: "Never",
      battery: 100,
      firmware: "v1.0.0",
    };
    onAddDevice(device);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const esp32Template = generatedCreds ? `// KisanMitra AI - ESP32 Firmware Boilerplate
#include <WiFi.h>
#include <HTTPClient.h>

#define DEVICE_ID "${generatedCreds.id}"
#define DEVICE_SECRET "${generatedCreds.secret}"
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASS"

const char* endpoint = "https://kisanmitra-api.in/api/telemetry/ingest";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi!");
}

void loop() {
  // Add sensor reading logic here
  // Send POST request to endpoint with DEVICE_ID and DEVICE_SECRET
  delay(5000);
}
` : "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h3 font-bold text-content-primary flex items-center gap-3">
            <Radio className="text-signal-info" size={28} /> Hardware Devices
          </h1>
          <p className="text-body-md text-content-secondary">
            {devices.length > 0
              ? `${devices.length} device${devices.length > 1 ? "s" : ""} registered.`
              : "Register ESP32 modules to collect live telemetry."}
          </p>
        </div>
        <button 
          onClick={() => {
            if (zones.length > 0) setNewDeviceZone(zones[0].name);
            setShowProvisioning(true);
          }}
          className="flex items-center gap-2 bg-content-primary text-surface-base px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={20} /> Add Device
        </button>
      </div>

      {/* === EMPTY STATE === */}
      {devices.length === 0 && (
        <div className="material-surface p-12 rounded-[2rem] border-2 border-dashed border-border-strong flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-signal-info/10 flex items-center justify-center">
            <Satellite size={36} className="text-signal-info" />
          </div>
          <div>
            <h2 className="text-h3 font-bold text-content-primary">No Devices Yet</h2>
            <p className="text-body-md text-content-secondary mt-2 max-w-md">
              Devices are ESP32 hardware modules placed in your farm zones. They collect soil moisture, temperature, and humidity data in real-time.
            </p>
            {zones.length === 0 && (
              <p className="text-body-sm text-signal-warning font-medium mt-3">
                ⚠️ Create at least one Zone first before adding devices.
              </p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (zones.length > 0) {
                setNewDeviceZone(zones[0].name);
                setShowProvisioning(true);
              }
            }}
            disabled={zones.length === 0}
            className="flex items-center gap-2 bg-content-primary text-surface-base px-8 py-4 rounded-2xl font-bold text-body-md hover:opacity-90 transition-opacity cursor-pointer shadow-lg disabled:opacity-40"
          >
            <Plus size={20} /> Provision First Device
          </motion.button>
        </div>
      )}

      {/* === DEVICE TABLE === */}
      {devices.length > 0 && (
        <div className="material-surface p-6 rounded-[2rem] border border-border-subtle">
          <h2 className="text-h4 font-bold text-content-primary mb-4 flex items-center gap-2">
            <Terminal size={20} className="text-content-secondary" /> Live Device Monitor
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-body-sm text-content-secondary">
                  <th className="py-3 px-4 font-medium">Device ID</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Zone</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Battery</th>
                  <th className="py-3 px-4 font-medium">Firmware</th>
                  <th className="py-3 px-4 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, idx) => (
                  <tr key={idx} className="border-b border-border-subtle/50 hover:bg-surface-elevated transition-colors">
                    <td className="py-4 px-4 font-bold text-content-primary">{device.id}</td>
                    <td className="py-4 px-4 text-body-sm text-content-secondary">{device.type}</td>
                    <td className="py-4 px-4 text-body-sm text-content-primary">{device.zone}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold ${
                        device.status === 'online' ? 'bg-signal-success/10 text-signal-success' : 'bg-surface-elevated text-content-muted'
                      }`}>
                        {device.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {device.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-body-sm text-content-secondary">
                        {device.battery > 50 ? <Battery size={16} className="text-signal-success" /> : 
                         device.battery > 20 ? <BatteryMedium size={16} className="text-signal-warning" /> : 
                         <BatteryLow size={16} className="text-signal-critical" />}
                        {device.battery}%
                      </div>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-content-secondary">{device.firmware}</td>
                    <td className="py-4 px-4 text-body-sm text-content-secondary">{device.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provisioning Modal */}
      <AnimatePresence>
        {showProvisioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-base border border-border-subtle rounded-3xl p-8 w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto notification-scroll"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-h3 font-bold text-content-primary">Provision New ESP32</h2>
                <button onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); }} className="text-content-muted hover:text-content-primary cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              {!generatedCreds ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-content-secondary">Device Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setNewDeviceType("SENSOR")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors cursor-pointer ${newDeviceType === "SENSOR" ? "border-signal-info bg-signal-info/5" : "border-border-subtle bg-surface-elevated hover:border-border-strong"}`}
                      >
                        <Radio size={24} className={newDeviceType === "SENSOR" ? "text-signal-info mb-2" : "text-content-muted mb-2"} />
                        <h3 className="font-bold text-content-primary">Sensor Node</h3>
                        <p className="text-micro text-content-secondary mt-1">Transmits telemetry data</p>
                      </button>
                      <button 
                        onClick={() => setNewDeviceType("PUMP")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors cursor-pointer ${newDeviceType === "PUMP" ? "border-blue-500 bg-blue-500/5" : "border-border-subtle bg-surface-elevated hover:border-border-strong"}`}
                      >
                        <Cpu size={24} className={newDeviceType === "PUMP" ? "text-blue-500 mb-2" : "text-content-muted mb-2"} />
                        <h3 className="font-bold text-content-primary">Pump/Relay</h3>
                        <p className="text-micro text-content-secondary mt-1">Receives commands</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-content-secondary">Assign to Zone</label>
                    <select 
                      value={newDeviceZone}
                      onChange={(e) => setNewDeviceZone(e.target.value)}
                      className="w-full p-3 rounded-xl bg-surface-elevated border border-border-subtle text-content-primary focus:outline-none focus:border-signal-info"
                    >
                      {zones.map(z => <option key={z.id} value={z.name}>{z.name} ({z.crop})</option>)}
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3 justify-end">
                    <button onClick={() => setShowProvisioning(false)} className="px-6 py-3 rounded-xl font-bold text-content-secondary hover:bg-surface-elevated transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleGenerate} className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity cursor-pointer">Generate Credentials</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-signal-success/10 border border-signal-success/20 flex items-start gap-3">
                    <CheckCircle2 className="text-signal-success mt-0.5" size={20} />
                    <div>
                      <h3 className="font-bold text-content-primary">Device Provisioned Successfully</h3>
                      <p className="text-body-sm text-content-secondary mt-1">Copy the credentials below to your ESP32 hardware.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-4 font-mono text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-content-secondary">Device ID</span>
                        <span className="font-bold text-content-primary select-all">{generatedCreds.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-content-secondary">Secret</span>
                        <span className="font-bold text-content-primary select-all">{generatedCreds.secret}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-body-sm font-bold text-content-secondary">ESP32 C++ Boilerplate</label>
                        <button 
                          onClick={() => handleCopy(esp32Template, "code")}
                          className="flex items-center gap-1.5 text-micro font-bold text-signal-info hover:opacity-80 cursor-pointer"
                        >
                          {copied === "code" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          {copied === "code" ? "COPIED!" : "COPY TEMPLATE"}
                        </button>
                      </div>
                      <div className="bg-[#1e1e1e] rounded-xl p-4 overflow-x-auto">
                        <pre className="text-sm text-[#d4d4d4] font-mono leading-relaxed">
                          {esp32Template}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); }} className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity cursor-pointer">Done</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
