/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Store, 
  Tag, 
  Trash2, 
  ShoppingBag, 
  CheckCircle, 
  Share2, 
  ChevronRight, 
  Sparkles, 
  HelpCircle,
  TrendingUp,
  MapPin,
  Flame,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, MarketProduct, MandiRate } from "../types";
import { TRANSLATIONS, LanguageCode } from "../translations";

interface MarketplaceProps {
  profile: UserProfile;
  selectedLanguage: LanguageCode;
  onNavigateTab: (tab: any) => void;
  products: MarketProduct[];
  userListings: any[];
  onAddListing: (listing: any) => void;
}

export default function Marketplace({
  profile,
  selectedLanguage,
  onNavigateTab,
  products,
  userListings,
  onAddListing
}: MarketplaceProps) {
  const t = TRANSLATIONS[selectedLanguage];

  const [activeSegment, setActiveSegment] = useState<"buy" | "sell" | "rates">("rates");
  const [mandiState, setMandiState] = useState(profile.state);
  const [mandiRates, setMandiRates] = useState<MandiRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Cart system
  const [cart, setCart] = useState<{ product: MarketProduct; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Listing fields
  const [selectedCrop, setSelectedCrop] = useState("Cotton");
  const [commodityWeight, setCommodityWeight] = useState("20");
  const [askingPrice, setAskingPrice] = useState("6500");
  const [selectedQuality, setSelectedQuality] = useState<"A" | "B" | "C">("A");
  const [listingSuccess, setListingSuccess] = useState(false);

  // Fetch Mandi Rates Based on State Selection
  const fetchRates = async (stateVal: string) => {
    setRatesLoading(true);
    try {
      const response = await fetch(`/api/mandi-rates?state=${encodeURIComponent(stateVal)}`);
      const body = await response.json();
      setMandiRates(body.rates || []);
    } catch (err) {
      console.warn("Unable to get real rates:", err);
      // fallback rates
      setMandiRates([
        { crop: "Cotton", price: 6850, prevPrice: 6710, unit: "Qtl", arrivals: "Medium", quality: "A", lastUpdated: "Today", aiSuggestedRange: { min: 6900, max: 7300 }, source: "Mandi" },
        { crop: "Wheat", price: 2275, prevPrice: 2250, unit: "Qtl", arrivals: "High", quality: "A", lastUpdated: "Today", aiSuggestedRange: { min: 2310, max: 2400 }, source: "Mandi" },
      ]);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(mandiState);
  }, [mandiState]);

  // Handle Cart Operations
  const addToCart = (product: MarketProduct) => {
    setCart((prev) => {
      const exists = prev.find((item) => (item.product._id || item.product.id) === (product._id || product.id));
      if (exists) {
        return prev.map((item) => (item.product._id || item.product.id) === (product._id || product.id) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (pId: string) => {
    setCart((prev) => prev.filter((item) => (item.product._id || item.product.id) !== pId));
  };

  const handleCheckout = () => {
    setCheckoutSuccess(true);
    setCart([]);
    setTimeout(() => {
      setCheckoutSuccess(false);
      setCartOpen(false);
    }, 4500);
  };

  // List product
  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityWeight || !askingPrice) return;

    const newPr = {
      id: `user-list-${Date.now()}`,
      crop: selectedCrop,
      weight: parseFloat(commodityWeight),
      price: parseFloat(askingPrice),
      quality: selectedQuality,
      location: `${profile.district}, ${mandiState}`,
      timestamp: "Just now",
      isSold: false
    };

    onAddListing(newPr);
    setListingSuccess(true);
    setCommodityWeight("");
    setTimeout(() => setListingSuccess(false), 3000);
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => {
      const actualPrice = item.product.price;
      return acc + (actualPrice * item.quantity);
    }, 0);
  };

  // Mandi Rate helper lookup
  const cropPriceFactor = mandiRates.find(r => r.crop === selectedCrop);

  return (
    <div className="space-y-6 select-none font-sans relative">
      {/* 🧭 Horizontal segment switches */}
      <div className="flex border-b border-border-subtle select-none gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: "rates", label: t.liveMandiRates, icon: TrendingUp },
          { id: "buy", label: t.buyInputs, icon: ShoppingBag },
          { id: "sell", label: t.sellProduce, icon: Tag }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id={`mkt-segment-btn-${tab.id}`}
            onClick={() => setActiveSegment(tab.id as any)}
            className={`pb-4 text-body-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSegment === tab.id
                ? "border-content-primary text-content-primary"
                : "border-transparent text-content-muted hover:text-content-primary"
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Segment 1 — Mandi rates list */}
      <AnimatePresence mode="wait">
        {activeSegment === "rates" && (
          <motion.div
            key="rates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Rates State drop control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 material-elevated border border-border-subtle rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-signal-success" />
                <span className="text-body-sm font-bold text-content-primary">{t.selectState}:</span>
                <select
                  id="mandi-state-select"
                  value={mandiState}
                  onChange={(e) => setMandiState(e.target.value)}
                  className="bg-surface-base text-body-sm font-bold border border-border-subtle rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-signal-success/30 shadow-inner"
                >
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Karnataka">Karnataka</option>
                </select>
              </div>

              <span className="text-micro font-bold text-content-muted uppercase tracking-widest hidden sm:block">Powered by Agmarknet portal sync</span>
            </div>

            {/* Rates Grid */}
            {ratesLoading ? (
              <div className="text-center py-16 material-elevated rounded-3xl border border-border-subtle shadow-sm">
                <div className="w-10 h-10 border-4 border-content-primary border-t-transparent rounded-full animate-spin mx-auto pb-2" />
                <p className="text-body-sm text-content-muted font-bold mt-4">Loading live market intelligence rates...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mandiRates.map((rate, idx) => {
                  const priceDiff = rate.price - rate.prevPrice;
                  const isUp = priceDiff >= 0;
                  return (
                    <div
                      key={idx}
                      className="material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm flex justify-between gap-5 hover:border-border-strong transition-colors duration-normal"
                    >
                      <div className="space-y-4 flex-1">
                        <div>
                          <span className="text-micro font-bold text-signal-warning bg-signal-warning/10 px-2.5 py-1 rounded-md uppercase tracking-widest">{rate.arrivals}</span>
                          <h4 className="text-body-lg font-bold text-content-primary mt-2">{rate.crop}</h4>
                        </div>

                        {/* Current Price and indicator */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-title font-bold font-mono text-content-primary tracking-tight">₹{rate.price}</span>
                          <span className="text-caption font-semibold text-content-muted">per {rate.unit}</span>
                          
                          <span className={`text-body-sm font-bold flex items-center ml-2 ${isUp ? "text-signal-success" : "text-signal-critical"}`}>
                            {isUp ? "▲" : "▼"} ₹{Math.abs(priceDiff)}
                          </span>
                        </div>

                        <div className="bg-signal-success/5 p-4 rounded-2xl border border-signal-success/20 space-y-1">
                          <span className="text-micro font-bold text-signal-success uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={14} /> {t.suggestedAiPrice}
                          </span>
                          <p className="text-body-sm font-bold text-content-primary font-mono mt-1">₹{rate.aiSuggestedRange.min} - ₹{rate.aiSuggestedRange.max}</p>
                          <p className="text-micro text-content-muted font-medium mt-1">Optimized for A-Grade moisture index</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end text-right">
                        <div>
                          <p className="text-micro text-content-muted font-bold tracking-wide">Mandi Grade</p>
                          <p className="text-body-sm font-bold text-signal-success font-mono mt-0.5">{rate.quality}-Grade</p>
                        </div>
                        <span className="text-micro font-semibold text-content-muted mt-4 inline-block">eNAM Live</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Segment 2 — Buy Farming inputs */}
        {activeSegment === "buy" && (
          <motion.div
            key="buy-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Subsidy Info Callout Banner */}
            <div className="bg-signal-success/10 border border-signal-success/20 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-body-sm font-bold text-signal-success flex items-center gap-2">
                  <Flame size={18} className="animate-pulse" />
                  PM-Kisan Input Subsidies Activated
                </h4>
                <p className="text-caption text-content-muted font-medium mt-1">
                  Govt. subsidized inputs listed below are verified under PM-KVK direct-benefit guidelines.
                </p>
              </div>

              {/* Cart Drawer activator widget */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="cart-toggle-btn"
                onClick={() => setCartOpen(true)}
                className="relative bg-content-primary hover:opacity-90 text-surface-base flex items-center gap-2 px-5 py-3 rounded-xl text-body-sm font-bold focus:outline-none cursor-pointer shadow-sm transition-opacity shrink-0"
              >
                <ShoppingBag size={16} />
                <span>{cart.length} Products</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-signal-critical text-surface-base w-5 h-5 text-micro font-bold rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </motion.button>
            </div>

            {/* Products catalog list with subsidy percentages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((item) => (
                <div
                  key={item._id || item.id}
                  className="material-elevated border border-border-subtle rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-signal-success/40 transition-colors duration-normal group"
                >
                  <div className="space-y-3">
                    <div className="relative h-36 rounded-2xl overflow-hidden bg-surface-base">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-slow" />
                      {item.subsidyPercent && (
                        <span className="absolute top-3 left-3 bg-signal-warning text-surface-base text-micro font-bold px-2.5 py-1 rounded-md shadow-sm">
                          {t.governmentSubsidy} {item.subsidyPercent}%
                        </span>
                      )}
                      {item.isVerified && (
                        <span className="absolute bottom-3 right-3 bg-signal-success text-surface-base text-micro font-bold px-2 py-1 rounded-md shadow-sm select-none">Govt. Certified</span>
                      )}
                    </div>

                    <div className="pt-2">
                      <span className="text-micro font-bold text-content-muted uppercase tracking-widest block mb-1">{item.category}</span>
                      <h4 className="text-body-sm font-bold text-content-primary line-clamp-1">{item.name}</h4>
                      <p className="text-caption text-content-muted font-medium mt-1">Seller: {item.seller} · Nashik Depot</p>
                    </div>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-title font-bold font-mono text-signal-success tracking-tight">₹{item.price}</span>
                      {item.originalPrice && (
                        <span className="text-body-sm text-content-muted line-through font-mono">₹{item.originalPrice}</span>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    id={`add-to-cart-btn-${item._id || item.id}`}
                    onClick={() => addToCart(item)}
                    className="w-full h-12 mt-4 bg-surface-base hover:bg-border-subtle border border-border-subtle hover:border-border-strong text-content-primary text-body-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={16} />
                    <span>{t.buyNow}</span>
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Segment 3 — Sell produce form */}
        {activeSegment === "sell" && (
          <motion.div
            key="sell-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Listing Creator Form - 5 cols */}
            <form onSubmit={handleCreateListing} className="lg:col-span-5 material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-body-md font-bold text-content-primary uppercase tracking-widest border-b border-border-subtle pb-3">{t.sellProduce}</h3>

              <div className="space-y-5">
                {/* Crop selector */}
                <div className="space-y-1.5">
                  <label className="text-micro font-bold text-content-muted uppercase tracking-widest" htmlFor="crop-sell-select">{t.cropToSell}</label>
                  <select
                    id="crop-sell-select"
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 transition-colors shadow-sm"
                  >
                    <option value="Cotton">Cotton / कपास</option>
                    <option value="Soybean">Soybean / सोयाबीन</option>
                    <option value="Wheat">Wheat / गेहूं</option>
                    <option value="Paddy">Rice Paddy / धान</option>
                    <option value="Onion">Onion / प्याज</option>
                    <option value="Tomato">Tomato / टमाटर</option>
                  </select>
                </div>

                {/* Weight Input */}
                <div className="space-y-1.5">
                  <label className="text-micro font-bold text-content-muted uppercase tracking-widest" htmlFor="weight-input">{t.addWeight}</label>
                  <input
                    id="weight-input"
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={commodityWeight}
                    onChange={(e) => setCommodityWeight(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-12 bg-surface-base text-body-sm font-medium border border-border-subtle rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-signal-success/30 transition-colors shadow-sm"
                  />
                </div>

                {/* Asking Target Price Input with currency fix (pl-12) */}
                <div className="space-y-1.5">
                  <label className="text-micro font-bold text-content-muted uppercase tracking-widest" htmlFor="price-input">{t.askingPrice}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-body-sm font-bold text-content-muted">₹</span>
                    <input
                      id="price-input"
                      type="number"
                      required
                      placeholder="e.g. 6800"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-12 bg-surface-base border border-border-subtle rounded-xl pl-10 pr-4 text-body-sm font-bold focus:outline-none focus:ring-2 focus:ring-signal-success/30 transition-colors shadow-sm"
                    />
                  </div>
                  <p className="text-caption text-content-muted font-semibold mt-1">{t.fixedPaddingFix}</p>
                </div>

                {/* Quality options */}
                <div className="space-y-2">
                  <label className="text-micro font-bold text-content-muted uppercase tracking-widest">Quality Grade (Moisture verified)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["A", "B", "C"].map((grade) => (
                      <motion.button
                        key={grade}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        id={`grade-btn-${grade}`}
                        type="button"
                        onClick={() => setSelectedQuality(grade as any)}
                        className={`py-2.5 text-body-sm font-bold rounded-xl border transition-colors shadow-sm cursor-pointer ${
                          selectedQuality === grade
                            ? "bg-signal-success/10 border-signal-success text-signal-success"
                            : "bg-surface-base border-border-subtle hover:border-border-strong text-content-primary"
                        }`}
                      >
                        {grade}-Grade
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* AI pricing helper box */}
                {cropPriceFactor && (
                  <div className="bg-signal-success/5 p-4 rounded-2xl border border-signal-success/20 space-y-2 select-none">
                    <div className="flex items-center gap-1.5 text-micro font-bold text-signal-success uppercase tracking-widest">
                      <Sparkles size={14} /> Target suggestions
                    </div>
                    <p className="text-caption font-semibold text-content-muted">
                      Current Mandi: <span className="font-bold text-content-primary font-mono">₹{cropPriceFactor.price}/qtl</span>
                    </p>
                    <p className="text-caption font-semibold text-content-muted">
                      FPO AI target recommendation: <span className="font-bold text-signal-success font-mono">₹{cropPriceFactor.aiSuggestedRange.min} - ₹{cropPriceFactor.aiSuggestedRange.max}</span>
                    </p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id="list-produce-btn"
                  type="submit"
                  className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base font-bold text-body-md rounded-2xl shadow-md transition-opacity cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {t.listProduceBtn}
                </motion.button>
              </div>

              {listingSuccess && (
                <div className="text-center p-3 bg-signal-success/10 rounded-xl border border-signal-success/20 mt-4">
                  <p className="text-caption text-signal-success font-bold tracking-wide">✓ Listing published live to local buyers and FPOs!</p>
                </div>
              )}
            </form>

            {/* Active Listings list - 7 cols */}
            <div className="lg:col-span-7 material-elevated border border-border-subtle rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="text-body-md font-bold text-content-primary uppercase tracking-widest border-b border-border-subtle pb-3">{t.myActiveListings}</h3>

              <div className="space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
                {userListings.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-20 h-20 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center mb-4 shadow-sm">
                      <Store className="text-content-muted" size={28} />
                    </div>
                    <p className="text-body-md font-bold text-content-primary mb-1">No Active Listings</p>
                    <p className="text-body-sm text-content-secondary max-w-xs mx-auto leading-relaxed">You haven't listed any produce yet. Use the FPO AI target recommendations to list your crops.</p>
                  </div>
                ) : (
                  userListings.map((listing) => (
                    <div
                      key={listing._id || listing.id}
                      className="p-5 bg-surface-base border border-border-subtle rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-border-strong transition-colors duration-normal"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-micro font-bold text-signal-success bg-signal-success/10 px-2.5 py-1 rounded-md uppercase tracking-widest">
                            {listing.crop}
                          </span>
                          <span className="text-caption font-bold text-content-muted">{listing.timestamp}</span>
                        </div>
                        <h4 className="text-body-sm font-bold text-content-primary mt-2">{listing.weight} Quintals · {listing.quality}-Grade</h4>
                        <p className="text-body-sm font-bold text-signal-success font-mono mt-1">Asking target: ₹{listing.price}/qtl</p>
                      </div>

                      <div className="flex items-center gap-2 mt-3 sm:mt-0">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          id={`whatsapp-btn-${listing._id || listing.id}`}
                          onClick={() => {
                            // Mock sharing details
                            navigator.clipboard.writeText(`Selling cotton: ${listing.weight} Qtl, target ${listing.price}/qtl. Location: ${listing.location}`);
                            alert("Listing copied to clipboard! Ready to share directly via WhatsApp.");
                          }}
                          className="flex items-center gap-2 px-4 py-2 border border-border-subtle hover:border-border-strong rounded-xl text-body-sm font-bold text-content-muted hover:text-content-primary transition-colors cursor-pointer shadow-sm w-full sm:w-auto justify-center"
                        >
                          <Share2 size={16} />
                          <span>{t.whatsappShare}</span>
                        </motion.button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛒 Shopping Cart drawer bottom sheet */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            key="cart-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end select-none"
          >
            <motion.div
              key="cart-drawer-content"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-sm material-elevated h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between border-l border-border-subtle"
            >
              <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                  <h4 className="text-body-md font-bold text-content-primary uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag size={20} className="text-signal-success" />
                    {t.cartTitle}
                  </h4>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    id="close-cart-btn"
                    onClick={() => setCartOpen(false)}
                    className="text-body-sm font-bold text-content-muted hover:text-content-primary transition-colors cursor-pointer"
                  >
                    Close
                  </motion.button>
                </div>

                {checkoutSuccess ? (
                  <div className="py-16 text-center space-y-4">
                    <CheckCircle className="text-signal-success w-16 h-16 mx-auto animate-bounce" />
                    <div className="space-y-2">
                      <h4 className="text-body-md font-bold text-content-primary">Order Placed Successfully!</h4>
                      <p className="text-body-sm text-content-muted leading-relaxed max-w-xs mx-auto">{t.orderSavedSuccess}</p>
                    </div>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="bg-surface-glass rounded-[2rem] p-8 text-center shadow-sm border border-border-subtle my-auto mt-20">
                    <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border-subtle mx-auto flex items-center justify-center mb-4 shadow-sm">
                      <ShoppingBag size={28} className="text-content-muted" />
                    </div>
                    <p className="text-body-md font-bold text-content-primary mb-1">Your cart is empty</p>
                    <p className="text-body-sm text-content-secondary max-w-[200px] mx-auto leading-relaxed">{t.emptyCart || "Add verified inputs with PM-Kisan subsidies to see them here."}</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {cart.map((item) => (
                      <div
                        key={item.product._id || item.product.id}
                        className="p-4 bg-surface-base border border-border-subtle rounded-2xl flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-body-sm font-bold text-content-primary line-clamp-1">{item.product.name}</h5>
                          <p className="text-caption text-signal-success font-bold font-mono mt-1">₹{item.product.price} · Qty: {item.quantity}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          id={`remove-cart-item-btn-${item.product._id || item.product.id}`}
                          aria-label="Remove item"
                          onClick={() => removeFromCart((item.product._id || item.product.id) as string)}
                          className="text-signal-critical hover:opacity-80 p-2 cursor-pointer shrink-0 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!checkoutSuccess && cart.length > 0 && (
                <div className="border-t border-border-subtle pt-6 space-y-5">
                  <div className="flex justify-between items-center text-body-sm font-bold text-content-primary">
                    <span>Invoice Subtotal:</span>
                    <span className="font-mono text-title font-bold text-signal-success tracking-tight">₹{calculateSubtotal()}</span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    id="checkout-cart-btn"
                    onClick={handleCheckout}
                    className="w-full h-14 bg-content-primary hover:opacity-90 text-surface-base font-bold text-body-md rounded-2xl shadow-md transition-opacity cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{t.processPayment}</span>
                    <ChevronRight size={18} />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
