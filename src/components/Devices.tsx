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
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface DevicesProps {
  profile: UserProfile;
  selectedLanguage: string;
  onNavigateTab: (tab: any) => void;
}

export default function Devices({ profile }: DevicesProps) {
  const [showProvisioning, setShowProvisioning] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState<"SENSOR" | "PUMP" | "RELAY">("SENSOR");
  const [newDeviceZone, setNewDeviceZone] = useState("Zone A");
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string, secret: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Mock live devices
  const devices = [
    { id: "KM-S-A1", type: "SENSOR", zone: "Zone A", status: "online", lastSeen: "Just now", battery: 85, firmware: "v1.2.0" },
    { id: "KM-R-A1", type: "PUMP", zone: "Zone A", status: "online", lastSeen: "Just now", battery: 100, firmware: "v1.1.4" },
    { id: "KM-S-B1", type: "SENSOR", zone: "Zone B", status: "online", lastSeen: "2 mins ago", battery: 42, firmware: "v1.2.0" },
    { id: "KM-S-C1", type: "SENSOR", zone: "Zone C", status: "offline", lastSeen: "4 hours ago", battery: 5, firmware: "v1.0.0" }
  ];

  const handleGenerate = () => {
    setGeneratedCreds({
      id: `KM-${newDeviceType.charAt(0)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      secret: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    });
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
          <p className="text-body-md text-content-secondary">Monitor live hardware and provision new ESP32 modules.</p>
        </div>
        <button 
          onClick={() => setShowProvisioning(true)}
          className="flex items-center gap-2 bg-content-primary text-surface-base px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={20} /> Add Device
        </button>
      </div>

      {/* Device Pairing Visualization */}
      <div className="material-surface p-6 rounded-[2rem] border border-border-subtle bg-gradient-to-b from-transparent to-surface-elevated/50">
        <h2 className="text-h4 font-bold text-content-primary mb-6 flex items-center gap-2">
          <Cpu size={20} className="text-content-secondary" /> Farm Architecture Network
        </h2>
        
        <div className="flex flex-wrap gap-8">
          {/* Zone A Cluster */}
          <div className="bg-surface-base p-6 rounded-3xl border border-border-subtle flex flex-col items-center">
            <div className="mb-4 text-center">
              <h3 className="font-bold text-content-primary">Zone A</h3>
              <p className="text-micro text-content-secondary">Tomato • 1.2 Acres</p>
            </div>
            
            {/* Sender */}
            <div className="bg-surface-elevated p-3 rounded-xl border border-signal-info/30 flex items-center gap-3 shadow-sm w-48">
              <Radio size={16} className="text-signal-info" />
              <div>
                <p className="text-body-sm font-bold">KM-S-A1</p>
                <p className="text-micro text-content-secondary">Sensor Node</p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="h-8 flex items-center justify-center text-border-strong my-1">
              <ArrowDown size={16} />
            </div>

            {/* Receiver */}
            <div className="bg-surface-elevated p-3 rounded-xl border border-blue-500/30 flex items-center gap-3 shadow-sm w-48">
              <Cpu size={16} className="text-blue-500" />
              <div>
                <p className="text-body-sm font-bold">KM-R-A1</p>
                <p className="text-micro text-content-secondary">Pump Controller</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Device Monitor */}
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
                      device.status === 'online' ? 'bg-signal-success/10 text-signal-success' : 'bg-signal-critical/10 text-signal-critical'
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

      {/* Provisioning Modal Overlay */}
      <AnimatePresence>
        {showProvisioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProvisioning(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-base border border-border-subtle rounded-3xl p-8 w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto notification-scroll"
            >
              <h2 className="text-h3 font-bold text-content-primary mb-6">Provision New ESP32</h2>
              
              {!generatedCreds ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-body-sm font-bold text-content-secondary">Device Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setNewDeviceType("SENSOR")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${newDeviceType === "SENSOR" ? "border-signal-info bg-signal-info/5" : "border-border-subtle bg-surface-elevated hover:border-border-strong"}`}
                      >
                        <Radio size={24} className={newDeviceType === "SENSOR" ? "text-signal-info mb-2" : "text-content-muted mb-2"} />
                        <h3 className="font-bold text-content-primary">Sensor Node</h3>
                        <p className="text-micro text-content-secondary mt-1">Transmits telemetry data</p>
                      </button>
                      <button 
                        onClick={() => setNewDeviceType("PUMP")}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${newDeviceType === "PUMP" ? "border-blue-500 bg-blue-500/5" : "border-border-subtle bg-surface-elevated hover:border-border-strong"}`}
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
                      <option>Zone A</option>
                      <option>Zone B</option>
                      <option>Zone C</option>
                      <option>Zone D</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3 justify-end">
                    <button onClick={() => setShowProvisioning(false)} className="px-6 py-3 rounded-xl font-bold text-content-secondary hover:bg-surface-elevated transition-colors">Cancel</button>
                    <button onClick={handleGenerate} className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity">Generate Credentials</button>
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
                          className="flex items-center gap-1.5 text-micro font-bold text-signal-info hover:opacity-80"
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
                    <button onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); }} className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity">Done</button>
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
