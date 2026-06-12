/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Phone, CheckCircle, Shield, Compass, Sprout, Landmark, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { TRANSLATIONS, LANGUAGES, LanguageCode } from "../translations";
import { api } from "../utils/api";

interface LoginOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  selectedLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

export default function LoginOnboarding({ onComplete, selectedLanguage, setLanguage }: LoginOnboardingProps) {
  const t = TRANSLATIONS[selectedLanguage];
  
  const [step, setStep] = useState<"language" | "phone" | "otp" | "setup">("language");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);
  
  // Onboarding parameters
  const [crop, setCrop] = useState("Cotton");
  const [farmSize, setFarmSize] = useState("2.5");
  const [farmUnit, setFarmUnit] = useState<"Acres" | "Bigha" | "Hectares">("Acres");
  const [farmState, setFarmState] = useState("Maharashtra");
  const [district, setDistrict] = useState("Nashik");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((v) => v - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const sanitized = phone.replace(/\D/g, "");
    if (sanitized.length !== 10) {
      setError(selectedLanguage === "Hindi" ? "कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें!" : "Please enter a valid 10-digit mobile number!");
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.sendOtp(sanitized);
      if (res.success) {
        setOtpSent(true);
        setTimer(30);
        setStep("otp");
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 4) {
      setError(selectedLanguage === "Hindi" ? "गलत ओटीपी।" : "Invalid verification code.");
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.verifyOtp(phone, otp);
      if (res.success) {
        if (res.data.action === "login") {
          localStorage.setItem("kisan_token", res.data.token);
          onComplete({ ...res.data.user, language: selectedLanguage });
        } else {
          setStep("setup");
        }
      } else {
        setError(res.message || "Invalid OTP");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!name.trim()) {
      setError(selectedLanguage === "Hindi" ? "कृपया अपना नाम दर्ज करें!" : "Please enter your name!");
      return;
    }
    if (!district.trim()) {
      setError(selectedLanguage === "Hindi" ? "कृपया अपना जिला दर्ज करें!" : "Please enter your district name!");
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.registerOtp({
        name,
        phone,
        cropType: crop,
        farmSize: parseFloat(farmSize) || 2.5,
        farmSizeUnit: farmUnit,
        state: farmState,
        district
      });
      
      if (res.success) {
        localStorage.setItem("kisan_token", res.data.token);
        onComplete({ ...res.data.user, language: selectedLanguage });
      } else {
        setError(res.message || "Registration failed");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-between p-6 select-none font-sans transition-colors duration-normal">
      {/* Top Brand Block */}
      <header className="w-full max-w-md mx-auto pt-8 flex flex-col items-center">
        <div className="flex items-center gap-3 text-signal-success mb-3 scale-110">
          <Sprout size={36} className="drop-shadow-sm" strokeWidth={2} />
          <h1 className="text-h3 font-bold tracking-tight">{t.appName}</h1>
        </div>
        <p className="text-body-md text-content-secondary font-medium text-center">{t.tagline}</p>
      </header>

      {/* Center Dynamic Onboarding Workspace */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <AnimatePresence mode="wait">
          {step === "language" && (
            <motion.div
              key="language-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="material-glass rounded-[2rem] p-8 shadow-2xl border border-border-subtle"
            >
              <div className="flex items-center gap-3 text-content-primary mb-8">
                <Globe size={22} className="text-signal-success" />
                <h2 className="text-h4 font-bold">Select App Language / भाषा चुनें</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    id={`lang-btn-${lang.code}`}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setStep("phone");
                    }}
                    className={`h-14 w-full rounded-2xl flex items-center justify-between px-6 text-body-md font-bold transition-all duration-normal ease-spring ${
                      selectedLanguage === lang.code
                        ? "bg-content-primary text-surface-base shadow-lg scale-[0.98]"
                        : "bg-surface-elevated text-content-primary hover:bg-border-subtle hover:scale-[1.02]"
                    }`}
                  >
                    <span>{lang.label}</span>
                    {selectedLanguage === lang.code && <CheckCircle size={18} className="text-surface-base" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div
              key="phone-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="material-glass rounded-[2rem] p-8 shadow-2xl border border-border-subtle"
            >
              <h2 className="text-h4 font-bold text-content-primary mb-6 flex items-center gap-3">
                <Phone size={22} className="text-signal-success" />
                {t.contPhone}
              </h2>

              <form onSubmit={handlePhoneSubmit} className="space-y-5">
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-body-md font-bold text-content-muted border-r border-border-subtle pr-3">
                      +91
                    </span>
                    <input
                      id="phone-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      placeholder={t.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl pl-18 pr-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-all duration-normal placeholder-content-muted"
                    />
                  </div>
                  {error && <p className="text-caption font-semibold text-signal-critical pl-1" role="alert">{error}</p>}
                </div>

                <button
                  id="send-otp-btn"
                  type="submit"
                  className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base font-bold text-body-md rounded-2xl transition-opacity shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield size={18} />
                  {t.sendOTP}
                </button>
              </form>

              <div className="relative my-6 flex items-center justify-center">
                <span className="absolute w-full border-t border-border-subtle" />
                <span className="relative bg-surface-base px-3 text-micro text-content-muted font-bold uppercase tracking-widest">OR</span>
              </div>

              <button
                id="google-signin"
                onClick={() => setStep("setup")}
                className="w-full h-14 bg-surface-elevated text-content-primary hover:bg-border-subtle font-bold rounded-2xl transition-all duration-fast text-body-sm flex items-center justify-center gap-2 cursor-pointer border border-border-subtle"
              >
                <Compass size={18} />
                {t.continueGoogle}
              </button>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="material-glass rounded-[2rem] p-8 shadow-2xl border border-border-subtle"
            >
              <h2 className="text-h4 font-bold text-content-primary mb-2">{t.verifyOTP}</h2>
              <p className="text-body-sm text-content-secondary leading-relaxed mb-8">
                {t.otpSentMsg} <span className="font-bold text-content-primary font-mono">+91 {phone}</span>.
                <br />
                <span className="text-signal-success font-bold mt-1 inline-block">Use test OTP: 1234</span>
              </p>

              <form onSubmit={handleOtpVerify} className="space-y-6">
                <div className="space-y-2">
                  <div 
                    className="flex gap-3 justify-center relative select-none cursor-pointer"
                    onClick={() => otpInputRef.current?.focus()}
                  >
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-16 h-16 rounded-2xl border-[1.5px] flex items-center justify-center text-h3 font-bold font-mono transition-all duration-fast ${
                          otp.length === idx
                            ? "border-signal-success bg-surface-elevated shadow-lg animate-pulse"
                            : otp[idx]
                            ? "border-border-strong bg-surface-base text-content-primary"
                            : "border-border-subtle bg-surface-elevated text-content-muted"
                        }`}
                      >
                        {otp[idx] || ""}
                      </div>
                    ))}
                    <input
                      ref={otpInputRef}
                      id="hidden-otp-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-transparent border-none outline-none focus:ring-0 z-10 cursor-text"
                    />
                  </div>
                  {error && <p className="text-caption text-signal-critical font-bold text-center mt-3" role="alert">{error}</p>}
                </div>

                <button
                  id="confirm-otp-btn"
                  type="submit"
                  className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base text-body-md font-bold rounded-2xl transition-opacity shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t.confirmBtn}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-body-sm text-content-muted font-medium">
                      {t.resendOTP} <span className="font-bold text-content-primary font-mono">{timer}s</span>
                    </p>
                  ) : (
                    <button
                      id="resend-otp-btn"
                      type="button"
                      onClick={() => {
                        setTimer(30);
                        setError("");
                      }}
                      className="text-body-sm font-bold text-content-primary hover:text-signal-success transition-colors duration-fast underline decoration-border-strong underline-offset-4"
                    >
                      Resend SMS Code
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}

          {step === "setup" && (
            <motion.div
              key="setup-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="material-glass rounded-[2rem] p-8 shadow-2xl border border-border-subtle max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <h2 className="text-h4 font-bold text-content-primary mb-2 flex items-center gap-3">
                <Landmark size={22} className="text-signal-success" />
                {t.onbTitle}
              </h2>
              <p className="text-body-sm text-content-secondary mb-8 font-medium">Customize localized agroclimate parameters</p>

              <div className="space-y-6">
                {/* Name Option */}
                <div className="space-y-2">
                  <label className="text-caption font-bold text-content-secondary uppercase tracking-wider block" htmlFor="name-input">
                    Full Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl px-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors placeholder-content-muted"
                  />
                </div>

                {/* Crop Option */}
                <div className="space-y-3">
                  <label className="text-caption font-bold text-content-secondary uppercase tracking-wider select-none block">
                    {t.onbCrop}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Cotton", "Tomato", "Wheat", "Soybean", "Sugarcane", "Onion"].map((cOption) => (
                      <button
                        key={cOption}
                        type="button"
                        onClick={() => {
                          setCrop(cOption);
                          // Suggest district by default to save farmers effort
                          if (cOption === "Cotton") setDistrict("Nashik");
                          else if (cOption === "Wheat") setDistrict("Amritsar");
                          else if (cOption === "Soybean") setDistrict("Indore");
                          else if (cOption === "Sugarcane") setDistrict("Mandya");
                        }}
                        className={`py-3.5 rounded-2xl border-[1.5px] text-body-sm font-bold transition-all duration-fast ${
                          crop === cOption
                            ? "bg-content-primary border-content-primary text-surface-base shadow-lg"
                            : "bg-surface-elevated border-border-subtle text-content-primary hover:border-border-strong"
                        }`}
                      >
                        {cOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Farm Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-caption font-bold text-content-secondary uppercase tracking-wider block" htmlFor="farm-size-input">
                      {t.onbSize}
                    </label>
                    <input
                      id="farm-size-input"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl px-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-bold text-content-secondary uppercase tracking-wider block" htmlFor="farm-unit-select">
                      Unit
                    </label>
                    <select
                      id="farm-unit-select"
                      value={farmUnit}
                      onChange={(e: any) => setFarmUnit(e.target.value)}
                      className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl px-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors appearance-none"
                    >
                      <option value="Acres">Acres</option>
                      <option value="Bigha">Bigha</option>
                      <option value="Hectares">Hectares</option>
                    </select>
                  </div>
                </div>

                {/* State / Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-caption font-bold text-content-secondary uppercase tracking-wider block" htmlFor="farm-state-select">
                      {t.onbState}
                    </label>
                    <select
                      id="farm-state-select"
                      value={farmState}
                      onChange={(e) => {
                        const s = e.target.value;
                        setFarmState(s);
                        // Sensible defaults for states
                        if (s === "Maharashtra") setDistrict("Nashik");
                        else if (s === "Punjab") setDistrict("Amritsar");
                        else if (s === "Gujarat") setDistrict("Gondal");
                        else if (s === "Karnataka") setDistrict("Mandya");
                      }}
                      className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl px-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors appearance-none"
                    >
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Karnataka">Karnataka</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-bold text-content-secondary uppercase tracking-wider block" htmlFor="district-input">
                      {t.onbDistrict}
                    </label>
                    <input
                      id="district-input"
                      type="text"
                      placeholder="e.g. Nashik"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full h-14 bg-surface-elevated border border-border-subtle rounded-2xl px-4 text-body-md font-bold text-content-primary focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success transition-colors placeholder-content-muted"
                    />
                  </div>
                </div>

                {error && <p className="text-caption text-signal-critical font-bold" role="alert">{error}</p>}

                <button
                  id="complete-onboard-btn"
                  onClick={handleCompleteSetup}
                  className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base text-body-md font-bold rounded-2xl transition-opacity shadow-lg flex items-center justify-center gap-2 mt-6 cursor-pointer"
                >
                  <CheckCircle size={20} />
                  {t.completeOnb}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Credentials */}
      <footer className="w-full pt-6 pb-4 text-center text-caption text-content-muted font-medium select-none flex items-center justify-center gap-2">
        <span>Protected by e-NAM & PM-Kisan Architecture</span>
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse shadow-[0_0_8px_var(--color-signal-success)]" />
      </footer>
    </div>
  );
}
