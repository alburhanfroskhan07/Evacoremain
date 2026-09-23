"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";

const COOLDOWN_DURATION_SEC = 300; // 5 minutes

/**
 * AdminWeatherCard Component - Step F17
 *
 * Command-center grade meteorological radar & district alert telemetry module.
 * Displays real-time wind speed, precipitation, atmospheric risk rating,
 * and live OpenWeather/IMD sync status with rate-limit cooldown.
 */
export default function AdminWeatherCard({ alert, onRefreshWeather }) {
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleRefresh = async () => {
    if (loading || cooldownRemaining > 0 || !onRefreshWeather) return;

    setLoading(true);
    try {
      await onRefreshWeather();
      setCooldownRemaining(COOLDOWN_DURATION_SEC);
    } finally {
      setLoading(false);
    }
  };

  const formatCooldown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const severity = alert?.severity || "none";
  const isRed = severity === "red";
  const isOrange = severity === "orange";
  const isYellow = severity === "yellow";

  // Card theme tokens
  const cardTheme = isRed
    ? {
        border: "border-[#FECACA] hover:border-[#EF4444]",
        bg: "bg-gradient-to-br from-[#FEF2F2] via-[#FFFFFF] to-[#FFF5F5]",
        iconBg: "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]",
        badge: "bg-[#DC2626] text-white shadow-xs",
        badgeText: "RED ALERT: SEVERE RISK",
        ringColor: "bg-[#DC2626]",
        headlineBg: "bg-[#FEF2F2]/80 border-[#FECACA] text-[#991B1B]",
      }
    : isOrange
    ? {
        border: "border-[#FDE68A] hover:border-[#F59E0B]",
        bg: "bg-gradient-to-br from-[#FFFBEB] via-[#FFFFFF] to-[#FFFDF7]",
        iconBg: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
        badge: "bg-[#D97706] text-white shadow-xs",
        badgeText: "ORANGE ALERT: WARNING",
        ringColor: "bg-[#D97706]",
        headlineBg: "bg-[#FFFBEB]/80 border-[#FDE68A] text-[#92400E]",
      }
    : isYellow
    ? {
        border: "border-[#E5DCCE] hover:border-[#F59E0B]/50",
        bg: "bg-gradient-to-br from-[#FFFDF7] via-[#FFFFFF] to-[#FAF8F5]",
        iconBg: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
        badge: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
        badgeText: "YELLOW WATCH: ADVISORY",
        ringColor: "bg-[#F59E0B]",
        headlineBg: "bg-[#FAF8F5] border-[#E5DCCE] text-[#1C1917]",
      }
    : {
        border: "border-[#E5DCCE] hover:border-[#16A34A]/40",
        bg: "bg-gradient-to-br from-[#F0FDF4]/60 via-[#FFFFFF] to-[#FAF8F5]",
        iconBg: "bg-[#E7F6EC] text-[#16A34A] border-[#BBF7D0]",
        badge: "bg-[#E7F6EC] text-[#16A34A] border border-[#BBF7D0]",
        badgeText: "NORMAL / CALM CONDITIONS",
        ringColor: "bg-[#16A34A]",
        headlineBg: "bg-[#FAF8F5] border-[#E5DCCE] text-[#1C1917]",
      };

  return (
    <div className={`card-base p-5.5 space-y-4 text-left transition-all border ${cardTheme.border} ${cardTheme.bg} shadow-sm rounded-3xl relative overflow-hidden`}>
      {/* Decorative Accent Glow */}
      <div
        className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12 opacity-40 ${
          isRed ? "bg-[#EF4444]" : isOrange ? "bg-[#F59E0B]" : "bg-[#10B981]"
        }`}
      />

      {/* ── Top Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-xs ${cardTheme.iconBg}`}>
            <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider ${cardTheme.badge}`}>
                {cardTheme.badgeText}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#78716C]">
                <span className={`w-1.5 h-1.5 rounded-full ${cardTheme.ringColor} animate-ping`} />
                Live Radar Telemetry
              </span>
            </div>
            <h2 className="text-base font-bold font-display text-[#1C1917] tracking-tight">
              District Meteorological Alert Status
            </h2>
          </div>
        </div>

        {/* Refresh Action with Rate Limit Status */}
        <div className="flex flex-col items-start sm:items-end shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || cooldownRemaining > 0}
            className={`
              px-4 py-2 text-xs font-semibold rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-xs
              ${
                loading || cooldownRemaining > 0
                  ? "bg-[#F2EDE4] text-[#78716C] border border-[#E5DCCE] cursor-not-allowed opacity-80"
                  : "btn-primary"
              }
            `}
          >
            {loading ? (
              <>
                <Spinner size="xs" className="text-white" />
                <span>Polling Radar API…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Refresh Weather Feed</span>
              </>
            )}
          </button>

          {cooldownRemaining > 0 ? (
            <span className="text-[10px] font-mono text-[#78716C] mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Quota Cooldown: {formatCooldown(cooldownRemaining)}</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#78716C] mt-1.5">
              Source: OpenWeatherMap / IMD (Hourly Sync)
            </span>
          )}
        </div>
      </div>

      {/* ── Active Headline & Forecast Brief ── */}
      <div className={`p-4 rounded-2xl border ${cardTheme.headlineBg} space-y-1 shadow-xs`}>
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#78716C] flex items-center justify-between">
          <span>Active Forecast Advisory</span>
          {alert?.lastUpdated && (
            <span className="text-[9px] font-mono">
              Updated: {new Date(alert.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold leading-relaxed">
          {alert?.headline || "Calm regional conditions across the district. No severe flood or cyclone warnings active."}
        </p>
      </div>

      {/* ── Metric Telemetry Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Weather Condition */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-1 shadow-xs hover:border-[#D6C8B2] transition-colors">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Condition</span>
            <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </div>
          <div className="text-sm font-bold font-display text-[#1C1917] capitalize truncate">
            {alert?.weather?.condition || "Clear Skies"}
          </div>
          <span className="text-[10px] font-mono text-[#78716C] block">Atmospheric State</span>
        </div>

        {/* Wind Speed */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-1 shadow-xs hover:border-[#D6C8B2] transition-colors">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Wind Velocity</span>
            <svg className="w-3.5 h-3.5 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm font-bold font-mono text-[#1C1917]">
            {alert?.weather?.windKmh !== undefined ? `${alert.weather.windKmh} km/h` : "N/A"}
          </div>
          <span className={`text-[10px] font-mono font-bold ${alert?.weather?.windKmh >= 45 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
            {alert?.weather?.windKmh >= 45 ? "Gale Force" : "Normal Flow"}
          </span>
        </div>

        {/* Precipitation */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-1 shadow-xs hover:border-[#D6C8B2] transition-colors">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Rain Rate</span>
            <svg className="w-3.5 h-3.5 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="text-sm font-bold font-mono text-[#1C1917]">
            {alert?.weather?.rainMM !== undefined ? `${alert.weather.rainMM} mm/h` : "0 mm/h"}
          </div>
          <span className={`text-[10px] font-mono font-bold ${alert?.weather?.rainMM >= 10 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
            {alert?.weather?.rainMM >= 10 ? "Heavy Downpour" : "Light / None"}
          </span>
        </div>

        {/* Risk Level Index */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-1 shadow-xs hover:border-[#D6C8B2] transition-colors">
          <div className="flex items-center justify-between text-[#78716C]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Risk Index</span>
            <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="text-sm font-bold font-mono text-[#1C1917] uppercase">
            {severity}
          </div>
          <span className={`text-[10px] font-mono font-bold ${isRed ? "text-[#DC2626]" : isOrange ? "text-[#D97706]" : "text-[#16A34A]"}`}>
            {isRed ? "Priority Triage" : isOrange ? "Active Watch" : "Safe Operations"}
          </span>
        </div>
      </div>

      {/* ── Severity Level Multi-Segment Indicator ── */}
      <div className="pt-2 border-t border-[#E5DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-[#78716C] font-mono">
          Meteorological Threshold Scale:
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className={`px-2.5 py-0.5 rounded-full ${severity === "none" ? "bg-[#16A34A] text-white font-bold shadow-xs" : "bg-[#F2EDE4] text-[#78716C]"}`}>
            1. CALM
          </span>
          <span className="text-[#E5DCCE]">→</span>
          <span className={`px-2.5 py-0.5 rounded-full ${severity === "yellow" ? "bg-[#F59E0B] text-white font-bold shadow-xs" : "bg-[#F2EDE4] text-[#78716C]"}`}>
            2. YELLOW
          </span>
          <span className="text-[#E5DCCE]">→</span>
          <span className={`px-2.5 py-0.5 rounded-full ${severity === "orange" ? "bg-[#D97706] text-white font-bold shadow-xs" : "bg-[#F2EDE4] text-[#78716C]"}`}>
            3. ORANGE
          </span>
          <span className="text-[#E5DCCE]">→</span>
          <span className={`px-2.5 py-0.5 rounded-full ${severity === "red" ? "bg-[#DC2626] text-white font-bold shadow-xs" : "bg-[#F2EDE4] text-[#78716C]"}`}>
            4. RED (CRIT)
          </span>
        </div>
      </div>
    </div>
  );
}
