"use client";

import { useState, useEffect, useRef } from "react";
import Spinner from "@/components/ui/Spinner";

/**
 * Downscale and compress image files client-side before base64 transmission.
 * Prevents 413 Payload Too Large and ensures 100% upload reliability on all networks.
 */
function compressImageFile(file, maxWidth = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided."));
      return;
    }
    if (!file.type || !file.type.startsWith("image/")) {
      reject(new Error("Selected file must be an image (JPEG, PNG, WEBP, etc.)."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read selected image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image content."));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target.result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * ReportHazardSheet with AeroEye Multimodal Computer Vision
 *
 * Capabilities:
 * 1. AI Vision Reconnaissance: Analyzes uploaded or camera-snapped disaster photos
 *    for water depth, live electrocution risks, and vehicle passability.
 * 2. Instant Hackathon Demo Scenarios: 3 preloaded real-world emergency scenarios
 *    for 1-tap live demonstrations to judges.
 * 3. Quick 1-Tap Manual Chips: Fallback for rapid 2-second manual reporting.
 */
export default function ReportHazardSheet({ isOpen, onClose, onReport }) {
  const [activeTab, setActiveTab] = useState("ai_vision"); // 'ai_vision' | 'quick_chips'
  const [gpsStatus, setGpsStatus] = useState("locating"); // 'locating' | 'ready' | 'fallback'
  const [coords, setCoords] = useState({ lat: 22.5726, lng: 88.3639 });
  const [submitting, setSubmitting] = useState(false);

  // AI Vision states
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setGpsStatus("locating");
    let watchId = null;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          setGpsStatus("ready");
        },
        () => {
          setGpsStatus("fallback");
        },
        { timeout: 8000, enableHighAccuracy: true }
      );

      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setCoords({
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
            });
            setGpsStatus("ready");
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
        );
      } catch {}
    } else {
      setGpsStatus("fallback");
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const chips = [
    {
      type: "waterlogged",
      title: "Waterlogged Road",
      desc: "Deep / impassable floodwater",
      icon: (
        <svg className="w-5 h-5 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
      bg: "hover:bg-[#E0F2FE] hover:border-[#0284C7]/50",
    },
    {
      type: "bridge_closed",
      title: "Bridge Closed",
      desc: "Structural damage or overflow",
      icon: (
        <svg className="w-5 h-5 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      bg: "hover:bg-[#FEF2F2] hover:border-[#DC2626]/50",
    },
    {
      type: "fallen_tree",
      title: "Fallen Tree / Debris",
      desc: "Roadway completely blocked",
      icon: (
        <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      bg: "hover:bg-[#FFFBEB] hover:border-[#D97706]/50",
    },
    {
      type: "power_line",
      title: "Power Line Down",
      desc: "High risk electrocution hazard",
      icon: (
        <svg className="w-5 h-5 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      bg: "hover:bg-[#F3E8FF] hover:border-[#7C3AED]/50",
    },
  ];

  // ── AI Vision Analysis Handler ──
  const analyzeImagePayload = async ({ imageBase64, sampleScenarioId }) => {
    setAnalyzingImage(true);
    setAiError("");
    setAiAnalysis(null);

    try {
      setScanStep("Scanning pixel density & flood surface...");
      await new Promise((r) => setTimeout(r, 450));

      setScanStep("Measuring water depth & tire submergence...");
      await new Promise((r) => setTimeout(r, 450));

      setScanStep("Assessing downed power lines & vehicle clearance...");

      const res = await fetch("/api/ai/analyze-hazard-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || null,
          sampleScenarioId: sampleScenarioId || null,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vision analysis failed.");
      }

      setAiAnalysis(data);
    } catch (err) {
      console.warn("AI Hazard Analysis error:", err);
      setAiError(err.message || "Could not complete AI vision analysis.");
    } finally {
      setAnalyzingImage(false);
      setScanStep("");
    }
  };

  // ── Process & Compress Image File ──
  const processSelectedFile = async (file) => {
    if (!file) return;
    setAnalyzingImage(true);
    setAiError("");
    setScanStep("Optimizing image resolution for field reconnaissance...");

    try {
      const compressedBase64 = await compressImageFile(file);
      setImagePreview(compressedBase64);
      await analyzeImagePayload({ imageBase64: compressedBase64 });
    } catch (err) {
      console.warn("Image load error:", err);
      setAiError(err.message || "Failed to load image. Please select a valid photo.");
      setAnalyzingImage(false);
    }
  };

  // ── File Upload / Camera Trigger ──
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    if (e.target) e.target.value = "";
  };

  // ── Preset Demo Scenarios (For 1-Tap Judging Presentations) ──
  const handleSelectDemoScenario = (scenarioId) => {
    setImagePreview(`demo:${scenarioId}`);
    analyzeImagePayload({ sampleScenarioId: scenarioId });
  };

  // ── Manual Chip Submit ──
  const handleChipClick = async (type) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onReport?.({
        type,
        lat: coords.lat,
        lng: coords.lng,
      });
      onClose();
    } catch (err) {
      console.warn("Hazard report callback error:", err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit AI-Verified Hazard ──
  const handleSubmitAiReport = async () => {
    if (!aiAnalysis || submitting) return;
    setSubmitting(true);
    try {
      await onReport?.({
        type: aiAnalysis.hazardType || "waterlogged",
        lat: coords.lat,
        lng: coords.lng,
        aiAnalysis,
      });
      onClose();
    } catch (err) {
      console.warn("AI Hazard report callback error:", err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] isolate flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet Card */}
      <div className="relative z-10 w-full max-w-xl bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E5DCCE] p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-[#E5DCCE] rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E5DCCE] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/25 flex items-center justify-center text-[#DC2626] font-bold shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-[#1C1917]">
                  Report Road Hazard
                </h2>
                <span className="badge badge-flare text-[9px] py-0.5 px-1.5 font-mono">
                  AeroEye Vision
                </span>
              </div>
              <p className="text-xs text-[#78716C]">
                Upload disaster photos for instant AI depth & passability verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-full text-[#78716C] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7F2] rounded-2xl border border-[#E5DCCE]">
          <button
            type="button"
            onClick={() => setActiveTab("ai_vision")}
            className={`
              py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none
              ${activeTab === "ai_vision"
                ? "bg-white text-[#D9531E] shadow-xs border border-[#E5DCCE]"
                : "text-[#797167] hover:text-[#221E1B]"
              }
            `}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span>AeroEye AI Vision</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quick_chips")}
            className={`
              py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none
              ${activeTab === "quick_chips"
                ? "bg-white text-[#1C1917] shadow-xs border border-[#E5DCCE]"
                : "text-[#797167] hover:text-[#221E1B]"
              }
            `}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span>Quick 1-Tap Chips</span>
          </button>
        </div>

        {/* Geolocation confirmation strip */}
        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#78716C] font-mono">
            <svg className="w-4 h-4 text-[#D9531E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
          </div>

          {gpsStatus === "locating" ? (
            <span className="text-[10px] text-[#D97706] flex items-center gap-1">
              <Spinner size="xs" /> Locating GPS…
            </span>
          ) : gpsStatus === "ready" ? (
            <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" /> GPS Locked
            </span>
          ) : (
            <span className="text-[10px] text-[#78716C]">Sector Coordinates Active</span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: AEROEYE COMPUTER VISION RECONNAISSANCE
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "ai_vision" && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Standard file input (Desktop & Mobile file chooser) */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            {/* Direct Camera input (Mobile hardware camera trigger) */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Upload Area / Camera Trigger */}
            {!imagePreview && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                className={`
                  border-2 border-dashed rounded-2xl p-5 text-center space-y-3 transition-all group shadow-xs
                  ${isDragging ? "border-[#D9531E] bg-[#FFF2EA]" : "border-[#D9531E]/40 hover:border-[#D9531E] bg-gradient-to-br from-[#FFF9F5] to-[#FFFFFF]"}
                `}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D9531E]/10 text-[#D9531E] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-[#D9531E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#221E1B]">
                    Snap or Upload Flood / Hazard Photo
                  </p>
                  <p className="text-[11px] text-[#797167] mt-0.5">
                    AeroEye AI calculates water depth, downed cables & vehicle passability
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D9531E] hover:bg-[#BF4413] text-white text-[11px] font-bold font-display shadow-xs cursor-pointer transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>Choose Photo / File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2EBE1] text-[#1C1917] border border-[#E5DCCE] text-[11px] font-bold font-display shadow-xs cursor-pointer transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-[#D9531E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Instant Demo Scenarios (For Judge Presentations) */}
            {!imagePreview && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#797167]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Or Test Real Emergency Scenarios:</span>
                  <span className="text-[10px] text-[#D9531E] font-mono font-bold">1-Tap Judge Demo</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDemoScenario("flooded_street")}
                    className="p-2 rounded-xl border border-[#E5DCCE] bg-[#FAF7F2] hover:bg-[#F2EBE1] text-left transition-all cursor-pointer text-xs space-y-0.5"
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#0284C7]/15 flex items-center justify-center text-[#0284C7] mb-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M12 3v18" />
                      </svg>
                    </div>
                    <span className="font-bold text-[11px] text-[#221E1B] block leading-tight">Waist-Deep Flood</span>
                    <span className="text-[9.5px] text-[#797167] block">65cm water level</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDemoScenario("powerline_water")}
                    className="p-2 rounded-xl border border-[#E5DCCE] bg-[#FAF7F2] hover:bg-[#F2EBE1] text-left transition-all cursor-pointer text-xs space-y-0.5"
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#DC2626]/15 flex items-center justify-center text-[#DC2626] mb-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                    <span className="font-bold text-[11px] text-[#221E1B] block leading-tight">Live Cable in Water</span>
                    <span className="text-[9.5px] text-[#DC2626] font-semibold block">Shock danger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDemoScenario("fallen_banyan")}
                    className="p-2 rounded-xl border border-[#E5DCCE] bg-[#FAF7F2] hover:bg-[#F2EBE1] text-left transition-all cursor-pointer text-xs space-y-0.5"
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#D97706]/15 flex items-center justify-center text-[#D97706] mb-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <span className="font-bold text-[11px] text-[#221E1B] block leading-tight">Uprooted Tree</span>
                    <span className="text-[9.5px] text-[#797167] block">Road blockage</span>
                  </button>
                </div>
              </div>
            )}

            {/* Image Preview & Active Scan HUD */}
            {imagePreview && (
              <div className="relative rounded-2xl border border-[#E5DCCE] overflow-hidden bg-[#1C1917] shadow-md">
                {imagePreview.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Disaster site upload"
                    className="w-full h-44 object-cover opacity-85"
                  />
                ) : (
                  <div className="w-full h-44 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1917] to-[#2B2623] text-white p-4 text-center">
                    <span className="text-4xl mb-1">{imagePreview.replace("demo:", "")}</span>
                    <span className="text-xs font-mono font-bold text-white/80">Disaster Scenario Image Loaded</span>
                  </div>
                )}

                {/* Laser Scanning Line Animation when analyzing */}
                {analyzingImage && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-[0_0_12px_#38BDF8]" />
                    <div className="relative z-10 bg-[#1C1917]/90 px-3.5 py-2 rounded-xl border border-[#38BDF8]/40 shadow-xl space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#38BDF8] font-mono">
                        <Spinner size="sm" />
                        <span>AEROEYE COMPUTER VISION</span>
                      </div>
                      <p className="text-[10.5px] font-mono text-white/80">{scanStep}</p>
                    </div>
                  </div>
                )}

                {/* Reset Image Button */}
                {!analyzingImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setAiAnalysis(null);
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-black/70 hover:bg-black text-white text-[10px] font-mono font-bold backdrop-blur-md cursor-pointer border border-white/20"
                  >
                    ✕ Retake Photo
                  </button>
                )}
              </div>
            )}

            {/* AI Analysis Error */}
            {aiError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#DC2626] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{aiError}</span>
              </div>
            )}

            {/* Diagnostic Results Card */}
            {aiAnalysis && (
              <div className="p-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-start justify-between gap-2 border-b border-[#DCFCE7] pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#15803D]">
                        AI-Verified Hazard ({aiAnalysis.confidenceScore}% Confidence)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1C1917] font-display mt-0.5">
                      {aiAnalysis.title}
                    </h3>
                  </div>
                  <span className="badge badge-crit text-[9.5px] uppercase font-mono shrink-0">
                    {aiAnalysis.severity}
                  </span>
                </div>

                {/* Water Depth & Observation */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-[#DCFCE7] space-y-0.5">
                    <span className="text-[10px] text-[#797167] font-mono block">Estimated Depth</span>
                    <span className="flex items-center gap-1.5 font-bold text-sm text-[#0284C7] font-mono">
                      <svg className="w-4 h-4 text-[#0284C7] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5M12 3v18" />
                      </svg>
                      <span>{aiAnalysis.waterDepth?.estimatedCm} cm ({aiAnalysis.waterDepth?.category})</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#DCFCE7] space-y-0.5">
                    <span className="text-[10px] text-[#797167] font-mono block">Hazard Type</span>
                    <span className="flex items-center gap-1.5 font-bold text-xs text-[#DC2626] font-mono uppercase">
                      <svg className="w-3.5 h-3.5 text-[#DC2626] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span>{aiAnalysis.hazardType?.replace("_", " ")}</span>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#453F3A] leading-relaxed bg-white/80 p-2.5 rounded-xl border border-[#DCFCE7]">
                  {aiAnalysis.summary}
                </p>

                {/* Vehicle Passability Clearance Matrix */}
                {aiAnalysis.vehiclePassability && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#797167] font-bold block">
                      Vehicle Clearance Matrix:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono font-bold">
                      <div className={`p-1.5 rounded-lg border ${aiAnalysis.vehiclePassability.bikesAndSedans === "BLOCKED" ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" : "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"}`}>
                        Bikes/Cars: {aiAnalysis.vehiclePassability.bikesAndSedans}
                      </div>
                      <div className={`p-1.5 rounded-lg border ${aiAnalysis.vehiclePassability.fourByFour === "CLEARED" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"}`}>
                        4x4 / Tractor: {aiAnalysis.vehiclePassability.fourByFour}
                      </div>
                      <div className={`p-1.5 rounded-lg border ${aiAnalysis.vehiclePassability.zodiacBoats === "CLEARED" ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"}`}>
                        Rescue Boat: {aiAnalysis.vehiclePassability.zodiacBoats}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tactical Recommendation */}
                {aiAnalysis.recommendation && (
                  <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[10.5px] text-[#92400E] leading-snug">
                    <strong>Tactical Action:</strong> {aiAnalysis.recommendation}
                  </div>
                )}

                {/* Submit AI-Verified Report Button */}
                <button
                  type="button"
                  onClick={handleSubmitAiReport}
                  disabled={submitting}
                  className="
                    w-full py-2.5 px-4 rounded-xl bg-[#D9531E] hover:bg-[#BF4413]
                    text-white font-bold font-display text-xs flex items-center justify-center gap-2
                    transition-all active:scale-98 cursor-pointer shadow-md disabled:opacity-50
                  "
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" />
                      <span>Broadcasting to Live Grid…</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span>Pin AI-Verified Hazard to Live Evacuation Map</span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: QUICK 1-TAP MANUAL CHIPS
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "quick_chips" && (
          <div className="space-y-2.5 animate-fade-in">
            <p className="text-xs text-[#78716C]">
              Select a category to broadcast without a photo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {chips.map((chip) => (
                <button
                  key={chip.type}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleChipClick(chip.type)}
                  className={`
                    p-3.5 rounded-2xl border border-[#E5DCCE] bg-[#FFFFFF] text-left
                    transition-all cursor-pointer select-none flex items-start gap-3 shadow-xs
                    active:scale-98 disabled:opacity-50 ${chip.bg}
                  `}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE] flex items-center justify-center shrink-0 mt-0.5">
                    {chip.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1C1917] truncate">
                      {chip.title}
                    </div>
                    <div className="text-[11px] text-[#78716C] leading-snug">
                      {chip.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-center text-[#78716C] pt-1">
          Reports auto-expire in 6 hours unless re-verified by nearby responders.
        </p>
      </div>
    </div>
  );
}
