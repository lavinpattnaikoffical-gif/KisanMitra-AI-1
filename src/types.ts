/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string; // Backend uses standard uuid/cuid for id instead of _id
  name: string;
  phone: string;
  role?: string;
  state: string;
  district: string;
  language?: string;
  cropType?: string; // These might be removed in user object but kept for fallback
  farmSize?: number;
  farmSizeUnit?: "Acres" | "Bigha" | "Hectares";
  temperatureUnit?: "C" | "F";
}

// ── Backend Domain Types ───────────────────────────────────────
export interface Farm {
  id: string;
  userId: string;
  name: string;
  state: string;
  district: string;
  location: string;
  totalArea: number;
  areaUnit: "ACRES" | "HECTARES" | "SQ_METERS";
  lat?: number;
  lng?: number;
  zones?: Zone[];
}

export interface Zone {
  id: string;
  farmId: string;
  name: string;
  cropType: string;
  areaSize: number;
  areaUnit: "ACRES" | "HECTARES" | "SQ_METERS";
  irrigationType: "DRIP" | "SPRINKLER" | "FLOOD" | "MANUAL";
  moistureThreshold: number;
  isAutoIrrigationEnabled: boolean;
  devices?: Device[];
  _count?: {
    sensorReadings: number;
    irrigationEvents: number;
  };
}

export interface Device {
  id: string;
  zoneId: string;
  deviceId: string;
  name: string;
  role: "SENDER" | "RECEIVER";
  type: "SOIL" | "WEATHER" | "NPK" | "PH" | "GPS" | "RELAY" | "PUMP" | "VALVE";
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastSeen?: string;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  zoneId: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  zoneId: string;
  recommendation: string;
  reason: string;
  confidence: number;
  category: "IRRIGATION" | "FERTILIZER" | "PEST" | "GENERAL";
  createdAt: string;
}

// ── UI Types ───────────────────────────────────────────────────
export interface MetricItem {
  id: string;
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  trendText: string;
  status: "success" | "warning" | "danger" | "neutral";
  sensorId: string;
  lastUpdated: string;
  sourceType: "IoT Sensor" | "Manual Log" | "Satellite Estimate";
}

export interface InboxAlert {
  id: string;
  severity: "high" | "medium" | "low";
  titleKey: string;
  descKey: string;
  details: string;
  actionKey: string;
  timestamp: string;
  tabTarget?: "activity" | "detect" | "market" | "ai" | "settings";
}

export interface MarketProduct {
  _id?: string;
  id?: string;
  name?: string;
  crop?: string;
  category: string;
  price: number;
  originalPrice?: number;
  subsidyPercent?: number;
  seller?: string;
  farmer?: string;
  rating?: number;
  soldCount?: number;
  location: string;
  isVerified?: boolean;
  image?: string;
}

export interface MandiRate {
  crop: string;
  price: number;
  prevPrice: number;
  unit: string;
  arrivals: string;
  quality: "A" | "B" | "C";
  lastUpdated: string;
  aiSuggestedRange: {
    min: number;
    max: number;
  };
  source: string;
}

export interface FarmActivityLog {
  id: string;
  activityType: "Irrigation" | "Fertilizing" | "Spraying" | "Harvesting" | "Sowing";
  cropName: string;
  amount: string;
  notes: string;
  timestamp: string;
}

export interface ScanRecord {
  id: string;
  croppedImage: string;
  cropName: string;
  diseaseName: string;
  severity: "High" | "Moderate" | "Low" | "Healthy";
  confidence: number;
  symptoms: string[];
  treatment: {
    biological: string;
    chemical: string;
    preventive: string;
  };
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  actions?: { label: string; action: string }[];
}

