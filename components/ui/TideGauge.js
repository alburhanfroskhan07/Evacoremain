"use client";

import React from "react";

/**
 * TideGauge - Signature Visual Element (Master PRD Section 10.4)
 * Ultra-Polished Physical Flood-Gauge Post Component
 *
 * @param {Object} props
 * @param {number} props.occupancy - current occupancy
 * @param {number} props.capacity - total capacity
 * @param {number} [props.height=80] - height in px
 * @param {number} [props.width=16] - width in px
 * @param {boolean} [props.showTicks=true] - show measurement depth markings
 * @param {string} [props.className=""] - extra classes
 */
export default function TideGauge({
  occupancy = 0,
  capacity = 100,
  height = 80,
  width = 16,
  showTicks = true,
  className = "",
}) {
  const cap = Math.max(1, capacity);
  const occ = Math.max(0, Math.min(cap, Number(occupancy) || 0));
  const pct = Math.min(100, Math.round((occ / cap) * 100));

  // Tier color mapping
  let fillGradient = "linear-gradient(180deg, #22C55E 0%, #16A34A 100%)";
  let waterlineColor = "#86EFAC";
  let tierLabel = "Available";

  if (pct >= 95) {
    fillGradient = "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)";
    waterlineColor = "#FCA5A5";
    tierLabel = "Full";
  } else if (pct >= 70) {
    fillGradient = "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)";
    waterlineColor = "#FDE047";
    tierLabel = "Filling";
  }

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 select-none ${className}`}
      style={{ height: `${height}px` }}
      title={`Occupancy: ${occ}/${cap} (${pct}%) - ${tierLabel}`}
      aria-label={`Flood gauge: ${pct}% full, status ${tierLabel}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Gauge Post Track */}
      <div
        className="h-full relative overflow-hidden rounded-full border border-[#D6C8B0]"
        style={{
          width: `${width}px`,
          backgroundColor: "#EDE5D8",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        {/* Subtle Glass Reflection Line */}
        <div className="absolute top-0 bottom-0 left-0.5 w-[2px] bg-white/40 z-20 pointer-events-none rounded-full" />

        {/* Measurement Ticks */}
        {showTicks && (
          <div className="absolute inset-0 flex flex-col justify-between py-1.5 px-0.5 pointer-events-none z-10 opacity-40">
            <div className="w-full h-[1px] bg-[#57534E]" />
            <div className="w-3/4 h-[1px] bg-[#57534E]" />
            <div className="w-full h-[1px] bg-[#57534E]" />
            <div className="w-3/4 h-[1px] bg-[#57534E]" />
            <div className="w-full h-[1px] bg-[#57534E]" />
          </div>
        )}

        {/* Rising Flood Water Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-400 ease-out"
          style={{
            height: `${pct}%`,
            background: fillGradient,
            boxShadow: "0 -2px 6px rgba(0,0,0,0.15)",
          }}
        >
          {/* Lighter Waterline Cap at top edge */}
          {pct > 0 && (
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                backgroundColor: waterlineColor,
                boxShadow: "0 0 4px " + waterlineColor,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
