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
  Satellite,
  Send,
  Loader2,
  Clock,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { ZoneData } from "./Dashboard";
import { api } from "../utils/api";

export interface DeviceData {
  id: string;
  dbId?: string;        // Prisma DB id for API calls
  type: "SENSOR" | "PUMP" | "RELAY";
  zone: string;
  zoneId?: string;      // Prisma zone id
  status: "online" | "offline" | "delayed" | "provisioned";
  lastSeen: string;
  battery: number;
  firmware: string;
  secret?: string;      // shown once at provisioning
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
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string, secret: string, dbId?: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ deviceId: string; success: boolean; message: string } | null>(null);

  const handleGenerate = async () => {
    setProvisioning(true);
    setProvisionError(null);

    // Find the zone object for the selected zone name
    const selectedZone = zones.find(z => z.name === newDeviceZone || z.id === newDeviceZone);
    
    if (!selectedZone) {
      setProvisionError("Please select a zone first.");
      setProvisioning(false);
      return;
    }

    try {
      // Call backend API to provision device
      const res = await api.createDevice({
        zoneId: selectedZone.id,
        role: newDeviceType === "SENSOR" ? "SENDER" : "RECEIVER",
        type: newDeviceType === "SENSOR" ? "SOIL" : newDeviceType === "PUMP" ? "PUMP" : "RELAY",
        firmware: "v1.0.0"
      });

      if (res.success) {
        const { deviceId, deviceSecret, device } = res.data;
        
        setGeneratedCreds({ id: deviceId, secret: deviceSecret, dbId: device.id });

        // Add to local devices list
        const deviceData: DeviceData = {
          id: deviceId,
          dbId: device.id,
          type: newDeviceType,
          zone: selectedZone.name,
          zoneId: selectedZone.id,
          status: "provisioned",
          lastSeen: "Never",
          battery: 100,
          firmware: "v1.0.0",
          secret: deviceSecret,
        };
        onAddDevice(deviceData);
      } else {
        setProvisionError(res.message || "Failed to provision device.");
      }
    } catch (err: any) {
      console.error("Provision error:", err);
      // Fallback to local-only provisioning if backend is unreachable
      const creds = {
        id: `KM-${newDeviceType.charAt(0)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        secret: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      };
      setGeneratedCreds(creds);
      setProvisionError("⚠️ Created locally (backend unreachable). Device won't accept telemetry until re-provisioned online.");

      const deviceData: DeviceData = {
        id: creds.id,
        type: newDeviceType,
        zone: newDeviceZone || "Unassigned",
        status: "offline",
        lastSeen: "Never",
        battery: 100,
        firmware: "v1.0.0",
        secret: creds.secret,
      };
      onAddDevice(deviceData);
    } finally {
      setProvisioning(false);
    }
  };

  // Send a test telemetry reading for a device
  const handleSendTestReading = async (device: DeviceData) => {
    if (!device.secret) {
      setTestResult({ deviceId: device.id, success: false, message: "Device secret not available. Re-provision to test." });
      return;
    }
    
    setTestingDevice(device.id);
    setTestResult(null);

    try {
      const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL || "https://52.90.130.245:4000";
      
      const res = await fetch(`${BACKEND_URL}/api/telemetry/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": device.id,
          "x-device-secret": device.secret,
        },
        body: JSON.stringify({
          temperature: 28 + Math.random() * 8,    // 28-36°C
          humidity: 50 + Math.random() * 30,       // 50-80%
          moisture: 30 + Math.random() * 50,       // 30-80%
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setTestResult({ deviceId: device.id, success: true, message: `✅ Reading stored! ID: ${data.data?.id?.slice(0,8)}...` });
      } else {
        setTestResult({ deviceId: device.id, success: false, message: `❌ ${data.message || "Server rejected the reading"}` });
      }
    } catch (err: any) {
      setTestResult({ deviceId: device.id, success: false, message: `❌ Network error: ${err.message}` });
    } finally {
      setTestingDevice(null);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Device status display helper
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "online":
        return { icon: <Wifi size={12} />, label: "ONLINE", classes: "bg-signal-success/10 text-signal-success", dot: "bg-signal-success" };
      case "delayed":
        return { icon: <Clock size={12} />, label: "DELAYED", classes: "bg-signal-warning/10 text-signal-warning", dot: "bg-signal-warning" };
      case "provisioned":
        return { icon: <Zap size={12} />, label: "PROVISIONED", classes: "bg-signal-info/10 text-signal-info", dot: "bg-signal-info" };
      default:
        return { icon: <WifiOff size={12} />, label: "OFFLINE", classes: "bg-surface-elevated text-content-muted", dot: "bg-content-muted" };
    }
  };

  const esp32Template = generatedCreds ? `// KisanMitra AI - ESP32 Firmware
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DEVICE_ID "${generatedCreds.id}"
#define DEVICE_SECRET "${generatedCreds.secret}"
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASS"

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34

DHT dht(DHTPIN, DHTTYPE);

const char* endpoint = "http://52.90.130.245/api/telemetry/ingest";

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int soilRaw = analogRead(SOIL_PIN);
  int moisture = constrain(map(soilRaw, 4095, 1500, 0, 100), 0, 100);

  if (isnan(humidity) || isnan(temperature)) { delay(5000); return; }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(endpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-id", DEVICE_ID);
    http.addHeader("x-device-secret", DEVICE_SECRET);

    String payload = "{\\"temperature\\":" + String(temperature) +
      ",\\"humidity\\":" + String(humidity) +
      ",\\"moisture\\":" + String(moisture) + "}";

    int code = http.POST(payload);
    Serial.println("HTTP " + String(code) + ": " + http.getString());
    http.end();
  }
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
                  <th className="py-3 px-4 font-medium">Last Seen</th>
                  <th className="py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, idx) => {
                  const statusDisplay = getStatusDisplay(device.status);
                  const isTestingThis = testingDevice === device.id;
                  const thisTestResult = testResult?.deviceId === device.id ? testResult : null;

                  return (
                    <tr key={idx} className="border-b border-border-subtle/50 hover:bg-surface-elevated transition-colors">
                      <td className="py-4 px-4 font-bold text-content-primary font-mono text-body-sm">{device.id}</td>
                      <td className="py-4 px-4 text-body-sm text-content-secondary">{device.type}</td>
                      <td className="py-4 px-4 text-body-sm text-content-primary">{device.zone}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold ${statusDisplay.classes}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dot} ${device.status === "online" ? "animate-pulse" : ""}`} />
                          {statusDisplay.label}
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
                      <td className="py-4 px-4 text-body-sm text-content-secondary">{device.lastSeen}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={isTestingThis || !device.secret}
                            onClick={() => handleSendTestReading(device)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-micro font-bold bg-signal-info/10 text-signal-info hover:bg-signal-info/20 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isTestingThis ? (
                              <><Loader2 size={12} className="animate-spin" /> Sending...</>
                            ) : (
                              <><Send size={12} /> Test Reading</>
                            )}
                          </motion.button>
                          {thisTestResult && (
                            <span className={`text-micro ${thisTestResult.success ? "text-signal-success" : "text-signal-critical"}`}>
                              {thisTestResult.message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); setProvisionError(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-base border border-border-subtle rounded-3xl p-8 w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto notification-scroll"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-h3 font-bold text-content-primary">Provision New ESP32</h2>
                <button onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); setProvisionError(null); }} className="text-content-muted hover:text-content-primary cursor-pointer">
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

                  {provisionError && (
                    <div className="p-3 rounded-xl bg-signal-critical/10 border border-signal-critical/20 text-body-sm text-signal-critical">
                      {provisionError}
                    </div>
                  )}

                  <div className="pt-4 flex gap-3 justify-end">
                    <button onClick={() => setShowProvisioning(false)} className="px-6 py-3 rounded-xl font-bold text-content-secondary hover:bg-surface-elevated transition-colors cursor-pointer">Cancel</button>
                    <button 
                      onClick={handleGenerate} 
                      disabled={provisioning}
                      className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {provisioning && <Loader2 size={16} className="animate-spin" />}
                      {provisioning ? "Provisioning..." : "Generate Credentials"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`p-4 rounded-xl ${provisionError ? "bg-signal-warning/10 border-signal-warning/20" : "bg-signal-success/10 border-signal-success/20"} border flex items-start gap-3`}>
                    <CheckCircle2 className={provisionError ? "text-signal-warning mt-0.5" : "text-signal-success mt-0.5"} size={20} />
                    <div>
                      <h3 className="font-bold text-content-primary">{provisionError ? "Device Created (Local Only)" : "Device Provisioned Successfully"}</h3>
                      <p className="text-body-sm text-content-secondary mt-1">
                        {provisionError || "Copy the credentials below to your ESP32 hardware."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-4 font-mono text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-content-secondary">Device ID</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-content-primary select-all">{generatedCreds.id}</span>
                          <button onClick={() => handleCopy(generatedCreds.id, "id")} className="text-content-muted hover:text-signal-info cursor-pointer">
                            {copied === "id" ? <CheckCircle2 size={14} className="text-signal-success" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-content-secondary">Secret</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-content-primary select-all">{generatedCreds.secret}</span>
                          <button onClick={() => handleCopy(generatedCreds.secret, "secret")} className="text-content-muted hover:text-signal-info cursor-pointer">
                            {copied === "secret" ? <CheckCircle2 size={14} className="text-signal-success" /> : <Copy size={14} />}
                          </button>
                        </div>
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
                    <button onClick={() => { setShowProvisioning(false); setGeneratedCreds(null); setProvisionError(null); }} className="px-6 py-3 rounded-xl font-bold bg-content-primary text-surface-base hover:opacity-90 transition-opacity cursor-pointer">Done</button>
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
