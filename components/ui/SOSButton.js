"use client";

import { useState, useEffect, useCallback } from "react";
import Spinner from "@/components/ui/Spinner";
import { raiseSOS } from "@/lib/sos";
import { queueOfflineSOS } from "@/lib/offline-sync";

/**
 * SOSButton Component - MeterMate Polish Edition
 *
 * Small circular floating action button positioned at the absolute top layer (z-[9999]),
 * ensuring it is never obscured or clipped by Leaflet maps or bottom sheets.
 * Siren feature removed per user request for clean, quiet emergency dispatch.
 */
export default function SOSButton({ onRaiseSOS, toast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // 'idle' | 'transmitting' | 'sent_online' | 'sent_offline'
  const [selectedTag, setSelectedTag] = useState("Trapped in Flood");
  const [activeAlertId, setActiveAlertId] = useState(null);

  // Trigger GPS acquisition and automatic broadcast on tap
  const handleTriggerSOS = useCallback((initialTag = "Trapped in Flood") => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {}
    }

    setIsOpen(true);
    setStatus("transmitting");
    setGeoLoading(true);
    setSelectedTag(initialTag);

    const executeBroadcast = async (lat, lng) => {
      setGeoLoading(false);
      setCoords({ lat, lng });

      const situationMessage = `[EMERGENCY SOS: ${initialTag}] GPS Location: ${lat}, ${lng}`;

      if (typeof window !== "undefined" && !window.navigator.onLine) {
        queueOfflineSOS({ lat, lng, message: situationMessage, tag: initialTag });
        setStatus("sent_offline");
        toast?.({
          type: "warning",
          message: "Saved to offline queue. Tap 'Send 2G SMS' or call 112 below!",
        });
        return;
      }

      try {
        let alertId = null;
        if (onRaiseSOS) {
          const res = await onRaiseSOS({ lat, lng, message: situationMessage });
          alertId = res?.id;
        } else {
          const res = await raiseSOS({ lat, lng, message: situationMessage });
          alertId = res?.id;
        }

        setActiveAlertId(alertId);

        if (alertId) {
          fetch("/api/ai/triage-sos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alertId, message: situationMessage }),
          }).catch((e) => console.warn("Background triage note:", e));
        }

        setStatus("sent_online");
        toast?.({
          type: "success",
          message: "Emergency SOS broadcasted live to District Rescue Command!",
        });
      } catch (err) {
        console.warn("SOS online failure, fallback to offline queue:", err);
        queueOfflineSOS({ lat, lng, message: situationMessage, tag: initialTag });
        setStatus("sent_offline");
      }
    };

    if (typeof window !== "undefined" && window.navigator?.geolocation) {
      let resolved = false;
      const fallbackTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          executeBroadcast(22.5726, 88.3639);
        }
      }, 3500);

      window.navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimer);
            executeBroadcast(
              Number(pos.coords.latitude.toFixed(6)),
              Number(pos.coords.longitude.toFixed(6))
            );
          }
        },
        (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimer);
            console.warn("GPS timeout/denied, using district fallback:", err);
            executeBroadcast(22.5726, 88.3639);
          }
        },
        { enableHighAccuracy: true, timeout: 3500 }
      );
    } else {
      executeBroadcast(22.5726, 88.3639);
    }
  }, [onRaiseSOS, toast]);

  // Global listener to trigger SOS modal from top navbar or any other component
  useEffect(() => {
    const handleOpenEvent = (e) => {
      const tag = e.detail?.tag || "Trapped in Flood";
      handleTriggerSOS(tag);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("open-sos-modal", handleOpenEvent);
      return () => window.removeEventListener("open-sos-modal", handleOpenEvent);
    }
  }, [handleTriggerSOS]);

  const handleTagChange = async (tag) => {
    setSelectedTag(tag);
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate(100);
      } catch {}
    }

    const lat = coords?.lat || 22.5726;
    const lng = coords?.lng || 88.3639;
    const situationMessage = `[UPDATED EMERGENCY: ${tag}] GPS: ${lat}, ${lng}`;

    if (status === "sent_online" && activeAlertId) {
      fetch("/api/ai/triage-sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: activeAlertId, message: situationMessage }),
      }).catch(() => {});
      toast?.({ type: "info", message: `Updated rescue priority: ${tag}` });
    }
  };

  const getSMSUrl = () => {
    const lat = coords?.lat || 22.5726;
    const lng = coords?.lng || 88.3639;
    const emergencyRelayNumber = process.env.NEXT_PUBLIC_EMERGENCY_SMS_RELAY || "1070";
    const body = encodeURIComponent(
      `[EVACORE SOS]\nGPS: ${lat}, ${lng}\nSITUATION: ${selectedTag}\nRESCUE NEEDED`
    );
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return isIOS ? `sms:${emergencyRelayNumber}&body=${body}` : `sms:${emergencyRelayNumber}?body=${body}`;
  };

  return (
    <>
      {/* ── Small Circular Floating SOS Button (Top Z-Index: z-[9999]) ── */}
      {!isOpen && (
        <div
          className="fixed right-3 sm:right-6 bottom-24 sm:bottom-10 z-[9999] pointer-events-auto select-none"
        >
          <button
            type="button"
            onClick={() => handleTriggerSOS("Trapped in Flood")}
            aria-label="Trigger Emergency SOS Broadcast"
            title="Emergency SOS Broadcast"
            className="
              relative w-14 h-14 sm:w-15 sm:h-15 rounded-full
              bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#B91C1C]
              text-white flex flex-col items-center justify-center
              border-[3px] border-white/90
              shadow-[0_8px_30px_rgba(220,38,38,0.70),0_2px_8px_rgba(0,0,0,0.15)]
              hover:shadow-[0_12px_40px_rgba(220,38,38,0.80)]
              hover:scale-110 active:scale-95 active:brightness-90
              transition-all duration-300 cursor-pointer group
            "
          >
            {/* Outer pulsing ring 1 */}
            <span
              className="animate-sos-ring absolute rounded-full border-2 border-red-500 opacity-70"
              style={{ inset: -6 }}
            />
            {/* Outer pulsing ring 2 (offset delay) */}
            <span
              className="animate-sos-ring absolute rounded-full border border-red-400 opacity-40"
              style={{ inset: -12, animationDelay: "0.55s" }}
            />
            {/* Soft inner glow */}
            <span className="absolute inset-0 rounded-full bg-red-400/20 blur-sm" />

            {/* Inner Content */}
            <div className="relative z-10 flex flex-col items-center justify-center leading-none">
              <svg className="w-5 h-5 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-[9.5px] font-black tracking-tighter mt-0.5 drop-shadow">SOS</span>
            </div>
          </button>
        </div>
      )}

      {/* ── High-Finish Emergency Action Modal ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100000] isolate flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 transition-opacity"
        >
          <div
            className="
              animate-slide-up w-full max-w-[480px] rounded-t-[32px] sm:rounded-3xl bg-white
              border-t-4 border-[#DC2626] p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto
            "
            style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {/* Top Bar with Dismiss */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DC2626] animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626] font-mono">
                  {status === "transmitting"
                    ? "Transmitting Emergency SOS…"
                    : status === "sent_online"
                      ? "Live SOS Broadcasted"
                      : "Offline SOS Active"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Transmission Status Card */}
            {status === "transmitting" ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                <Spinner size="md" className="text-[#DC2626] mx-auto" />
                <div className="text-sm font-bold text-red-900">Locking GPS & Alerting SAR Command…</div>
                <p className="text-xs text-red-700">Stay in place. Fetching exact coordinates.</p>
              </div>
            ) : status === "sent_online" ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <svg className="w-5 h-5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="font-bold text-sm">GPS Distress Signal Received by District HQ</span>
                </div>
                <div className="text-xs text-emerald-700 font-mono pl-7">
                  GPS: {coords ? `${coords.lat}, ${coords.lng}` : "22.5726, 88.3639"}
                </div>
                <p className="text-[11px] text-emerald-700 pl-7">
                  Emergency rescue authorities have received your distress coordinates.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-sm">Offline Mode: Cellular Data Unavailable</span>
                </div>
                <p className="text-xs text-amber-800">
                  Distress signal queued locally. Tap below to send a 2G SMS to State Disaster Control Room or call 112 directly.
                </p>
                <div className="text-xs text-amber-900 font-mono font-bold">
                  GPS: {coords ? `${coords.lat}, ${coords.lng}` : "22.5726, 88.3639"}
                </div>
              </div>
            )}

            {/* 1-Tap Emergency Situation Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 font-mono">
                Select Situation (Instant Update):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { tag: "Trapped in Flood", label: "Trapped in Water", color: "border-sky-500 bg-sky-50 text-sky-900" },
                  { tag: "Medical Emergency", label: "Medical / Injured", color: "border-red-500 bg-red-50 text-red-900" },
                  { tag: "Elderly / Infant", label: "Elderly / Infant", color: "border-amber-500 bg-amber-50 text-amber-900" },
                  { tag: "Food & Water Needed", label: "Food & Clean Water", color: "border-emerald-500 bg-emerald-50 text-emerald-900" },
                ].map((item) => {
                  const isSelected = selectedTag === item.tag;
                  return (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleTagChange(item.tag)}
                      className={`
                        p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer
                        ${isSelected ? `${item.color} ring-2 ring-[#DC2626] shadow-xs` : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-white"}
                      `}
                    >
                      <span>{item.label}</span>
                      {isSelected && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Life-Saving Actions */}
            <div className="space-y-2.5 pt-1">
              {/* 2G SMS Broadcast Button */}
              <a
                href={getSMSUrl()}
                className="
                  w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white font-bold text-xs shadow-md
                  hover:from-[#B91C1C] hover:to-[#DC2626] transition-all flex items-center justify-center gap-2 no-underline text-center cursor-pointer active:scale-98
                "
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <span>OPEN PRE-FILLED SMS (DISASTER RELAY 1070)</span>
              </a>

              {/* Direct 112 Phone Call button */}
              <a
                href="tel:112"
                className="
                  w-full py-3 px-4 rounded-2xl bg-stone-900 text-white font-semibold text-xs
                  hover:bg-black transition-all flex items-center justify-center gap-2 no-underline text-center cursor-pointer shadow-sm active:scale-98
                "
              >
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>Call 112 National Emergency Helpline</span>
              </a>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Dismiss / Keep Alert Active
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
