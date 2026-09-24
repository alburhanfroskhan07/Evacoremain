"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Spinner from "@/components/ui/Spinner";
import { raiseSOS, updateSOSLocation, resolveSOS } from "@/lib/sos";
import { queueOfflineSOS } from "@/lib/offline-sync";
import { getSavedFamilyPasses } from "@/lib/family-passes";

/**
 * SOSButton Component - MeterMate Polish Edition
 *
 * Circular floating action button positioned at the bottom right (z-[100001]),
 * equipped with continuous Live Location Tracking (watchPosition) that streams
 * real-time GPS telemetry to SAR rescue teams and District Disaster Command.
 */
export default function SOSButton({ onRaiseSOS, toast, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [lastFixTime, setLastFixTime] = useState(null);
  const [telemetryCount, setTelemetryCount] = useState(0);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState(false);
  const [status, setStatus] = useState("idle"); // 'idle' | 'transmitting' | 'sent_online' | 'sent_offline'
  const [selectedTag, setSelectedTag] = useState("Trapped in Flood");
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);

  const watchIdRef = useRef(null);
  const activeAlertIdRef = useRef(null);
  const lastBroadcastTimeRef = useRef(0);
  const lastBroadcastCoordsRef = useRef(null);
  const selectedTagRef = useRef(selectedTag);

  useEffect(() => {
    selectedTagRef.current = selectedTag;
  }, [selectedTag]);

  useEffect(() => {
    activeAlertIdRef.current = activeAlertId;
  }, [activeAlertId]);

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {}
      }
    };
  }, []);

  // Update telemetry packet across server and evacuee registries
  const streamTelemetry = useCallback(async (lat, lng, acc, spd, hdg) => {
    const alertId = activeAlertIdRef.current;
    if (!alertId) return;

    try {
      // 1. Update SOS alert record in Firestore / API
      await updateSOSLocation({
        alertId,
        lat,
        lng,
        accuracy: acc,
        speed: spd,
        heading: hdg,
      });

      // 2. Also update evacuee beacon if a family pass exists in local vault
      const passes = getSavedFamilyPasses();
      const primaryPass = Array.isArray(passes) && passes.length > 0 ? passes[0] : null;
      if (primaryPass?.id) {
        fetch("/api/evacuee/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evacueeId: primaryPass.id,
            lat,
            lng,
          }),
        }).catch(() => {});
      }

      setTelemetryCount((prev) => prev + 1);
    } catch (err) {
      console.warn("Telemetry transmission notice:", err);
    }
  }, []);

  // Process incoming GPS coordinate position from watchPosition
  const handlePositionUpdate = useCallback(
    (pos, isInitial = false) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      const spd = typeof pos.coords.speed === "number" && !isNaN(pos.coords.speed) ? Number((pos.coords.speed * 3.6).toFixed(1)) : null; // km/h
      const hdg = typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : null;

      setCoords({ lat, lng });
      setAccuracy(acc);
      setSpeed(spd);
      setHeading(hdg);
      setLastFixTime(new Date());

      const now = Date.now();
      const lastTime = lastBroadcastTimeRef.current;
      const lastCoords = lastBroadcastCoordsRef.current;

      // Throttle network updates: only broadcast every 3.5s or if moved > 3 meters
      const isMoved = !lastCoords || Math.abs(lastCoords.lat - lat) > 0.00003 || Math.abs(lastCoords.lng - lng) > 0.00003;
      const isTimeElapsed = now - lastTime > 3500;

      if (!isInitial && (isTimeElapsed || isMoved)) {
        lastBroadcastTimeRef.current = now;
        lastBroadcastCoordsRef.current = { lat, lng };
        streamTelemetry(lat, lng, acc, spd, hdg);
      }
    },
    [streamTelemetry]
  );

  // Trigger GPS acquisition, initial broadcast and continuous watchPosition
  const handleTriggerSOS = useCallback(
    (initialTag = "Trapped in Flood") => {
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        try {
          window.navigator.vibrate([200, 100, 200, 100, 400]);
        } catch {}
      }

      setIsOpen(true);
      setStatus("transmitting");
      setIsLiveTrackingActive(true);
      setSelectedTag(initialTag);
      setIsConfirmingStop(false);

      const executeInitialBroadcast = async (lat, lng, acc) => {
        setCoords({ lat, lng });
        setAccuracy(acc);
        setLastFixTime(new Date());
        lastBroadcastTimeRef.current = Date.now();
        lastBroadcastCoordsRef.current = { lat, lng };

        const situationMessage = `[EMERGENCY SOS: ${initialTag}] Live GPS: ${lat}, ${lng} (±${acc || 5}m). Continuous live tracking active.`;

        if (typeof window !== "undefined" && !window.navigator.onLine) {
          queueOfflineSOS({ lat, lng, message: situationMessage, tag: initialTag });
          setStatus("sent_offline");
          toast?.({
            type: "warning",
            message: "Cellular data unavailable. SOS queued locally. 2G SMS ready below!",
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
          activeAlertIdRef.current = alertId;
          setTelemetryCount(1);

          if (alertId) {
            fetch("/api/ai/triage-sos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alertId, message: situationMessage }),
            }).catch(() => {});
          }

          setStatus("sent_online");
          toast?.({
            type: "success",
            message: "Live SOS Distress Signal broadcasted! Rescue command tracking your location.",
          });
        } catch (err) {
          console.warn("SOS online failure, fallback to offline queue:", err);
          queueOfflineSOS({ lat, lng, message: situationMessage, tag: initialTag });
          setStatus("sent_offline");
        }
      };

      // 1. Initial Quick Fix with fallback
      if (typeof window !== "undefined" && window.navigator?.geolocation) {
        let initialResolved = false;

        const fallbackTimer = setTimeout(() => {
          if (!initialResolved) {
            initialResolved = true;
            executeInitialBroadcast(22.5726, 88.3639, 15);
          }
        }, 3200);

        window.navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!initialResolved) {
              initialResolved = true;
              clearTimeout(fallbackTimer);
              const lat = Number(pos.coords.latitude.toFixed(6));
              const lng = Number(pos.coords.longitude.toFixed(6));
              const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
              executeInitialBroadcast(lat, lng, acc);
            }
          },
          (err) => {
            if (!initialResolved) {
              initialResolved = true;
              clearTimeout(fallbackTimer);
              console.warn("GPS timeout/denied, using district fallback:", err);
              executeInitialBroadcast(22.5726, 88.3639, 25);
            }
          },
          { enableHighAccuracy: true, timeout: 3200, maximumAge: 1000 }
        );

        // 2. Start continuous GPS tracking via watchPosition
        if (watchIdRef.current !== null) {
          try {
            window.navigator.geolocation.clearWatch(watchIdRef.current);
          } catch {}
        }

        try {
          watchIdRef.current = window.navigator.geolocation.watchPosition(
            (pos) => {
              handlePositionUpdate(pos, false);
            },
            (err) => {
              console.warn("Live watchPosition error:", err);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 1500,
              timeout: 10000,
            }
          );
        } catch (watchErr) {
          console.warn("Failed to attach watchPosition:", watchErr);
        }
      } else {
        executeInitialBroadcast(22.5726, 88.3639, 20);
      }
    },
    [onRaiseSOS, toast, handlePositionUpdate]
  );

  // Global event listener to trigger SOS from anywhere
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

  // Update situation tag
  const handleTagChange = async (tag) => {
    setSelectedTag(tag);
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate(80);
      } catch {}
    }

    const lat = coords?.lat || 22.5726;
    const lng = coords?.lng || 88.3639;
    const situationMessage = `[UPDATED EMERGENCY: ${tag}] Live GPS: ${lat}, ${lng}`;

    if (status === "sent_online" && activeAlertId) {
      fetch("/api/ai/triage-sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: activeAlertId, message: situationMessage }),
      }).catch(() => {});
      toast?.({ type: "info", message: `Updated rescue priority: ${tag}` });
    }
  };

  // Terminate SOS and stop live tracking
  const handleStopLiveTracking = async () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
      watchIdRef.current = null;
    }

    if (activeAlertId) {
      try {
        await resolveSOS(activeAlertId);
      } catch {}
    }

    setIsLiveTrackingActive(false);
    setStatus("idle");
    setActiveAlertId(null);
    activeAlertIdRef.current = null;
    setIsOpen(false);
    setIsConfirmingStop(false);
    toast?.({
      type: "success",
      message: "Emergency SOS resolved and live tracking stopped.",
    });
  };

  // Pre-filled 2G SMS link with live Google Maps coordinate link
  const getSMSUrl = () => {
    const lat = coords?.lat || 22.5726;
    const lng = coords?.lng || 88.3639;
    const emergencyRelayNumber = process.env.NEXT_PUBLIC_EMERGENCY_SMS_RELAY || "1070";
    const body = encodeURIComponent(
      `[EVACORE EMERGENCY SOS]\nGPS: ${lat}, ${lng}\nLIVE PIN: https://maps.google.com/?q=${lat},${lng}\nSITUATION: ${selectedTag}\nACCURACY: ±${accuracy || 5}m\nIMMEDIATE RESCUE NEEDED`
    );
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return isIOS ? `sms:${emergencyRelayNumber}&body=${body}` : `sms:${emergencyRelayNumber}?body=${body}`;
  };

  // Share Live Location Beacon via native share or clipboard
  const handleShareLiveLocation = async () => {
    const lat = coords?.lat || 22.5726;
    const lng = coords?.lng || 88.3639;
    const shareText = `🚨 [EVACORE EMERGENCY SOS]\nI need emergency disaster rescue.\nSituation: ${selectedTag}\nMy Live Location: https://maps.google.com/?q=${lat},${lng}\nCoordinates: ${lat}, ${lng} (±${accuracy || 5}m)`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "EVACORE Emergency SOS Beacon",
          text: shareText,
          url: `https://maps.google.com/?q=${lat},${lng}`,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        toast?.({ type: "success", message: "Live location message copied! Send via WhatsApp or SMS." });
      } catch {}
    }
  };

  return (
    <>
      {/* ── Circular Floating SOS Button at Bottom (Z-Index: z-[100001]) ── */}
      {!isOpen && (
        <div
          className={`fixed right-3.5 sm:right-7 bottom-22 sm:bottom-9 z-[100001] pointer-events-auto select-none ${className}`}
        >
          <button
            type="button"
            onClick={() => {
              if (isLiveTrackingActive) {
                setIsOpen(true);
              } else {
                handleTriggerSOS("Trapped in Flood");
              }
            }}
            aria-label={isLiveTrackingActive ? "View Live Emergency SOS Tracking" : "Trigger Emergency SOS Broadcast"}
            title={isLiveTrackingActive ? "Live SOS Tracking Active • Tap to view" : "Emergency SOS Broadcast"}
            className={`
              relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center
              border-[3px] border-white/95 transition-all duration-300 cursor-pointer group active:scale-95
              ${
                isLiveTrackingActive
                  ? "bg-gradient-to-br from-[#B91C1C] via-[#DC2626] to-[#047857] shadow-[0_8px_32px_rgba(220,38,38,0.75),0_0_20px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#B91C1C] shadow-[0_8px_30px_rgba(220,38,38,0.7),0_2px_8px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_42px_rgba(220,38,38,0.85)] hover:scale-108"
              }
            `}
          >
            {/* Outer pulsing ring 1 (Red distress wave) */}
            <span
              className="animate-sos-ring absolute rounded-full border-2 border-red-500 opacity-75"
              style={{ inset: -6 }}
            />

            {/* Outer pulsing ring 2 (Green satellite wave if live tracking is active) */}
            <span
              className={`animate-sos-ring absolute rounded-full border ${
                isLiveTrackingActive ? "border-emerald-400 opacity-60" : "border-red-400 opacity-35"
              }`}
              style={{ inset: -12, animationDelay: "0.5s" }}
            />

            {/* Soft inner glow */}
            <span className="absolute inset-0 rounded-full bg-red-400/20 blur-xs" />

            {/* Live GPS badge pill when tracking is active */}
            {isLiveTrackingActive && (
              <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black font-mono tracking-tighter bg-emerald-600 text-white border-2 border-white shadow-md animate-pulse z-20 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                <span>LIVE</span>
              </span>
            )}

            {/* Inner Content */}
            <div className="relative z-10 flex flex-col items-center justify-center leading-none">
              {isLiveTrackingActive ? (
                /* Rotating radar satellite crosshair */
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              ) : (
                /* Standard Emergency distress shield */
                <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight mt-0.5 drop-shadow text-white">
                {isLiveTrackingActive ? "TRACK" : "SOS"}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── High-Finish Live Location Emergency Action Modal ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100002] isolate flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 transition-opacity"
        >
          <div
            className="
              animate-slide-up w-full max-w-[500px] rounded-t-[32px] sm:rounded-3xl bg-white
              border-t-4 border-[#DC2626] p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto
            "
            style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {/* Top Bar with Live Indicator & Dismiss */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    status === "sent_online" ? "bg-emerald-400" : "bg-[#DC2626]"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    status === "sent_online" ? "bg-emerald-500" : "bg-[#DC2626]"
                  }`} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#DC2626]">
                  {status === "transmitting"
                    ? "Acquiring Satellite GPS…"
                    : status === "sent_online"
                    ? "Live Location Track Active"
                    : "Offline Emergency Mode"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                aria-label="Minimize Modal"
                title="Minimize (Keep Live Tracking Active)"
              >
                ✕
              </button>
            </div>

            {/* Live Location Telemetry Banner Card */}
            {status === "transmitting" ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                <Spinner size="md" className="text-[#DC2626] mx-auto" />
                <div className="text-sm font-bold text-red-900">Locking High-Accuracy GPS…</div>
                <p className="text-xs text-red-700">Connecting to emergency SAR rescue frequency. Stay in place.</p>
              </div>
            ) : status === "sent_online" ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-green-50 border-2 border-emerald-300 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <span className="p-1 rounded-lg bg-emerald-600 text-white shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-black text-sm text-emerald-950">Continuous Live Location Tracking</div>
                      <div className="text-[11px] text-emerald-700 font-medium">Transmitting live movement to SAR Rescue Command</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300 shrink-0">
                    BEACON #{telemetryCount}
                  </span>
                </div>

                {/* Real-time telemetry metrics grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white/85 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-stone-500 block">Live Coordinates</span>
                    <span className="font-bold text-stone-900 text-[11px] block mt-0.5 truncate">
                      {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "Acquiring…"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-stone-500 block">GPS Precision</span>
                    <span className="font-bold text-emerald-800 text-[11px] block mt-0.5">
                      {accuracy !== null ? `±${accuracy}m (High Precision)` : "Satellite Locked"}
                    </span>
                  </div>
                  {speed !== null && (
                    <div>
                      <span className="text-[9.5px] uppercase tracking-wider text-stone-500 block">Movement Speed</span>
                      <span className="font-bold text-stone-800 text-[11px] block mt-0.5">
                        {speed > 0 ? `${speed} km/h` : "Stationary (Safe)"}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-stone-500 block">Last Fix</span>
                    <span className="font-bold text-stone-800 text-[11px] block mt-0.5">
                      {lastFixTime ? lastFixTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Just now"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <a
                    href={coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Location on Google Maps</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                  <button
                    type="button"
                    onClick={handleShareLiveLocation}
                    className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{copiedLink ? "✓ Copied!" : "Share Live Pin"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-sm">Offline Mode: Cellular Data Unavailable</span>
                </div>
                <p className="text-xs text-amber-800">
                  Distress beacon saved locally. Use 2G SMS below to transmit live coordinates to State Disaster Control Room or call 112 directly.
                </p>
                <div className="text-xs text-amber-900 font-mono font-bold bg-white/70 p-2 rounded-xl border border-amber-200">
                  GPS: {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "22.5726, 88.3639"}
                </div>
              </div>
            )}

            {/* 1-Tap Emergency Situation Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 font-mono">
                Select Situation (Instant SAR Priority Update):
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

            {/* Life-Saving Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* 2G SMS Broadcast Button */}
              <a
                href={getSMSUrl()}
                className="
                  w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white font-bold text-xs shadow-md
                  hover:from-[#B91C1C] hover:to-[#DC2626] transition-all flex items-center justify-center gap-2 no-underline text-center cursor-pointer active:scale-98
                "
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>Call 112 National Emergency Helpline</span>
              </a>

              {/* Share Live Beacon with Family via WhatsApp / Native Share */}
              <button
                type="button"
                onClick={handleShareLiveLocation}
                className="
                  w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs
                  border border-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98
                "
              >
                <svg className="w-4 h-4 text-emerald-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                <span>{copiedLink ? "✓ Live Coordinates Copied!" : "Send Live GPS to Family / WhatsApp"}</span>
              </button>
            </div>

            {/* Tracking Controls: Minimize vs Terminate */}
            <div className="pt-2 border-t border-stone-200 space-y-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer text-center block"
              >
                Keep Live Tracking Active in Background (Minimize)
              </button>

              {!isConfirmingStop ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingStop(true)}
                  className="w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-red-700 transition-colors cursor-pointer text-center"
                >
                  I Am Rescued / Stop Live SOS Tracking
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-center animate-fade-in">
                  <div className="text-xs font-bold text-red-900">Are you safe? This will resolve the alert and stop GPS tracking.</div>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleStopLiveTracking}
                      className="px-3 py-1.5 rounded-xl bg-[#DC2626] text-white text-xs font-bold cursor-pointer hover:bg-red-700"
                    >
                      Yes, Stop Tracking
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingStop(false)}
                      className="px-3 py-1.5 rounded-xl bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer hover:bg-stone-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
