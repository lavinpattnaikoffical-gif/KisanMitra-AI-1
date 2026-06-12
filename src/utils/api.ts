// src/utils/api.ts
const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "https://52.90.130.245:4000";

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("kisan_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth & OTP
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

  // Farms
  getFarms: async () => {
    const res = await fetch(`${BACKEND_URL}/api/farms`, { headers: getHeaders() });
    return res.json();
  },

  createFarm: async (farmData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/farms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(farmData),
    });
    return res.json();
  },

  // Zones
  getZones: async (farmId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, { headers: getHeaders() });
    return res.json();
  },

  createZone: async (farmId: string, zoneData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(zoneData),
    });
    return res.json();
  },

  getZoneOverview: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/zones/${zoneId}/overview`, { headers: getHeaders() });
    return res.json();
  },

  // Devices
  createDevice: async (deviceData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/devices`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(deviceData),
    });
    return res.json();
  },

  // Dashboard & Telemetry
  getDashboard: async () => {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, { headers: getHeaders() });
    return res.json();
  },

  // Intelligence & AI
  evaluateZone: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/intelligence/evaluate-zone/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  chatAI: async (message: string) => {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  // Marketplace (Legacy/Mock)
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

  // Activity Logs (Legacy/Mock)
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

  // Disease Scans (Legacy/Mock)
  saveDiseaseScan: async (reportData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/disease/report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(reportData),
    });
    return res.json();
  },

  // Telemetry — Live sensor data
  getZoneLatestTelemetry: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/telemetry/${zoneId}/latest`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getDashboardStats: async () => {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // AI recommendation for a zone
  getAIRecommendation: async (zoneId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/ai/recommendation/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  }
};
