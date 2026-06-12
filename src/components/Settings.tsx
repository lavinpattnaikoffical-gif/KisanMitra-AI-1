/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  User, 
  Settings as SettingsIcon, 
  Database, 
  RefreshCw, 
  Globe, 
  Sliders, 
  Compass, 
  Trash2,
  FileDown,
  Lock,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";
import { UserProfile } from "../types";
import { TRANSLATIONS, LanguageCode, LANGUAGES } from "../translations";

interface SettingsProps {
  profile: UserProfile;
  selectedLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
}

export default function Settings({
  profile,
  selectedLanguage,
  setLanguage,
  onUpdateProfile,
  onResetData
}: SettingsProps) {
  const t = TRANSLATIONS[selectedLanguage];

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [crop, setCrop] = useState(profile.cropType);
  const [size, setSize] = useState(profile.farmSize.toString());
  const [farmUnit, setFarmUnit] = useState(profile.farmSizeUnit);
  const [farmState, setFarmState] = useState(profile.state);
  const [district, setDistrict] = useState(profile.district);
  
  // Settings configs
  const [cloudSync, setCloudSync] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !district.trim()) return;

    const updatedProfile: UserProfile = {
      name,
      phone,
      cropType: crop,
      farmSize: parseFloat(size) || 1.0,
      farmSizeUnit: farmUnit,
      state: farmState,
      district,
      language: selectedLanguage,
      temperatureUnit: tempUnit
    };

    onUpdateProfile(updatedProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Farmer record exporter
  const handleExportDataSubmit = () => {
    const backupObj = {
      app: "KisanMitr AI Backup",
      timestamp: new Date().toISOString(),
      profile: {
        name,
        phone,
        crop,
        size,
        farmUnit,
        farmState,
        district,
        selectedLanguage
      },
      exportVersion: "2.1-AA"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `KisanMitr_Records_${profile.name}_${new Date().getDate()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none font-sans">
      {/* Settings Forms - 7 cols */}
      <div className="lg:col-span-7">
        <form onSubmit={handleSave} className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-body-md font-bold text-content-primary uppercase tracking-widest flex items-center gap-2 border-b border-border-subtle pb-4">
            <User size={20} className="text-signal-success" />
            {t.profileTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Name Form */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="farmer-name-input">Farmer Name</label>
              <input
                id="farmer-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              />
            </div>

            {/* Mobile Contact Form */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="farmer-phone-input">Mobile Contact (+91)</label>
              <input
                id="farmer-phone-input"
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              />
            </div>

            {/* Profile State selection */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="state-select">{t.onbState}</label>
              <select
                id="state-select"
                value={farmState}
                onChange={(e) => setFarmState(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Punjab">Punjab</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>

            {/* Profile District details */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="district-select-input">{t.onbDistrict}</label>
              <input
                id="district-select-input"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              />
            </div>

            {/* Profile Crop selection */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="crop-select">Primary Cultivated Crop</label>
              <select
                id="crop-select"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              >
                <option value="Cotton">Cotton / कपास</option>
                <option value="Tomato">Tomato / टमाटर</option>
                <option value="Wheat">Wheat / गेहूं</option>
                <option value="Paddy">Rice Paddy / धान</option>
                <option value="Onion">Onion / प्याज</option>
                <option value="Soybean">Soybean / सोयाबीन</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Farm size details */}
              <div className="space-y-1.5">
                <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="farm-size-select">{t.cropSize}</label>
                <input
                  id="farm-size-select"
                  type="number"
                  step="0.1"
                  required
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
                />
              </div>

              {/* Farm units select */}
              <div className="space-y-1.5">
                <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="unit-select">Farm Unit</label>
                <select
                  id="unit-select"
                  value={farmUnit}
                  onChange={(e: any) => setFarmUnit(e.target.value)}
                  className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-2 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
                >
                  <option value="Acres">Acres</option>
                  <option value="Bigha">Bigha</option>
                  <option value="Hectares">Hectares</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick inline language changer inside form parameters */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <span className="text-micro font-bold text-content-muted uppercase tracking-widest block">Application Language</span>
            <div className="flex flex-wrap gap-3 select-none">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  id={`config-lang-btn-${lang.code}`}
                  type="button"
                  onClick={() => setLanguage(lang.code as LanguageCode)}
                  className={`px-4 py-2.5 rounded-xl text-caption font-bold border transition-all duration-normal cursor-pointer shadow-sm ${
                    selectedLanguage === lang.code
                      ? "bg-content-primary border-content-primary text-surface-base"
                      : "bg-surface-base border-border-subtle hover:border-border-strong text-content-primary"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <button
            id="save-changes-btn"
            type="submit"
            className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base font-bold text-body-md rounded-2xl shadow-md transition-opacity cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            {t.saveChanges}
          </button>

          {saveSuccess && (
            <div className="text-center p-3 rounded-xl bg-signal-success/10 border border-signal-success/20">
              <p className="text-caption text-signal-success font-bold tracking-wide">✓ {t.savedMsg}</p>
            </div>
          )}
        </form>
      </div>

      {/* Settings Options sidebar & diagnostic parameters - 5 cols */}
      <div className="lg:col-span-5 space-y-6">
        {/* Agricultural AI System parameters */}
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <h3 className="text-micro font-bold text-content-muted uppercase tracking-widest border-b border-border-subtle pb-3">{t.apiConfigTitle}</h3>

          <div className="space-y-5 select-none">
            {/* Preferred Model Choice */}
            <div className="space-y-1.5">
              <label className="text-micro font-bold text-content-muted uppercase tracking-widest block" htmlFor="model-select">{t.modelChoice}</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors shadow-sm"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              </select>
            </div>

            {/* Cloud Synchronization toggles */}
            <div className="flex items-center justify-between py-3 border-t border-b border-border-subtle">
              <div>
                <p className="text-body-sm font-bold text-content-primary">{t.cloudSync}</p>
                <p className="text-caption text-content-muted font-semibold mt-0.5 tracking-wide">Continuous backup of local logs & scan histories</p>
              </div>

              <button
                id="cloud-sync-toggle"
                onClick={() => setCloudSync(!cloudSync)}
                className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer focus:outline-none shadow-inner ${
                  cloudSync ? "bg-signal-success" : "bg-border-strong"
                }`}
              >
                <span className={`absolute top-1 bg-surface-base w-5 h-5 rounded-full transition-transform shadow-sm ${
                  cloudSync ? "translate-x-8" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* Units standard preference toggles (temp standard C vs F) */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-body-sm font-bold text-content-primary">Telemetry Temperature Metric</p>
                <p className="text-caption text-content-muted font-semibold mt-0.5 tracking-wide">Prefer weather data listed in Celsius units</p>
              </div>

              <div className="flex bg-surface-base rounded-lg p-1 border border-border-subtle shadow-inner">
                {["C", "F"].map((u) => (
                  <button
                    key={u}
                    id={`temp-unit-btn-${u}`}
                    onClick={() => setTempUnit(u as any)}
                    className={`px-3 py-1.5 text-caption font-bold rounded-md transition-all duration-fast cursor-pointer ${
                      tempUnit === u ? "bg-content-primary text-surface-base shadow-sm" : "text-content-muted hover:text-content-primary"
                    }`}
                  >
                    °{u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Portability Backups and Security Hardening section */}
        <section className="material-elevated border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <h3 className="text-micro font-bold text-content-muted uppercase tracking-widest border-b border-border-subtle pb-3">DATA PORTABILITY & BACKUP</h3>

          <div className="space-y-4">
            {/* Export data button */}
            <button
              id="export-data-btn"
              onClick={handleExportDataSubmit}
              type="button"
              className="w-full h-12 bg-surface-base hover:bg-border-subtle text-content-primary text-body-sm font-bold rounded-xl border border-border-subtle hover:border-border-strong transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <FileDown size={18} />
              <span>{t.exportData}</span>
            </button>

            {/* Clear database reset button */}
            <button
              id="reset-data-btn"
              onClick={() => {
                const confirmed = window.confirm(selectedLanguage === "Hindi" ? "क्या आप सचमुच सारा डेटा हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।" : "Are you sure you want to delete all cached farm logs, profiles, and scan records? This action cannot be undone.");
                if (confirmed) {
                  onResetData();
                }
              }}
              type="button"
              className="w-full h-12 bg-signal-critical/5 hover:bg-signal-critical/10 text-signal-critical text-body-sm font-bold rounded-xl border border-signal-critical/20 hover:border-signal-critical/50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Trash2 size={16} />
              <span>{t.deleteAccount}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
