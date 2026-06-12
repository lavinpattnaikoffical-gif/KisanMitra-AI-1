/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  _id?: string;
  name: string;
  phone: string;
  role?: string;
  state: string;
  district: string;
  language: string;
  cropType: string;
  farmSize: number;
  farmSizeUnit: "Acres" | "Bigha" | "Hectares";
  temperatureUnit: "C" | "F";
}

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
