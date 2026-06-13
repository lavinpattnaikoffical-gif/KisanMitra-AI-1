// src/utils/api.ts
// In production (Vercel), use relative URLs — vercel.json rewrites proxy /api/* to EC2.
// In local dev, fall back to direct EC2 URL.
const BACKEND_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://52.90.130.245:4000");

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("kisan_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // ── Auth & OTP ──
  sendOtp: async (phone: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  verifyOtp: async (phone: string, otp: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phone, otp }),
    });
    return res.json();
  },

  registerOtp: async (userData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateProfile: async (data: any) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ── Farms ──
  getFarms: async () => {
    const res = await fetch(`${BACKEND_URL}/api/farms`, { headers: getHeaders() });
    return res.json();
  },

  createFarm: async (data: { name: string; location: string; totalArea: number; areaUnit: string }) => {
    const res = await fetch(`${BACKEND_URL}/api/farms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getFarm: async (farmId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/farms/${farmId}`, { headers: getHeaders() });
    return res.json();
  },

  // ── Zones ──
  getZones: async (farmId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, { headers: getHeaders() });
    return res.json();
  },

  createZone: async (farmId: string, data: any) => {
    const res = await fetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getZoneOverview: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/zones/${zoneId}/overview`, { headers: getHeaders() });
    return res.json();
  },

  // ── Devices ──
  createDevice: async (data: { zoneId: string; role: string; type: string; firmware?: string }) => {
    const res = await fetch(`${BACKEND_URL}/api/devices`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getDevicesByZone: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/devices/zone/${zoneId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // ── Dashboard & Telemetry ──
  getDashboard: async () => {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  getDashboardStats: async () => {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  getZoneLatestTelemetry: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/telemetry/${zoneId}/latest`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  sendTestTelemetry: async (deviceId: string, deviceSecret: string, data: any) => {
    const res = await fetch(`${BACKEND_URL}/api/telemetry/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-secret": deviceSecret,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ── Intelligence & AI ──
  chatAI: async (message: string, language: string = "English", history: Array<{role: string; text: string}> = []) => {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, language, history }),
    });
    return res.json();
  },

  getAIRecommendation: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/ai/recommendation/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  evaluateZone: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/intelligence/evaluate-zone/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  // ── Marketplace ──
  getProducts: async () => {
    const res = await fetch(`${BACKEND_URL}/api/products/`, { headers: getHeaders() });
    return res.json();
  },

  getMyListings: async () => {
    const res = await fetch(`${BACKEND_URL}/api/products/seller/mine`, { headers: getHeaders() });
    return res.json();
  },

  createListing: async (productData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/products/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
    return res.json();
  },

  // ── IoT Dashboard (Legacy) ──
  getIotDashboard: async () => {
    const res = await fetch(`${BACKEND_URL}/api/iot/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  // ── Activity Logs ──
  getFarmActivityLogs: async () => {
    const res = await fetch(`${BACKEND_URL}/api/updates/my`, { headers: getHeaders() });
    return res.json();
  },

  createFarmActivityLog: async (logData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/updates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(logData)
    });
    return res.json();
  },

  // ── Disease Scans ──
  saveDiseaseScan: async (reportData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/disease/report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(reportData),
    });
    return res.json();
  },
};
