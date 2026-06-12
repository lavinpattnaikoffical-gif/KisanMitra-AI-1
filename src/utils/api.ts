// src/utils/api.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://43.205.94.151";

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

  // Marketplace
  getProducts: async () => {
    const res = await fetch(`${BACKEND_URL}/api/products/`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getMyListings: async () => {
    const res = await fetch(`${BACKEND_URL}/api/products/seller/mine`, {
      headers: getHeaders(),
    });
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

  // Telemetry & IoT
  getIotDashboard: async () => {
    const res = await fetch(`${BACKEND_URL}/api/iot/dashboard`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getFarmActivityLogs: async () => {
    const res = await fetch(`${BACKEND_URL}/api/updates/my`, {
      headers: getHeaders(),
    });
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

  // Disease Scans
  saveDiseaseScan: async (reportData: any) => {
    const res = await fetch(`${BACKEND_URL}/api/disease/report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(reportData),
    });
    return res.json();
  }
};
