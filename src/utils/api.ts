// src/utils/api.ts
// In production (Vercel), use relative URLs — vercel.json rewrites proxy /api/* to EC2.
// In local dev, fall back to direct EC2 URL.
const BACKEND_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://52.90.130.245:4000");

// ── Auth expiry callback ──
// App.tsx subscribes to this so it can redirect to login on 401
let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(cb: () => void) {
  onAuthExpired = cb;
}

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("kisan_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Centralized fetch wrapper. Handles:
 * - JSON parsing
 * - 401 detection → clear token, trigger logout callback
 * - Network error wrapping
 */
async function apiFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);

    // If unauthorized, clear auth and trigger logout
    if (res.status === 401) {
      localStorage.removeItem("kisan_token");
      localStorage.removeItem("kisan_profile");
      if (onAuthExpired) onAuthExpired();
      return { success: false, message: "Session expired. Please log in again." };
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API fetch failed: ${url}`, err);
    return { success: false, message: err.message || "Network error" };
  }
}

/**
 * Normalize profile fields before sending to backend.
 * Converts farmSizeUnit casing (Acres → ACRES) and strips frontend-only fields.
 */
function normalizeProfileForBackend(data: any): any {
  const payload: any = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.state !== undefined) payload.state = data.state;
  if (data.district !== undefined) payload.district = data.district;
  if (data.pincode !== undefined) payload.pincode = data.pincode;
  if (data.language !== undefined) payload.language = data.language;
  if (data.cropType !== undefined) payload.cropType = data.cropType;
  if (data.farmSize !== undefined) payload.farmSize = typeof data.farmSize === "string" ? parseFloat(data.farmSize) || 0 : data.farmSize;

  // Normalize farmSizeUnit to uppercase enum (Acres → ACRES)
  if (data.farmSizeUnit !== undefined) {
    payload.farmSizeUnit = data.farmSizeUnit.toUpperCase();
  }

  // Normalize temperatureUnit
  if (data.temperatureUnit !== undefined) {
    payload.temperatureUnit = data.temperatureUnit;
  }

  return payload;
}

export const api = {
  // ── Auth & OTP ──
  sendOtp: async (phone: string) => {
    return apiFetch(`${BACKEND_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
  },

  verifyOtp: async (phone: string, otp: string) => {
    return apiFetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phone, otp }),
    });
  },

  registerOtp: async (userData: any) => {
    return apiFetch(`${BACKEND_URL}/api/auth/register-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
  },

  getMe: async () => {
    return apiFetch(`${BACKEND_URL}/api/auth/me`, {
      headers: getHeaders(),
    });
  },

  updateProfile: async (data: any) => {
    const normalized = normalizeProfileForBackend(data);
    return apiFetch(`${BACKEND_URL}/api/auth/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(normalized),
    });
  },

  // ── Farms ──
  getFarms: async () => {
    return apiFetch(`${BACKEND_URL}/api/farms`, { headers: getHeaders() });
  },

  createFarm: async (data: { name: string; location: string; totalArea: number; areaUnit: string }) => {
    return apiFetch(`${BACKEND_URL}/api/farms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  getFarm: async (farmId: string) => {
    return apiFetch(`${BACKEND_URL}/api/farms/${farmId}`, { headers: getHeaders() });
  },

  // ── Zones ──
  getZones: async (farmId: string) => {
    return apiFetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, { headers: getHeaders() });
  },

  createZone: async (farmId: string, data: any) => {
    return apiFetch(`${BACKEND_URL}/api/farms/${farmId}/zones`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  getZoneOverview: async (zoneId: string) => {
    return apiFetch(`${BACKEND_URL}/api/zones/${zoneId}/overview`, { headers: getHeaders() });
  },

  // ── Devices ──
  createDevice: async (data: { zoneId: string; role: string; type: string; firmware?: string }) => {
    return apiFetch(`${BACKEND_URL}/api/devices`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  deleteDevice: async (deviceId: string) => {
    return apiFetch(`${BACKEND_URL}/api/devices/${deviceId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  getDevicesByZone: async (zoneId: string) => {
    return apiFetch(`${BACKEND_URL}/api/devices/zone/${zoneId}`, {
      headers: getHeaders(),
    });
  },

  // ── Dashboard & Telemetry ──
  getDashboard: async () => {
    return apiFetch(`${BACKEND_URL}/api/dashboard`, { headers: getHeaders() });
  },

  getDashboardStats: async () => {
    return apiFetch(`${BACKEND_URL}/api/dashboard`, { headers: getHeaders() });
  },

  getZoneLatestTelemetry: async (zoneId: string) => {
    return apiFetch(`${BACKEND_URL}/api/telemetry/${zoneId}/latest`, {
      headers: getHeaders(),
    });
  },

  sendTestTelemetry: async (deviceId: string, deviceSecret: string, data: any) => {
    // Device telemetry uses device-level auth, not JWT — skip apiFetch 401 handling
    try {
      const res = await fetch(`${BACKEND_URL}/api/telemetry/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
          "x-device-secret": deviceSecret,
        },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || "Network error" };
    }
  },

  // ── Intelligence & AI ──
  chatAI: async (message: string, language: string = "English", history: Array<{role: string; text: string}> = []) => {
    return apiFetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, language, history }),
    });
  },

  getAIRecommendation: async (zoneId: string) => {
    return apiFetch(`${BACKEND_URL}/api/ai/recommendation/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  evaluateZone: async (zoneId: string) => {
    return apiFetch(`${BACKEND_URL}/api/intelligence/evaluate-zone/${zoneId}`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  // ── Marketplace ──
  getProducts: async () => {
    return apiFetch(`${BACKEND_URL}/api/products/`, { headers: getHeaders() });
  },

  getMyListings: async () => {
    return apiFetch(`${BACKEND_URL}/api/products/seller/mine`, { headers: getHeaders() });
  },

  createListing: async (productData: any) => {
    return apiFetch(`${BACKEND_URL}/api/products/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
  },

  // ── IoT Dashboard (Legacy) ──
  getIotDashboard: async () => {
    return apiFetch(`${BACKEND_URL}/api/iot/dashboard`, { headers: getHeaders() });
  },

  // ── Activity Logs ──
  getFarmActivityLogs: async () => {
    return apiFetch(`${BACKEND_URL}/api/updates/my`, { headers: getHeaders() });
  },

  createFarmActivityLog: async (logData: any) => {
    return apiFetch(`${BACKEND_URL}/api/updates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(logData)
    });
  },

  // ── Disease Scans ──
  saveDiseaseScan: async (reportData: any) => {
    return apiFetch(`${BACKEND_URL}/api/disease/report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(reportData),
    });
  },

  // ── Mandi Prices (Agmarknet / data.gov.in) ──
  /**
   * Fetch daily mandi prices for a crop.
   * Falls back to mock data on the server side if live data isn't available.
   */
  mandiPrices: async (
    crop: string,
    state?: string,
    district?: string
  ): Promise<{
    crop: string;
    state: string | null;
    district: string | null;
    records: Array<{
      state: string;
      district: string;
      market: string;
      commodity: string;
      variety: string;
      grade: string;
      arrivalDate: string;
      minPrice: number;
      maxPrice: number;
      modalPrice: number;
      fetchedAt: string;
    }>;
    lastUpdated: string;
    exactMatch: boolean;
    isStale: boolean;
    source: "Agmarknet / data.gov.in" | "mock";
    note?: string;
    totalResults: number;
  }> => {
    const params = new URLSearchParams({ crop });
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    return apiFetch(`/api/mandi-prices?${params.toString()}`);
  },

  /**
   * Fetch the full commodity list for autocomplete.
   */
  mandiCommodities: async (): Promise<{
    commodities: string[];
    updatedAt: string | null;
    total: number;
  }> => {
    return apiFetch(`/api/mandi-prices/commodities`);
  },
};
