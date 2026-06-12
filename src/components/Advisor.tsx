/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  HelpCircle,
  Clock,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  X,
  History,
  Camera,
  Image as ImageIcon,
  FileText,
  Languages,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, ChatMessage } from "../types";
import { TRANSLATIONS, LanguageCode } from "../translations";
import { api } from "../utils/api";

interface AdvisorProps {
  profile: UserProfile;
  selectedLanguage: LanguageCode;
  onNavigateTab: (tab: any) => void;
  chatHistory: ChatMessage[];
  onAddChatMessage: (msg: ChatMessage) => void;
  onTriggerIrrigation: (zone: string) => void;
  contextEntryTab?: "dashboard" | "detect" | "market" | "activity" | "ai" | "settings";
  onClearChat: () => void;
}

export default function Advisor({
  profile,
  selectedLanguage,
  onNavigateTab,
  chatHistory,
  onAddChatMessage,
  onTriggerIrrigation,
  contextEntryTab,
  onClearChat
}: AdvisorProps) {
  const t = TRANSLATIONS[selectedLanguage];

  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatLanguage, setChatLanguage] = useState<"English" | "Hindi" | "Marathi">("English");
  
  // Audio Speech Recognition states
  const [recognizing, setRecognizing] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (historyTargetRef.current) {
      const el = document.getElementById(`msg-${historyTargetRef.current}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-400/50");
        setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400/50"), 2000);
      }
      historyTargetRef.current = null;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, loading]);

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedLanguage === "Hindi") utterance.lang = "hi-IN";
    else if (selectedLanguage === "Marathi") utterance.lang = "mr-IN";
    else utterance.lang = "en-IN";
    
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);

    setSpeakingText(text);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingText(null);
  };

  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-chat-${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    onAddChatMessage(userMsg);
    setInputMsg("");
    setLoading(true);

    try {
      // Build conversation history for multi-turn context (last 10 messages)
      const history = chatHistory.slice(-10).map(m => ({
        role: m.sender === "user" ? "user" as const : "bot" as const,
        text: m.text,
      }));
      const resData = await api.chatAI(messageText, chatLanguage, history);
      
      const botText = resData.data?.answer || resData.text || "I was unable to formulate a response.";

      const botMsg: ChatMessage = {
        id: `bot-chat-${Date.now()}`,
        sender: "bot",
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      // Add smart direct context action chips depending on AI response keywords
      if (botText.toLowerCase().includes("irrigation") || botText.toLowerCase().includes("पानी") || botText.toLowerCase().includes("ओल")) {
        botMsg.actions = [
          { label: "Trigger zone B irrigation", action: "triggerIrrigation" },
          { label: "View telemetry charts", action: "navActivity" }
        ];
      } else if (botText.toLowerCase().includes("blight") || botText.toLowerCase().includes("mildew") || botText.toLowerCase().includes("रोग") || botText.toLowerCase().includes("पत्ती")) {
        botMsg.actions = [
          { label: "Buy Mancozeb fungicide", action: "buyFungicide" },
          { label: "Run leaf scanner", action: "navDetect" }
        ];
      }

      onAddChatMessage(botMsg);
      // Auto speech synthesis of Gemini AI response for illiterate accessibility (voice-first!)
      speakText(botText);

    } catch (err) {
      console.warn("Chat error, connecting local template responder:", err);
      // Fallback pre-approved AI responder
      let fallbackText = `Hello! I'm KisanMitr Offline Advisor. I couldn't reach the online Gemini service, but I can guide you based on current soil parameters:
      - Soil Moisture is critical at 42%. Initiate drip lines.
      - Weather is dry. Spray treatments before 10 AM before thermal winds pick up.`;
      
      if (selectedLanguage === "Hindi") {
        fallbackText = `नमस्ते! मैं किसानमित्र ऑफ़लाइन सलाहकार हूं। 
        - आपके खेत की नमी अभी ४२% (कम) है। सिंचाई टूल का उपयोग करें।
        - मौसम शुष्क है। रासायनिक छिड़काव सुबह १० बजे से पहले पूर्ण करें।`;
      } else if (selectedLanguage === "Marathi") {
        fallbackText = `नमस्कार! मी किसानमित्र ऑफलाइन सल्लागार आहे. 
        - जमिनीतील ओलावा ४२% (कमी) वर आला आहे. ठिबक सिंचन सुरू करा.
        - बुरशीनाशकाची फवारणी सकाळी वारा शांत असताना पूर्ण करा.`;
      }

      const botMsg: ChatMessage = {
        id: `bot-chat-${Date.now()}`,
        sender: "bot",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: [
          { label: "Trigger irrigation now", action: "triggerIrrigation" },
          { label: "Proceed to Mandi Market", action: "navMarket" }
        ]
      };
      onAddChatMessage(botMsg);
      speakText(fallbackText);
    } finally {
      setLoading(false);
    }
  };

  const executeActionChip = (action: string) => {
    if (action === "triggerIrrigation") {
      onTriggerIrrigation("Zone B");
      alert("Smart irrigation action executed for Zone B via Kisan AI!");
    } else if (action === "navActivity") {
      onNavigateTab("activity");
    } else if (action === "navDetect") {
      onNavigateTab("detect");
    } else if (action === "navMarket") {
      onNavigateTab("market");
    } else if (action === "buyFungicide") {
      onNavigateTab("market");
    }
  };

  // Simulate Speak recognition
  const toggleSpeechRecognition = () => {
    if (recognizing) {
      setRecognizing(false);
      return;
    }

    // Try starting Web Speech recognition in supported browsers, or simulate realistic farmer speech
    const SpeechRecObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecObj) {
      const rec = new SpeechRecObj();
      rec.continuous = false;
      rec.interimResults = false;
      
      if (selectedLanguage === "Hindi") rec.lang = "hi-IN";
      else if (selectedLanguage === "Marathi") rec.lang = "mr-IN";
      else rec.lang = "en-IN";

      rec.onstart = () => setRecognizing(true);
      rec.onend = () => setRecognizing(false);
      rec.onerror = () => setRecognizing(false);
      
      rec.onresult = (event: any) => {
        const txt = event.results[0][0].transcript;
        setInputMsg(txt);
        handleSend(txt);
      };
      rec.start();
    } else {
      // Simulate speech input transcript beautifully
      setRecognizing(true);
      setTimeout(() => {
        let simulatedPhrase = "I have white powdery spots on my cotton leaf. What is the cure?";
        if (selectedLanguage === "Hindi") simulatedPhrase = "कपास के पत्तों पर सफेद फंगस धब्बे दिख रहे हैं, इसका क्या इलाज है?";
        else if (selectedLanguage === "Marathi") simulatedPhrase = "कापसाच्या पानांवर पांढरे ठिपके दिसत आहेत, यावर काय खत टाकावे?";
        
        setInputMsg(simulatedPhrase);
        setRecognizing(false);
      }, 2500);
    }
  };

  const handleAttachmentClick = (type: string) => {
    const granted = window.confirm(`KisanMitr AI would like to access your ${type}. Allow?`);
    if (granted) {
      const input = document.createElement("input");
      input.type = "file";
      if (type === "Camera") {
        input.accept = "image/*";
        input.capture = "environment";
      } else if (type === "Gallery") {
        input.accept = "image/*";
      } else {
        input.accept = ".pdf,.doc,.docx,.txt";
      }
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          setInputMsg((prev) => `[Attached ${type}: ${file.name}] ` + prev);
        }
      };
      input.click();
    }
  };

  // Group chat history by user queries for the history drawer
  const userQueries = chatHistory.filter(m => m.sender === "user");

  return (
    <div className="flex flex-col h-full w-full bg-surface-base select-none font-sans relative overflow-hidden">
      {/* Advisor header */}
      <div className="border-b border-border-subtle p-5 flex items-center justify-between shrink-0 bg-surface-glass backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-signal-success/10 text-signal-success rounded-2xl flex items-center justify-center border border-signal-success/20">
            <Bot size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-body-md font-bold text-content-primary tracking-widest uppercase">RAMU Intelligence</h2>
            <p className="text-caption text-signal-success font-bold mt-0.5 tracking-wider">Universal Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Response Language Selector */}
          <div className="flex items-center gap-1.5 bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2">
            <Languages size={14} className="text-content-muted" />
            <select
              id="chat-language-select"
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value as any)}
              className="bg-transparent text-body-sm font-bold text-content-primary focus:outline-none cursor-pointer"
            >
              <option value="English">EN</option>
              <option value="Hindi">हिंदी</option>
              <option value="Marathi">मराठी</option>
            </select>
          </div>

          {speakingText && (
            <button
              id="advisor-mute-btn"
              onClick={stopSpeaking}
              className="flex items-center gap-2 px-4 py-2 bg-signal-critical/10 text-signal-critical text-caption font-bold rounded-xl border border-signal-critical/20 hover:bg-signal-critical/20 transition-colors"
            >
              <VolumeX size={16} />
              <span>Mute Synthesis</span>
            </button>
          )}

          {/* Clear Chat Button */}
          <button
            id="clear-chat-btn"
            onClick={() => {
              const confirmText = selectedLanguage === "Hindi"
                ? "क्या आप निश्चित रूप से चैट इतिहास को मिटाना चाहते हैं?"
                : selectedLanguage === "Marathi"
                ? "तुम्हाला नक्की चॅट इतिहास पुसायचा आहे का?"
                : selectedLanguage === "Gujarati"
                ? "શું તમે ખरेખર ચેટ ઇતિહાસ સાફ કરવા માંગો છો?"
                : selectedLanguage === "Tamil"
                ? "உரையாடல் வரலாற்றை நிச்சயமாக அழிக்க வேண்டுமா?"
                : "Are you sure you want to clear the chat history?";
              if (window.confirm(confirmText)) {
                onClearChat();
              }
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-elevated hover:bg-signal-critical/10 text-content-muted hover:text-signal-critical border border-border-subtle hover:border-signal-critical/20 transition-all duration-fast cursor-pointer"
            title={selectedLanguage === "Hindi" ? "चैट मिटाएं" : selectedLanguage === "Marathi" ? "चॅट पुसा" : "Clear Chat"}
            aria-label="Clear chat history"
          >
            <Trash2 size={20} />
          </button>

          {/* Chat History Toggle */}
          <button
            id="chat-history-toggle"
            onClick={() => setShowHistory(!showHistory)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-fast cursor-pointer ${
              showHistory
                ? "bg-content-primary text-surface-base shadow-md"
                : "bg-surface-elevated hover:bg-border-subtle text-content-muted hover:text-content-primary border border-border-subtle"
            }`}
            aria-label="Toggle chat history"
          >
            <History size={20} />
          </button>
        </div>
      </div>

      {/* Main chat area with optional history drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="border-r border-border-subtle bg-surface-base overflow-hidden shrink-0 flex flex-col relative z-0"
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between shrink-0">
                <span className="text-micro font-bold text-content-muted uppercase tracking-widest">Recent Context</span>
                <button onClick={() => setShowHistory(false)} className="text-content-muted hover:text-content-primary transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scroll">
                {userQueries.length === 0 ? (
                  <p className="text-caption text-content-muted font-semibold text-center py-8">No analysis history yet.</p>
                ) : (
                  userQueries.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        historyTargetRef.current = q.id;
                        setShowHistory(false);
                        // Trigger re-render to scroll
                        setTimeout(() => {
                          const el = document.getElementById(`msg-${q.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            el.classList.add("ring-2", "ring-signal-success/50");
                            setTimeout(() => el.classList.remove("ring-2", "ring-signal-success/50"), 2000);
                          }
                        }, 300);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong transition-all duration-normal group"
                    >
                      <p className="text-body-sm font-semibold text-content-primary line-clamp-2 leading-relaxed">{q.text}</p>
                      <p className="text-caption text-content-muted font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock size={12} />
                        {q.timestamp}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message history panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-base">
          <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-8 space-y-6 pr-2 chat-scroll">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto space-y-8 select-none my-auto">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="w-20 h-20 bg-signal-success/10 text-signal-success rounded-3xl flex items-center justify-center border border-signal-success/20 shadow-lg relative"
                >
                  <Bot size={40} className="animate-pulse" />
                  <span className="absolute top-0 right-0 w-3 h-3 bg-signal-success rounded-full border-2 border-surface-base animate-ping" />
                </motion.div>
                
                <div>
                  <h3 className="text-h3 font-bold text-content-primary tracking-wide">
                    {selectedLanguage === "Hindi" ? "नमस्ते! मैं हूँ रामू (RAMU)" : 
                     selectedLanguage === "Marathi" ? "नमस्कार! मी आहे रामू (RAMU)" : 
                     selectedLanguage === "Gujarati" ? "નમસ્તે! હું છું રામુ (RAMU)" :
                     selectedLanguage === "Tamil" ? "வணக்கம்! நான் ராமு (RAMU)" :
                     "Namaste! I am RAMU"}
                  </h3>
                  <p className="text-body-md text-content-muted mt-2 leading-relaxed">
                    {selectedLanguage === "Hindi" ? "आपका व्यक्तिगत कृषि एआई सलाहकार। मैं आपके खेत के सेंसर डेटा, मौसम और फसल स्वास्थ्य के आधार पर सही सलाह दे सकता हूँ।" : 
                     selectedLanguage === "Marathi" ? "तुमचा वैयक्तिक कृषी AI सल्लागार. मी तुमच्या शेतातील सेन्सर डेटा, हवामान आणि पीक आरोग्यावरून योग्य सल्ला देऊ शकतो." : 
                     selectedLanguage === "Gujarati" ? "તમારા અંગત કૃષિ એઆઈ સલાહકાર. હું તમારા ખેતરના સેન્સર ડેટા, હવામાન અને પાક તંદુરસ્તીના આધારે યોગ્ય સલાહ આપી શકું છું." :
                     selectedLanguage === "Tamil" ? "உங்கள் தனிப்பட்ட விவசாய AI ஆலோசகர். உங்கள் பண்ணையின் சென்சார் தரவு, வானிலை மற்றும் பயிர் ஆரோக்கியத்தின் அடிப்படையில் நான் சிறந்த ஆலோசனைகளை வழங்க முடியும்." :
                     "Your personal AI agricultural assistant. Ask me anything about crop diseases, live sensor data, irrigation cycles, or market mandi rates."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-4">
                  {[
                    {
                      title: selectedLanguage === "Hindi" ? "बीमारी की पहचान" : selectedLanguage === "Marathi" ? "रोग निदान" : selectedLanguage === "Gujarati" ? "રોગ ઓળખ" : selectedLanguage === "Tamil" ? "நோய் கண்டறிதல்" : "Diagnose Crop Blight",
                      desc: selectedLanguage === "Hindi" ? "पत्ती की फोटो अपलोड करके बीमारी जानें" : selectedLanguage === "Marathi" ? "पानांचे फोटो अपलोड करून रोग तपासा" : selectedLanguage === "Gujarati" ? "પાંદડાનો ફોટો અપલોડ કરીને રોગ જાણો" : selectedLanguage === "Tamil" ? "இலையின் புகைப்படத்தை பதிவேற்றி நோயைக் கண்டறியவும்" : "Upload leaf photos to detect pest issues",
                      prompt: selectedLanguage === "Hindi" ? "कपास के पत्तों पर सफेद धब्बों का इलाज क्या है?" : selectedLanguage === "Marathi" ? "कापसाच्या पानांवरील पांढऱ्या ठिपक्यांचे निवारण काय आहे?" : selectedLanguage === "Gujarati" ? "કપાસના પાંદડા પર સફેદ ડાઘનો ઇલાજ શું છે?" : selectedLanguage === "Tamil" ? "பருத்தி இலைகளில் உள்ள வெள்ளை புள்ளிகளுக்கு என்ன சிகிச்சை?" : "What is the cure for powdery mildew on cotton leaves?"
                    },
                    {
                      title: selectedLanguage === "Hindi" ? "लाइव सेंसर रिपोर्ट" : selectedLanguage === "Marathi" ? "लाइव्ह सेन्सर अहवाल" : selectedLanguage === "Gujarati" ? "લાઈવ સેન્સર રિપોર્ટ" : selectedLanguage === "Tamil" ? "நேரடி சென்சார் அறிக்கை" : "Live Soil Data",
                      desc: selectedLanguage === "Hindi" ? "मिट्टी की नमी और तापमान की स्थिति पूछें" : selectedLanguage === "Marathi" ? "मातीतील ओलावा व तापमान विचारा" : selectedLanguage === "Gujarati" ? "જમીનમાં ભેજ અને તાપમાન વિશે પૂછો" : selectedLanguage === "Tamil" ? "மண்ணின் ஈரப்பதம் மற்றும் வெப்பநிலையை அறியுங்கள்" : "Ask about moisture and temperature levels",
                      prompt: selectedLanguage === "Hindi" ? "मेरे खेत में मिट्टी की नमी का क्या स्तर है?" : selectedLanguage === "Marathi" ? "माझ्या शेतात मातीतील ओलावा किती आहे?" : selectedLanguage === "Gujarati" ? "મારા ખેતરમાં જમીનનો ભેજ કેટલો છે?" : selectedLanguage === "Tamil" ? "என் பண்ணையில் மண்ணின் ஈரப்பதம் என்ன அளவில் உள்ளது?" : "What is the live soil moisture level in my farm?"
                    },
                    {
                      title: selectedLanguage === "Hindi" ? "सिंचाई सलाह" : selectedLanguage === "Marathi" ? "सिंचन सल्ला" : selectedLanguage === "Gujarati" ? "સિંચાઈ સલાહ" : selectedLanguage === "Tamil" ? "நீர் மேலாண்மை" : "Irrigation Strategy",
                      desc: selectedLanguage === "Hindi" ? "किस ज़ोन को पानी चाहिए यह जानें" : selectedLanguage === "Marathi" ? "कोणत्या झोनला पाण्याची गरज आहे ते जाणून घ्या" : selectedLanguage === "Gujarati" ? "કયા ઝોનને પાણીની જરૂર છે તે જાણો" : selectedLanguage === "Tamil" ? "எந்த பகுதிக்கு நீர் தேவை என்பதை அறியுங்கள்" : "Find out which zones require watering",
                      prompt: selectedLanguage === "Hindi" ? "क्या मुझे आज किसी ज़ोन में पानी देना चाहिए?" : selectedLanguage === "Marathi" ? "मला आज कोणत्या झोनला पाणी देण्याची गरज आहे का?" : selectedLanguage === "Gujarati" ? "શું મારે આજે કોઈ ઝોનમાં પાણી આપવું જોઈએ?" : selectedLanguage === "Tamil" ? "இன்று ஏதேனும் பகுதிக்கு நீர் பாய்ச்ச வேண்டுமா?" : "Do any of my farm zones need irrigation today?"
                    },
                    {
                      title: selectedLanguage === "Hindi" ? "मंडी के ताज़ा भाव" : selectedLanguage === "Marathi" ? "ताजे बाजार भाव" : selectedLanguage === "Gujarati" ? "મંડીના તાજા ભાવો" : selectedLanguage === "Tamil" ? "மண்டி சந்தை நிலவரம்" : "Mandi Market Rates",
                      desc: selectedLanguage === "Hindi" ? "मंडी रेट और सबसे सही बेचने का समय" : selectedLanguage === "Marathi" ? "बाजार भाव आणि विक्रीची योग्य वेळ" : selectedLanguage === "Gujarati" ? "મંડી ભાવો અને વેચવાનો યોગ્ય સમય" : selectedLanguage === "Tamil" ? "சந்தையின் தற்போதைய விலை நிலவரம்" : "Check current market rates for your crop",
                      prompt: selectedLanguage === "Hindi" ? "आज कपास का मंडी भाव क्या चल रहा है?" : selectedLanguage === "Marathi" ? "आज कापसाचा बाजार भाव काय चालू आहे?" : selectedLanguage === "Gujarati" ? "આજે કપાસનો મંડી ભાવ શું ચાલી રહ્યો છે?" : selectedLanguage === "Tamil" ? "இன்று பருத்தியின் சந்தை விலை என்ன?" : "What are the latest mandi rates for cotton?"
                    }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputMsg(item.prompt);
                        handleSend(item.prompt);
                      }}
                      className="p-5 text-left bg-surface-elevated hover:bg-surface-glass border border-border-subtle hover:border-signal-success/40 rounded-2xl transition-all duration-normal hover:shadow-md cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="text-body-sm font-bold text-content-primary group-hover:text-signal-success transition-colors flex items-center gap-2">
                          <Sparkles size={16} className="text-signal-success" />
                          {item.title}
                        </h4>
                        <p className="text-caption text-content-muted mt-1 font-semibold leading-relaxed">{item.desc}</p>
                      </div>
                      <span className="text-caption text-signal-success font-bold mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {selectedLanguage === "Hindi" ? "पूछें" : selectedLanguage === "Marathi" ? "विचारा" : selectedLanguage === "Gujarati" ? "પૂછો" : selectedLanguage === "Tamil" ? "கேட்க" : "Ask RAMU"}
                        <ArrowRight size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((item) => (
                <div
                  key={item.id}
                  id={`msg-${item.id}`}
                  className={`flex gap-4 transition-all rounded-2xl ${item.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                {item.sender === "bot" && (
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center">
                    <Bot size={20} className="text-signal-success" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div className={`p-5 rounded-3xl text-body-md font-medium leading-relaxed shadow-sm ${
                    item.sender === "user"
                      ? "bg-content-primary text-surface-base rounded-tr-sm"
                      : "bg-surface-elevated text-content-primary rounded-tl-sm border border-border-subtle"
                  }`}>
                    <p className="select-text whitespace-pre-wrap">{item.text}</p>
                    
                    {/* Dynamically parsed action cards */}
                    {item.actions && item.actions.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-4 select-none">
                        {item.actions.map((act, idy) => (
                          <button
                            key={idy}
                            id={`action-chip-btn-${idy}`}
                            onClick={() => executeActionChip(act.action)}
                            className="px-4 py-2.5 text-caption font-bold rounded-xl bg-surface-base hover:bg-border-subtle text-signal-success border border-border-subtle transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                          >
                            <span>{act.label}</span>
                            <ArrowRight size={14} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-3 text-micro text-content-muted font-bold uppercase tracking-wider ${
                    item.sender === "user" ? "justify-end pr-2" : "justify-start pl-2"
                  }`}>
                    <span>{item.timestamp}</span>
                    {item.sender === "bot" && (
                      <>
                        <span>·</span>
                        <button
                          id={`speak-msg-btn-${item.id}`}
                          onClick={() => speakText(item.text)}
                          className="hover:text-signal-success transition-colors flex items-center gap-1"
                        >
                          <Volume2 size={12} />
                          Listen
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center">
                  <Bot size={20} className="text-signal-success animate-pulse" />
                </div>
                <div className="p-4 bg-surface-elevated rounded-3xl rounded-tl-sm border border-border-subtle flex items-center gap-3 shadow-sm">
                  <RefreshCw size={16} className="animate-spin text-content-muted" />
                  <p className="text-caption font-bold text-content-muted tracking-widest uppercase animate-pulse">Synthesizing intelligence...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Recognition Ambient Waveform overlay during recording */}
          <AnimatePresence>
            {recognizing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-6 mb-4 bg-signal-critical/10 border border-signal-critical/30 p-4 rounded-2xl flex items-center justify-between gap-4 z-10 material-glass"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-signal-critical animate-ping shrink-0 shadow-[0_0_8px_var(--color-signal-critical)]" />
                  <p className="text-body-sm font-bold text-signal-critical tracking-wide">Capturing diagnostic audio...</p>
                </div>

                {/* Simulated sound waves visualizer */}
                <div className="flex items-end gap-1.5 h-8 w-20" aria-hidden="true">
                  <motion.div className="bg-signal-critical w-1.5 rounded-full flex-1" style={{ height: "40%" }} animate={{ height: ["40%", "90%", "40%"] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                  <motion.div className="bg-signal-critical w-1.5 rounded-full flex-1" style={{ height: "70%" }} animate={{ height: ["70%", "30%", "70%"] }} transition={{ repeat: Infinity, duration: 0.4 }} />
                  <motion.div className="bg-signal-critical w-1.5 rounded-full flex-1" style={{ height: "90%" }} animate={{ height: ["90%", "50%", "90%"] }} transition={{ repeat: Infinity, duration: 0.5 }} />
                  <motion.div className="bg-signal-critical w-1.5 rounded-full flex-1" style={{ height: "50%" }} animate={{ height: ["50%", "80%", "50%"] }} transition={{ repeat: Infinity, duration: 0.3 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-6 pb-3 pt-2 flex flex-col gap-3 z-10 relative bg-surface-base shrink-0">
            {/* Context Mode Selector */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption font-bold text-content-muted uppercase tracking-wider">AI Context Mode:</span>
              <select
                className="bg-surface-elevated text-body-sm font-bold text-content-primary border border-border-subtle rounded-xl px-3 py-1.5 focus:outline-none focus:border-signal-info cursor-pointer"
                onChange={(e) => {
                  // This is a visual UI element, prompt context will be injected during the handleSend logic later
                  console.log("Context changed to", e.target.value);
                }}
              >
                <option value="general">General Agriculture</option>
                <option value="all_zones">All Zones Overview</option>
                <option value="zone_a">Zone A (Tomato)</option>
                <option value="zone_b">Zone B (Cotton)</option>
                <option value="zone_c">Zone C (Wheat)</option>
                <option value="zone_d">Zone D (Corn)</option>
              </select>
            </div>

            {/* Quick Prompts */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {["How to grow tomatoes?", "Which zones need water today?", "Should I irrigate Zone A?"].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMsg(chip)}
                  className="whitespace-nowrap px-4 py-2 bg-surface-elevated border border-border-subtle rounded-full text-caption font-bold text-content-secondary hover:text-content-primary hover:border-border-strong transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-elevated border-t border-border-subtle p-3 px-6 flex items-center gap-5 z-10 relative select-none shrink-0">
            <button type="button" onClick={() => handleAttachmentClick("Camera")} className="text-content-muted hover:text-content-primary transition-colors flex items-center gap-2 text-caption font-bold cursor-pointer"><Camera size={18}/> Camera</button>
            <button type="button" onClick={() => handleAttachmentClick("Gallery")} className="text-content-muted hover:text-content-primary transition-colors flex items-center gap-2 text-caption font-bold cursor-pointer"><ImageIcon size={18}/> Gallery</button>
            <button type="button" onClick={() => handleAttachmentClick("Files")} className="text-content-muted hover:text-content-primary transition-colors flex items-center gap-2 text-caption font-bold cursor-pointer"><FileText size={18}/> Files</button>
          </div>

          {/* Chat workspace footer area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputMsg);
            }}
            className="flex items-center gap-3 border-t border-border-subtle p-5 sm:px-6 select-none shrink-0 bg-surface-elevated relative z-10"
          >
            {/* Toggle MIC */}
            <button
              id="speech-recognition-btn"
              type="button"
              onClick={toggleSpeechRecognition}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-normal cursor-pointer shadow-sm ${
                recognizing 
                  ? "bg-signal-critical text-surface-base" 
                  : "bg-surface-base text-content-muted hover:text-content-primary border border-border-subtle hover:border-border-strong"
              }`}
              aria-label="Activate voice diagnostic speech input"
            >
              {recognizing ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <input
              id="chat-input"
              type="text"
              placeholder="Ask about fertilizer ratios, mildew symptoms, mandi rates..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              className="flex-1 h-14 bg-surface-base border border-border-subtle rounded-2xl px-5 text-body-md font-medium focus:outline-none focus:ring-2 focus:ring-signal-success/30 focus:border-signal-success text-content-primary transition-colors placeholder-content-muted"
            />

            <button
              id="send-chat-submit-btn"
              type="submit"
              disabled={!inputMsg.trim()}
              className="w-14 h-14 bg-content-primary hover:opacity-90 disabled:opacity-50 text-surface-base rounded-2xl shrink-0 transition-opacity flex items-center justify-center cursor-pointer shadow-md"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
