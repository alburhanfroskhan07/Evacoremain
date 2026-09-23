"use client";

import { useMemo } from "react";

/**
 * MeterGauge Component - MeterMate Telemetry Circular Dial
 *
 * Precision SVG circular arc meter for real-time flood load, river stage,
 * and camp occupancy headroom.
 */
export default function MeterGauge({
  value = 0,
  max = 100,
  size = 140,
  strokeWidth = 10,
  title = "Telemetry",
  unit = "%",
  subtitle = "",
  variant = "auto", // "auto" | "green" | "amber" | "red" | "sky"
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorConfig = useMemo(() => {
    if (variant === "green") {
      return { stroke: "#16A34A", glow: "rgba(22, 163, 74, 0.4)", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
    }
    if (variant === "amber") {
      return { stroke: "#D97706", glow: "rgba(217, 119, 6, 0.4)", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
    }
    if (variant === "red") {
      return { stroke: "#DC2626", glow: "rgba(220, 38, 38, 0.45)", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
    }
    if (variant === "sky") {
      return { stroke: "#0284C7", glow: "rgba(2, 132, 199, 0.4)", text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" };
    }

    // Auto based on percentage
    if (percentage >= 85) {
      return { stroke: "#DC2626", glow: "rgba(220, 38, 38, 0.45)", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
    }
    if (percentage >= 60) {
      return { stroke: "#D97706", glow: "rgba(217, 119, 6, 0.4)", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
    }
    return { stroke: "#16A34A", glow: "rgba(22, 163, 74, 0.4)", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  }, [percentage, variant]);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl glass-panel relative select-none">
      {/* Top Title */}
      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-2 truncate max-w-full">
        {title}
      </div>

      {/* SVG Circular Dial */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2EFE7"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
          />
          {/* Active Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorConfig.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease",
              filter: `drop-shadow(0 0 6px ${colorConfig.glow})`,
            }}
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-stone-900 leading-none">
            {value}
            <span className="text-xs font-normal text-stone-500">{unit}</span>
          </div>
          {percentage !== undefined && (
            <span className="text-[10px] font-mono text-stone-400 mt-0.5">
              {percentage}% Load
            </span>
          )}
        </div>
      </div>

      {/* Subtitle / Status Pill */}
      {subtitle && (
        <div className={`mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border} truncate max-w-full`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
