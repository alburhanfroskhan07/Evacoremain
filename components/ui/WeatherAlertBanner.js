"use client";

import { useState, useEffect } from "react";
import { subscribeToWeatherAlert } from "@/lib/weather-alerts";

/**
 * WeatherAlertBanner Component - Step F16
 *
 * Severity-gated meteorological alert banner sitting above the sticky top bar.
 * Suppresses yellow/none advisory; renders orange (warn) and red (crit) banners with
 * persistent timestamp-keyed dismissal. Auto-subscribes if alert prop is omitted.
 */
export default function WeatherAlertBanner({ alert: alertProp }) {
  const [liveAlert, setLiveAlert] = useState(null);
  const [dismissedTimestamp, setDismissedTimestamp] = useState(null);

  useEffect(() => {
    if (alertProp !== undefined) return;
    const unsub = subscribeToWeatherAlert((data) => {
      setLiveAlert(data);
    });
    return () => unsub();
  }, [alertProp]);

  const alert = alertProp !== undefined ? alertProp : liveAlert;

  if (!alert) return null;

  const { severity, headline, lastUpdated } = alert;

  // Suppress yellow advisory & benign weather per PRD Step F16
  if (!severity || severity === "yellow" || severity === "none") {
    return null;
  }

  // If user dismissed this specific alert update timestamp, don't show it
  if (dismissedTimestamp === lastUpdated) {
    return null;
  }

  const isRed = severity === "red";

  return (
    <div
      role="alert"
      className={`
        w-full px-4 py-2.5 text-xs font-medium border-b backdrop-blur-2xl transition-all duration-300 animate-fade-in flex items-center justify-between gap-3 relative z-50
        before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent
        ${
          isRed
            ? "bg-gradient-to-r from-red-500/15 via-rose-50/80 to-white/70 text-[#991B1B] border-red-300/60 shadow-[0_4px_20px_rgba(239,68,68,0.12)]"
            : "bg-gradient-to-r from-amber-500/15 via-amber-50/80 to-white/70 text-[#92400E] border-amber-300/60 shadow-[0_4px_20px_rgba(245,158,11,0.12)]"
        }
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`p-1.5 rounded-xl border shrink-0 ${isRed ? "bg-red-500/20 text-[#DC2626] border-red-300/80 shadow-[0_0_10px_rgba(239,68,68,0.25)]" : "bg-amber-500/20 text-[#D97706] border-amber-300/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]"}`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border shadow-2xs ${isRed ? "bg-red-100/90 text-red-800 border-red-300" : "bg-amber-100/90 text-amber-900 border-amber-300"}`}>
            {isRed ? "RED ALERT: SEVERE" : "ORANGE ALERT: WARNING"}
          </span>
          <span className="font-bold font-display truncate leading-tight tracking-tight">
            {headline || "Active meteorological flood & storm warning in effect for this sector."}
          </span>
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => setDismissedTimestamp(lastUpdated)}
        title="Dismiss Alert"
        className="w-7 h-7 rounded-xl flex items-center justify-center text-current/70 hover:text-current bg-white/40 hover:bg-white/80 border border-white/60 shadow-2xs transition-all active:scale-90 cursor-pointer shrink-0"
        aria-label="Dismiss Alert"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
