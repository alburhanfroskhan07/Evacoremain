"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/LanguageContext";

/**
 * ForecastWarningPanel
 *
 * Warning banner and card list for the Admin Dashboard showing shelters
 * predicted to overflow soon by the AI + weather forecasting engine.
 */
export default function ForecastWarningPanel({
  forecasts = [],
  onDivert,
  className = "",
}) {
  const t = useTranslations("forecast");

  // Filter for medium & high risk, and sort by soonest predicted hours to full
  const urgentForecasts = useMemo(() => {
    if (!Array.isArray(forecasts)) return [];

    return forecasts
      .filter((item) => {
        const risk = (item.predictedOverflowRisk || "").toLowerCase();
        return risk === "high" || risk === "medium";
      })
      .sort((a, b) => {
        const hoursA =
          typeof a.predictedHoursToFull === "number"
            ? a.predictedHoursToFull
            : (a.predictedOverflowRisk?.toLowerCase() === "high" ? 0.5 : 999);
        const hoursB =
          typeof b.predictedHoursToFull === "number"
            ? b.predictedHoursToFull
            : (b.predictedOverflowRisk?.toLowerCase() === "high" ? 0.5 : 999);

        return hoursA - hoursB;
      });
  }, [forecasts]);

  const highRiskCount = urgentForecasts.filter(
    (f) => f.predictedOverflowRisk?.toLowerCase() === "high"
  ).length;
  const mediumRiskCount = urgentForecasts.filter(
    (f) => f.predictedOverflowRisk?.toLowerCase() === "medium"
  ).length;

  if (urgentForecasts.length === 0) {
    return (
      <div
        className={`
          rounded-3xl bg-[#FFFFFF] border border-[#E5DCCE] p-5 shadow-xs
          flex items-center gap-3.5 text-[#78716C] text-sm ${className}
        `}
      >
        <div className="w-10 h-10 rounded-2xl bg-[#ECFDF3] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A] shrink-0 shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <span className="font-semibold text-[#1C1917] block font-display">
            {t("safeTitle", "Capacity Forecast: All Shelters Operating Safely")}
          </span>
          <span className="text-xs text-[#78716C]">
            {t("safeDesc", "No shelters are currently flagged for medium or high overflow risk.")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Overflow Forecast Warnings"
      className={`
        rounded-3xl border border-[#DC2626]/30 bg-gradient-to-b from-[#FEF2F2]/60 via-[#FAF8F5] to-[#FFFFFF]
        p-5 sm:p-6 shadow-md shadow-[#DC2626]/5 space-y-4 animate-fade-in ${className}
      `}
    >
      {/* Header Banner */}
      <div className="space-y-2 pb-3.5 border-b border-[#E5DCCE]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#FBE7E5] border border-[#DC2626]/30 flex items-center justify-center text-[#DC2626] shrink-0 shadow-xs">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917] truncate">
              {t("title", "Overflow Risk Forecasts (AI + Weather Engine)")}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBE7E5] text-[#DC2626] border border-[#FECACA] shrink-0 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-ping" />
            {urgentForecasts.length} At Risk
          </span>
        </div>

        <p className="text-[11px] text-[#78716C] leading-snug">
          Predictive warnings based on recent influx rates and weather telemetry.
        </p>

        {/* Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {highRiskCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FBE7E5] text-[#DC2626] border border-[#FECACA]">
              {highRiskCount} High Risk
            </span>
          )}
          {mediumRiskCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              {mediumRiskCount} Medium Risk
            </span>
          )}
        </div>
      </div>

      {/* Warning Cards Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {urgentForecasts.map((forecast) => {
          const isHigh = forecast.predictedOverflowRisk?.toLowerCase() === "high";
          const hours = forecast.predictedHoursToFull;

          // Format time string
          let timeDisplay = "Imminent overflow";
          if (typeof hours === "number") {
            if (hours < 1) {
              const mins = Math.max(15, Math.round(hours * 60));
              timeDisplay = `Full in ~${mins} mins`;
            } else if (hours === 1) {
              timeDisplay = `Full in ~1 hour`;
            } else {
              timeDisplay = `Full in ~${hours.toFixed(1).replace(".0", "")} hours`;
            }
          }

          return (
            <div
              key={forecast.shelterId}
              className={`
                relative overflow-hidden rounded-2xl border p-4 transition-all duration-200
                flex flex-col justify-between gap-3 shadow-xs
                ${isHigh
                  ? "bg-[#FFF8F8] border-[#FECACA] hover:border-[#DC2626]/60 hover:shadow-sm"
                  : "bg-[#FFFDF5] border-[#FDE68A] hover:border-[#D97706]/60 hover:shadow-sm"
                }
              `}
            >
              {/* Top Row: Shelter Name + Risk Badge */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#1C1917] leading-snug line-clamp-1 font-display">
                    {forecast.shelterName}
                  </h3>
                  <span
                    className={`
                      shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border
                      ${isHigh
                        ? "bg-[#FBE7E5] text-[#DC2626] border-[#FECACA]"
                        : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                      }
                    `}
                  >
                    {isHigh ? "High Risk" : "Medium Risk"}
                  </span>
                </div>

                {/* Time to overflow pill */}
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                      ${isHigh
                        ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                        : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                      }
                    `}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeDisplay}
                  </span>

                  {forecast.weatherCondition && (
                    <span className="text-xs text-[#78716C] truncate flex items-center gap-1 font-mono">
                      <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                      </svg>
                      {forecast.weatherCondition}
                    </span>
                  )}
                </div>

                {/* Additional context if present */}
                {(forecast.currentOccupancy !== undefined && forecast.totalCapacity !== undefined) && (
                  <div className="text-xs text-[#78716C] flex justify-between pt-1 font-mono">
                    <span>Occupancy: {forecast.currentOccupancy}/{forecast.totalCapacity}</span>
                    <span className="font-bold text-[#1C1917]">
                      {Math.round((forecast.currentOccupancy / forecast.totalCapacity) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-[#E5DCCE]/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onDivert?.(forecast.shelterId)}
                  className={`
                    w-full py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer
                    flex items-center justify-center gap-1.5 shadow-xs hover:scale-102 active:scale-98
                    ${isHigh
                      ? "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white hover:from-[#B91C1C] hover:to-[#DC2626]"
                      : "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white hover:from-[#B45309] hover:to-[#D97706]"
                    }
                  `}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span>Divert Influx</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
