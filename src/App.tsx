/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sprout, 
  Home, 
  Camera, 
  Store, 
  ClipboardList, 
  Bot, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  Sun, 
  Moon, 
  Volume2,
  MapPin,
  X,
  AlertTriangle,
  ChevronRight,
  Layers,
  Radio
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";

import { UserProfile, MetricItem, InboxAlert, MarketProduct, FarmActivityLog, ScanRecord, ChatMessage } from "./types";
import { TRANSLATIONS, LanguageCode } from "./translations";
import { api } from "./utils/api";

// Components
import LivingSurface from "./components/LivingSurface";
import LoginOnboarding from "./components/LoginOnboarding";
import Dashboard, { ZoneData } from "./components/Dashboard";
import Zones from "./components/Zones";
import Devices, { DeviceData } from "./components/Devices";
import Marketplace from "./components/Marketplace";
import Telemetry from "./components/Telemetry";
import Advisor from "./components/Advisor";
import Settings from "./components/Settings";

// Initializing beautiful mock products for PM-Kisan subsidy marketplace
const INITIAL_PRODUCTS: MarketProduct[] = [
  { id: "p1", name: "Premium Hybrid Bt-Cotton Seeds", category: "Seeds", price: 340, originalPrice: 680, subsidyPercent: 50, seller: "Mahyco India", rating: 4.6, soldCount: 420, location: "Nashik depot", isVerified: true, image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=300&q=40" },
  { id: "p2", name: "Soluble Organo-NPK Crop Fertilizer", category: "Fertilizers", price: 540, originalPrice: 900, subsidyPercent: 40, seller: "IFFCO Cooperative", rating: 4.8, soldCount: 940, location: "Pune District Depot", isVerified: true, image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=300&q=40" },
  { id: "p3", name: "Drip Irrigation Micro-Emitter Nozzle Kit", category: "Irrigation", price: 1450, originalPrice: 2900, subsidyPercent: 50, seller: "Jain Irrigation Systems", rating: 4.5, soldCount: 180, location: "Aurangabad", isVerified: true, image: "https://images.unsplash.com/photo-1563514227147-6d2ff8655700?auto=format&fit=crop&w=300&q=40" },
  { id: "p4", name: "Neem Fruit Extract Bio-Pesticide (1500ppm)", category: "Fertilizers", price: 290, originalPrice: 480, subsidyPercent: 40, seller: "Kisan Bio-Chemicals", rating: 4.4, soldCount: 310, location: "Sangli Depot", isVerified: true, image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=300&q=40" },
  { id: "p5", name: "Heavy Duty Handheld Soil pH Meter Probe", category: "Tools", price: 780, originalPrice: 1300, subsidyPercent: 40, seller: "AgroInstruments Corp", rating: 4.2, soldCount: 75, location: "Nashik depot", isVerified: false, image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=300&q=40" }
];

// Initial farm logs to show a healthy timeline
const INITIAL_LOGS: FarmActivityLog[] = [
  { id: "l1", activityType: "Irrigation", cropName: "Cotton", amount: "12mm duration", notes: "Regular morning cycle initiated via smart solenoid.", timestamp: "Yesterday, 06:15 AM" },
  { id: "l2", activityType: "Fertilizing", cropName: "Cotton", amount: "1.5 kg organic manure", notes: "Applied balanced composting formula along the middle rows.", timestamp: "2 days ago, 08:30 AM" }
];

// Initial alert cards representing Priority Inbox
const INITIAL_ALERTS: InboxAlert[] = [
  { id: "a1", severity: "high", titleKey: "moistureAlertTitle", descKey: "moistureAlertDesc", details: "Zone B moisture dropped to 42% triggering high risk of crop water deficit.", actionKey: "triggerIrr", timestamp: "10 mins ago" },
  { id: "a2", severity: "medium", titleKey: "pestAdvisorTitle", descKey: "pestAdvisorDesc", details: "Warm humid nights in Nashik increase fungal spore germination times.", actionKey: "viewDetails", timestamp: "1 hr ago", tabTarget: "detect" }
];

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("English");
  const [currentTab, setCurrentTab] = useState<"dashboard" | "zones" | "devices" | "market" | "ai" | "settings">("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{district: string; state: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Scroll tracking for atmospheric background
  const mainScrollRef = React.useRef<HTMLElement>(null);
  const { scrollY } = useScroll({ container: mainScrollRef });
  const atmosphereOpacity = useTransform(scrollY, [0, 300], [0, 0.4]);

  // Core synchronized agricultural database states
  const [metrics, setMetrics] = useState<MetricItem[]>([
    { id: "soil-moisture", label: "Soil Moisture", value: "42%", trend: "down", trendText: "-8% vs yesterday", status: "danger", sensorId: "GRID-S1", lastUpdated: "Today, 08:15 AM", sourceType: "IoT Sensor" },
    { id: "soil-temp", label: "Soil Temperature", value: "31°C", trend: "up", trendText: "+2°C vs noon", status: "neutral", sensorId: "GRID-S2", lastUpdated: "Today, 08:15 AM", sourceType: "IoT Sensor" },
    { id: "crop-vitality", label: "Crop Vitality", value: "84%", trend: "stable", trendText: "Optimal index", status: "success", sensorId: "SATELLITE-V1", lastUpdated: "Yesterday, 04:30 PM", sourceType: "Satellite Estimate" }
  ]);
  const [alerts, setAlerts] = useState<InboxAlert[]>(INITIAL_ALERTS);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [logs, setLogs] = useState<FarmActivityLog[]>(INITIAL_LOGS);
  const [products, setProducts] = useState<MarketProduct[]>(INITIAL_PRODUCTS);
  const [listings, setListings] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("kisan_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [farmDevices, setFarmDevices] = useState<DeviceData[]>([]);

  // Load from local storage and backend
  useEffect(() => {
    const initApp = async () => {
      try {
        const token = localStorage.getItem("kisan_token");
        if (token) {
          // 1. Fetch user profile
          const res = await api.getMe();
          
          if (res.success) {
            const parsed = res.data;
            setProfile(parsed);
            setSelectedLanguage(parsed.language || "English");
            localStorage.setItem("kisan_profile", JSON.stringify(parsed));

            // 2. Fetch farms + zones + devices from backend
            try {
              const farmsRes = await api.getFarms();
              if (farmsRes.success && Array.isArray(farmsRes.data) && farmsRes.data.length > 0) {
                const allZones: ZoneData[] = [];
                const allDevices: DeviceData[] = [];

                // For each farm, get full details with zones and devices
                for (const farm of farmsRes.data) {
                  try {
                    const farmDetail = await api.getFarm(farm.id);
                    if (farmDetail.success && farmDetail.data?.zones) {
                      for (const z of farmDetail.data.zones) {
                        allZones.push({
                          id: z.id,
                          name: z.name,
                          crop: z.cropType || "Unknown",
                          area: `${z.areaSize || 0} Acres`,
                          health: 100,
                          status: "healthy",
                          metrics: { moisture: "--", temp: "--", weather: "--" },
                          connectivity: false,
                        });

                        // Get devices for this zone
                        if (z.devices && Array.isArray(z.devices)) {
                          for (const d of z.devices) {
                            allDevices.push({
                              id: d.deviceId || d.id,
                              dbId: d.id,
                              type: (d.type === "SOIL" || d.type === "WEATHER" || d.type === "NPK") ? "SENSOR" : d.type === "PUMP" ? "PUMP" : "RELAY",
                              zone: z.name,
                              zoneId: z.id,
                              status: d.status === "ONLINE" ? "online" : d.status === "OFFLINE" ? "offline" : "provisioned",
                              lastSeen: d.lastSeen || new Date().toISOString(),
                              battery: 100,
                              firmware: "1.0.0",
                              secret: "",
                            });
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.warn(`Failed to fetch farm ${farm.id} details:`, err);
                  }
                }

                if (allZones.length > 0) {
                  setZones(allZones);
                  localStorage.setItem("kisan_zones", JSON.stringify(allZones));
                }
                if (allDevices.length > 0) {
                  setFarmDevices(allDevices);
                  localStorage.setItem("kisan_devices", JSON.stringify(allDevices));
                }
              }
            } catch (err) {
              console.warn("Failed to fetch farms/zones/devices from backend:", err);
            }

            // 3. Fetch other data in parallel
            const [prodRes, myProdRes, logsRes] = await Promise.all([
              api.getProducts().catch(() => null),
              api.getMyListings().catch(() => null),
              api.getFarmActivityLogs().catch(() => null)
            ]);
            
            if (prodRes && prodRes.success) setProducts(prodRes.data);
            if (myProdRes && myProdRes.success) setListings(myProdRes.data);
            if (logsRes && logsRes.success) setLogs(logsRes.data);
          } else {
            localStorage.removeItem("kisan_token");
            localStorage.removeItem("kisan_profile");
          }
        } else {
          // Fallback to local profile if token is missing
          const savedProfile = localStorage.getItem("kisan_profile");
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            setProfile(parsed);
            setSelectedLanguage(parsed.language || "English");
          }
        }
        
        // Load cached local data as fallback (will be overwritten by backend data above)
        const savedScans = localStorage.getItem("kisan_scans");
        if (savedScans) setScans(JSON.parse(savedScans));

        // Only load from localStorage if backend didn't provide them
        if (zones.length === 0) {
          const savedZones = localStorage.getItem("kisan_zones");
          if (savedZones) setZones(JSON.parse(savedZones));
        }
        if (farmDevices.length === 0) {
          const savedDevices = localStorage.getItem("kisan_devices");
          if (savedDevices) setFarmDevices(JSON.parse(savedDevices));
        }
      } catch (err) {
        console.error("Failed to initialize app data", err);
        // Last resort: try localStorage
        const savedZones = localStorage.getItem("kisan_zones");
        if (savedZones) setZones(JSON.parse(savedZones));
        const savedDevices = localStorage.getItem("kisan_devices");
        if (savedDevices) setFarmDevices(JSON.parse(savedDevices));
      }
    };
    initApp();
  }, []);

  // Update browser classes on dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kisan_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Geolocation: detect user's live location after login
  useEffect(() => {
    if (!profile) return;
    if (liveLocation) return;
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
              { headers: { "User-Agent": "KisanMitrAI/1.0" } }
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const detectedDistrict = addr.county || addr.city_district || addr.city || addr.town || addr.village || profile.district;
              const detectedState = addr.state || profile.state;
              setLiveLocation({ district: detectedDistrict, state: detectedState });
              // Auto-update profile
              const updated = { ...profile, district: detectedDistrict, state: detectedState };
              setProfile(updated);
              localStorage.setItem("kisan_profile", JSON.stringify(updated));
            }
          } catch (e) {
            console.warn("Reverse geocode failed:", e);
          } finally {
            setLocationLoading(false);
          }
        },
        () => setLocationLoading(false),
        { timeout: 8000 }
      );
    } else {
      setLocationLoading(false);
    }
  }, [profile]);

  // Sync profile language changes globally instantly
  const handleSetLanguage = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    if (profile) {
      const updated = { ...profile, language: lang };
      setProfile(updated);
      localStorage.setItem("kisan_profile", JSON.stringify(updated));
    }
  };

  const handleCompleteOnboarding = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setSelectedLanguage(newProfile.language as LanguageCode);
    localStorage.setItem("kisan_profile", JSON.stringify(newProfile));
    
    // Add warm welcome advisor message on first launch
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: "bot",
      text: newProfile.language === "Hindi" 
        ? `नमस्ते राजेश जी! RAMU में आपका स्वागत है। आपके ${newProfile.cropType} के खेत (क्षेत्र: ${newProfile.farmSize} ${newProfile.farmSizeUnit}) के लिए मैंने सभी कृषि मानकों को अनुकूलित कर दिया है। मिट्टी की नमी की जांच के लिए आप 'मुख्य पेज' और फसल सुरक्षा समीक्षा के लिए 'बीमारी स्कैनर' का उपयोग कर सकते हैं।`
        : `Namaste Rajesh! Welcome to RAMU Agricultural OS. I have successfully customized your command center matching your ${newProfile.cropType} cultivation (${newProfile.farmSize} ${newProfile.farmSizeUnit}). Reach out if you need intelligence or action recommendations!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setChatHistory([welcomeMsg]);
  };

  // Trigger hydration solenoid valve simulation
  const handleTriggerIrrigation = (zone: string) => {
    // Update local metrics immediately
    setMetrics((prev) => 
      prev.map((item) => 
        item.id === "soil-moisture" 
          ? { ...item, value: "65%", trend: "up" as const, trendText: "+23% post irrigation", status: "success" as const, lastUpdated: "Just now" } 
          : item
      )
    );
    // Dismiss alerts matching water checklist
    setAlerts((prev) => prev.filter((a) => a.actionKey !== "triggerIrr"));
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem("kisan_profile", JSON.stringify(updatedProfile));
    setLiveLocation({ district: updatedProfile.district, state: updatedProfile.state });
    api.updateProfile(updatedProfile).catch((err) => console.warn("Failed to sync profile update:", err));
  };

  const handleResetData = () => {
    localStorage.clear();
    setProfile(null);
    setCurrentTab("dashboard");
    setScans([]);
    setLogs(INITIAL_LOGS);
    setListings([]);
    setAlerts(INITIAL_ALERTS);
    setChatHistory([]);
    setZones([]);
    setFarmDevices([]);
  };

  // Add items committed across secondary logs
  const handleAddScan = async (record: ScanRecord) => {
    const list = [record, ...scans];
    setScans(list);
    localStorage.setItem("kisan_scans", JSON.stringify(list));
    // Save to backend
    api.saveDiseaseScan(record).catch(err => console.warn("Failed to sync scan:", err));
  };

  const handleAddLog = async (log: FarmActivityLog) => {
    const list = [log, ...logs];
    setLogs(list);
    localStorage.setItem("kisan_logs", JSON.stringify(list));
    // Save to backend
    api.createFarmActivityLog(log).catch(err => console.warn("Failed to sync log:", err));
  };

  const handleAddListing = async (listing: any) => {
    const list = [listing, ...listings];
    setListings(list);
    localStorage.setItem("kisan_listings", JSON.stringify(list));
    api.createListing(listing).catch(err => console.warn("Failed to sync listing:", err));
  };

  const handleAddChatMessage = (msg: ChatMessage) => {
    setChatHistory((prev) => {
      const updated = [...prev, msg];
      // Keep last 50 messages in localStorage to avoid quota issues
      const toSave = updated.slice(-50);
      try { localStorage.setItem("kisan_chat_history", JSON.stringify(toSave)); } catch {}
      return updated;
    });
  };

  const handleClearChat = () => {
    setChatHistory([]);
    try { localStorage.removeItem("kisan_chat_history"); } catch {}
  };

  const handleAskRamuContext = (contextStr: string) => {
    // Add user message with context
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: contextStr,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    handleAddChatMessage(userMsg);
    
    // Add RAMU response simulating intelligent context parsing
    setTimeout(() => {
      const ramuMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "I analyzed the cotton leaf you captured today at " + userMsg.timestamp + " in " + profile?.district + ". The most likely diagnosis is Early Leaf Spot (91% confidence). Based on the upcoming rain forecast, I strongly recommend a preventive biological spray. Would you like me to add that to your Urgent Priorities?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      handleAddChatMessage(ramuMsg);
    }, 800);
    
    setCurrentTab("ai");
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Helper dictionary keys
  const t = TRANSLATIONS[selectedLanguage];

  if (!profile) {
    return (
      <LoginOnboarding 
        onComplete={handleCompleteOnboarding} 
        selectedLanguage={selectedLanguage}
        setLanguage={handleSetLanguage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans flex flex-col transition-colors duration-normal select-none relative">
      {/* Scroll-based atmospheric depth layer */}
      <motion.div 
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-transparent to-black/10 dark:to-white/5"
        style={{ opacity: atmosphereOpacity }}
      />
      
      {/* 🧭 Premium Header */}
      <header className="sticky top-0 bg-surface-glass backdrop-blur-notification border-b border-border-subtle h-16 px-6 flex items-center justify-between z-40 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 text-content-primary group cursor-pointer">
            <motion.div whileHover={{ scale: 1.05, rotate: -5 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Sprout size={28} className="text-signal-success drop-shadow-sm" strokeWidth={2} />
            </motion.div>
            <span className="font-bold tracking-tight text-h4">{t.appName}</span>
          </div>

          <span className="h-4 border-l border-border-subtle hidden sm:inline" />

          {/* District + live location */}
          <div className="hidden sm:flex items-center gap-2 text-body-sm font-medium text-content-secondary">
            <MapPin size={14} className="text-content-muted" />
            <span>{liveLocation ? `${liveLocation.district}, ${liveLocation.state}` : `${profile.district} District`}</span>
            {locationLoading ? (
              <span className="w-1.5 h-1.5 rounded-full bg-signal-warning animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse" />
            )}
          </div>
        </div>

        {/* Dynamic header menus: Theme switcher, notifications indicator, profiles */}
        <div className="flex items-center gap-4 select-none">
          {/* Quick Tab indicators inside header */}
          <span className="text-body-sm font-medium text-content-secondary mr-2 hidden md:inline">
            🚜 {profile.name} ({profile.cropType})
          </span>

          {/* Theme custom Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 rounded-xl bg-surface-elevated hover:bg-border-subtle flex items-center justify-center transition-colors cursor-pointer focus:outline-none text-content-primary"
            aria-label="Toggle dark mode theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          {/* Active Notifications Indicator popup button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id="notifications-indicator-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl bg-surface-elevated hover:bg-border-subtle flex items-center justify-center transition-colors cursor-pointer relative focus:outline-none text-content-primary"
            aria-label="Open notifications panel"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-signal-critical w-2 h-2 rounded-full animate-pulse" />
            )}
          </motion.button>

          {/* Quick Settings Icon on mobile devices */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id="mobile-settings-btn"
            onClick={() => {
              setCurrentTab("settings");
              stopTTS();
            }}
            className={`lg:hidden w-10 h-10 rounded-xl bg-surface-elevated hover:bg-border-subtle flex items-center justify-center transition-colors cursor-pointer focus:outline-none text-content-primary ${
              currentTab === "settings" ? "bg-border-strong" : ""
            }`}
            aria-label="Open settings panel"
          >
            <SettingsIcon size={18} />
          </motion.button>
        </div>
      </header>

      {/* Main Panel Core Frame */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        
        {/* Module Sidebar (Desktop) - Premium Floating Design */}
        <nav className="w-64 hidden lg:flex flex-col py-6 px-6 select-none relative z-10">
          <div className="material-glass rounded-3xl p-3 flex flex-col justify-between h-full shadow-sm">
            <div className="space-y-1.5">
              {[
                { id: "dashboard", label: "Home", icon: Home },
                { id: "zones", label: "Zones", icon: Layers },
                { id: "devices", label: "Devices", icon: Radio },
                { id: "market", label: t.market, icon: Store },
                { id: "ai", label: "Ramu", icon: Bot },
                { id: "settings", label: t.settings, icon: SettingsIcon }
              ].map((navItem) => (
                <motion.button
                  key={navItem.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id={`sidebar-nav-${navItem.id}`}
                  onClick={() => {
                    setCurrentTab(navItem.id as any);
                    stopTTS();
                  }}
                  className={`w-full h-11 rounded-xl px-4 flex items-center gap-3 text-body-sm font-medium transition-colors cursor-pointer ${
                    currentTab === navItem.id
                      ? "bg-content-primary text-surface-base shadow-md"
                      : "text-content-secondary hover:bg-border-subtle hover:text-content-primary"
                  }`}
                >
                  <navItem.icon size={18} className={currentTab === navItem.id ? "stroke-[2px]" : "stroke-[1.5px]"} />
                  <span>{navItem.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Logout Action button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="sidebar-logout-btn"
              onClick={handleResetData}
              className="w-full h-11 rounded-xl px-4 flex items-center gap-3 text-body-sm font-medium text-signal-critical hover:bg-signal-critical/10 cursor-pointer transition-colors duration-fast"
            >
              <LogOut size={18} strokeWidth={1.5} />
              <span>Sign Out</span>
            </motion.button>
          </div>
        </nav>



        {/* Main Content Workspace viewport */}
        <main 
          ref={mainScrollRef}
          className={`flex-1 relative select-none z-10 ${
          currentTab === "ai" 
            ? "overflow-hidden pb-20 lg:pb-0" 
            : "overflow-y-auto px-4 py-6 sm:px-6 md:py-8 pb-20"
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={currentTab === "ai" ? "h-full" : ""}
            >
              {currentTab === "dashboard" && (
                <Dashboard 
                  profile={profile} 
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={setCurrentTab}
                  zones={zones}
                />
              )}

              {currentTab === "zones" && (
                <Zones
                  profile={profile}
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={setCurrentTab}
                  zones={zones}
                  onAddZone={(zone) => {
                    const updated = [...zones, zone];
                    setZones(updated);
                    localStorage.setItem("kisan_zones", JSON.stringify(updated));
                  }}
                />
              )}

              {currentTab === "devices" && (
                <Devices
                  profile={profile}
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={setCurrentTab}
                  zones={zones}
                  devices={farmDevices}
                  onAddDevice={(device) => {
                    const updated = [...farmDevices, device];
                    setFarmDevices(updated);
                    localStorage.setItem("kisan_devices", JSON.stringify(updated));
                  }}
                />
              )}

              {currentTab === "market" && (
                <Marketplace 
                  profile={profile} 
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={setCurrentTab}
                  products={products}
                  userListings={listings}
                  onAddListing={handleAddListing}
                />
              )}

              {currentTab === "ai" && (
                <Advisor 
                  profile={profile} 
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={setCurrentTab}
                  chatHistory={chatHistory}
                  onAddChatMessage={handleAddChatMessage}
                  onTriggerIrrigation={handleTriggerIrrigation}
                  contextEntryTab={currentTab}
                  onClearChat={handleClearChat}
                />
              )}

              {currentTab === "settings" && (
                <Settings 
                  profile={profile} 
                  selectedLanguage={selectedLanguage}
                  setLanguage={handleSetLanguage}
                  onUpdateProfile={handleUpdateProfile}
                  onResetData={handleResetData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Helper trigger clear speech helper */}
      <span className="hidden">
        {/* Standard helper speech canceller */}
      </span>

      {/* Floating Bottom Menu Navigation Dock (Mobile Only) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 material-glass border-t-0 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] h-20 flex items-center justify-around z-40 select-none pb-safe px-2">
        {[
          { id: "dashboard", label: "Home", icon: Home },
          { id: "zones", label: "Zones", icon: Layers },
          { id: "devices", label: "Devices", icon: Radio },
          { id: "market", label: "Market", icon: Store },
          { id: "ai", label: "AI", icon: Bot }
        ].map((dockItem) => (
          <motion.button
            key={dockItem.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            id={`dock-nav-btn-${dockItem.id}`}
            onClick={() => {
              setCurrentTab(dockItem.id as any);
              stopTTS();
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors focus:outline-none cursor-pointer ${
              currentTab === dockItem.id
                ? "text-content-primary"
                : "text-content-muted hover:text-content-primary hover:bg-border-subtle"
            }`}
          >
            <dockItem.icon size={22} strokeWidth={currentTab === dockItem.id ? 2 : 1.5} />
            <span className="text-micro font-medium mt-1">{dockItem.label}</span>
          </motion.button>
        ))}
      </div>

      {/* 🚀 Universal RAMU Floating Command Center */}
      <AnimatePresence>
        {currentTab !== "ai" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 right-6 z-40"
          >
            <LivingSurface
              tier="interactive"
              onClick={() => setCurrentTab("ai")}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-content-primary text-surface-base shadow-2xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer relative group"
            >
              <Bot size={24} />
              {/* RAMU Idle 'Observing' state - calm ambient pulse */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-info opacity-40" style={{ animationDuration: '3s' }}></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-signal-info border-[1.5px] border-surface-base"></span>
              </span>
            </LivingSurface>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === NOTIFICATION PANEL === */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Desktop: Slide-in right sidebar */}
            <div className="hidden lg:block">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
              />
              {/* Premium Floating Panel */}
              <motion.div
                initial={{ x: 380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 380, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed right-6 top-6 bottom-6 w-[360px] material-glass rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-content-primary">
                      <Bell size={16} />
                    </div>
                    <h2 className="text-body-lg font-bold text-content-primary">Intelligence Center</h2>
                    {alerts.length > 0 && (
                      <span className="text-micro font-bold bg-signal-critical text-white px-2 py-0.5 rounded-full">{alerts.length}</span>
                    )}
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center hover:bg-border-subtle transition-colors cursor-pointer text-content-muted hover:text-content-primary">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 notification-scroll">
                  {alerts.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-16 h-16 rounded-full bg-surface-elevated mx-auto flex items-center justify-center">
                        <Bell size={24} className="text-content-muted" />
                      </div>
                      <p className="text-body-md font-medium text-content-secondary">All clear</p>
                      <p className="text-body-sm text-content-muted">No active intelligence alerts.</p>
                    </div>
                  ) : (
                    alerts.map((alert, idx) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, type: "spring", damping: 20 }}
                        className="material-surface p-4 rounded-2xl relative overflow-hidden group"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.severity === 'high' ? 'bg-signal-critical' : 'bg-signal-warning'}`} />
                        
                        <div className="flex items-start gap-3 ml-2">
                          <AlertTriangle size={16} className={alert.severity === "high" ? "text-signal-critical shrink-0 mt-0.5" : "text-signal-warning shrink-0 mt-0.5"} />
                          <div className="min-w-0">
                            <p className="text-body-sm font-semibold text-content-primary">
                              {alert.titleKey === "moistureAlertTitle" ? "Critical: Zone B Soil Moisture 42%" : alert.titleKey === "pestAdvisorTitle" ? "Seasonal Alert: Cotton Pest Cycle" : alert.titleKey}
                            </p>
                            <p className="text-caption text-content-secondary mt-1">{alert.details}</p>
                            <p className="text-micro text-content-muted mt-2 uppercase tracking-wide">{alert.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-9 mt-4">
                          <button onClick={() => { handleDismissAlert(alert.id); }} className="text-caption font-medium text-content-secondary px-3 py-1.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer">Dismiss</button>
                          <button onClick={() => { if (alert.tabTarget) { setCurrentTab(alert.tabTarget as any); } setShowNotifications(false); }} className="text-caption font-semibold text-surface-base bg-content-primary px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1 cursor-pointer transition-opacity">
                            <span>Review Data</span><ChevronRight size={12} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* Mobile: Full-screen blurred overlay with bubble cards */}
            <div className="lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-surface-base/60 backdrop-blur-3xl z-50 flex flex-col items-center justify-center p-6"
                onClick={(e) => { if (e.target === e.currentTarget) setShowNotifications(false); }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto notification-scroll"
                >
                  {/* Close button */}
                  <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-h4 font-bold text-content-primary">Intelligence</h2>
                    <button onClick={() => setShowNotifications(false)} className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center shadow-sm cursor-pointer text-content-primary">
                      <X size={18} />
                    </button>
                  </div>

                  {alerts.length === 0 ? (
                    <div className="bg-surface-glass rounded-[2rem] p-8 text-center shadow-xl space-y-3 border border-border-subtle">
                      <div className="w-16 h-16 rounded-full bg-surface-elevated mx-auto flex items-center justify-center">
                        <Bell size={24} className="text-content-muted" />
                      </div>
                      <p className="text-body-md font-bold text-content-primary">All Clear</p>
                      <p className="text-body-sm text-content-secondary">No active alerts right now.</p>
                    </div>
                  ) : (
                    alerts.map((alert, idx) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.1, type: "spring", damping: 20 }}
                        className={`bg-surface-glass rounded-3xl p-5 shadow-xl space-y-3 border ${
                          alert.severity === "high" ? "border-signal-critical/30" : "border-signal-warning/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${alert.severity === "high" ? "bg-signal-critical animate-pulse shadow-[0_0_8px_var(--color-signal-critical)]" : "bg-signal-warning"}`} />
                          <p className="text-body-sm font-bold text-content-primary">
                            {alert.titleKey === "moistureAlertTitle" ? "Critical: Soil Moisture 42%" : alert.titleKey === "pestAdvisorTitle" ? "Pest Cycle Alert" : alert.titleKey}
                          </p>
                        </div>
                        <p className="text-body-sm text-content-secondary leading-relaxed">{alert.details}</p>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleDismissAlert(alert.id)} className="flex-1 text-caption font-medium text-content-secondary py-3 bg-surface-elevated rounded-xl hover:bg-border-subtle transition-colors cursor-pointer">Dismiss</button>
                          <button onClick={() => { if (alert.tabTarget) setCurrentTab(alert.tabTarget as any); setShowNotifications(false); }} className="flex-1 text-caption font-semibold text-surface-base bg-content-primary py-3 rounded-xl hover:opacity-90 cursor-pointer transition-opacity">Review Data</button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Clean helper to safely cancel voice synthesis on route context switches
function stopTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
