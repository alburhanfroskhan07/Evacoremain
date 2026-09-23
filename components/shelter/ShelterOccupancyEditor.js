"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";
import TideGauge from "@/components/ui/TideGauge";
import SloshGauge from "@/components/ui/SloshGauge";
import { useTranslations } from "@/lib/i18n/LanguageContext";

/**
 * ShelterOccupancyEditor - Coordinator Own-Shelter Card (Master PRD Section 10.4 & 10.6)
 *
 * Polished coordinator card with rapid touch steppers, Tide-Gauge flood gauge,
 * inline validation, and Enter-to-save support.
 */
export default function ShelterOccupancyEditor({ shelter, onUpdate, toast }) {
  const [occupancy, setOccupancy] = useState(String(shelter.currentOccupancy ?? 0));
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState(null);
  const t = useTranslations("coordinator");

  // Keep state in sync with live Firestore updates from other devices / coordinators
  useEffect(() => {
    setOccupancy(String(shelter.currentOccupancy ?? 0));
  }, [shelter.currentOccupancy]);

  const numOccupancy = Number(occupancy);
  const maxCapacity = Number(shelter.totalCapacity || 0);
  const hasChanged = numOccupancy !== Number(shelter.currentOccupancy ?? 0);
  const isValid =
    occupancy !== "" &&
    !isNaN(numOccupancy) &&
    numOccupancy >= 0 &&
    (maxCapacity <= 0 || numOccupancy <= maxCapacity);

  /* ── Percentage + color tier ── */
  const pct = Math.min(100, Math.round((numOccupancy / (shelter.totalCapacity || 1)) * 100)) || 0;
  const tier = pct >= 95 ? "red" : pct >= 70 ? "yellow" : "green";

  const badgeStyle = {
    green: "badge-ok",
    yellow: "badge-warn",
    red: "badge-crit",
  }[tier];

  const statusLabel = {
    green: "Available Space",
    yellow: "Filling Rapidly",
    red: "At Capacity",
  }[tier];

  function adjustOccupancy(delta) {
    const currentVal = Number(occupancy) || 0;
    // Client-side clamp: cap delta so result stays in [0, maxCapacity]
    let nextVal = currentVal + delta;
    if (nextVal < 0) nextVal = 0;
    if (maxCapacity > 0 && nextVal > maxCapacity) nextVal = maxCapacity;

    setOccupancy(String(nextVal));
    setInlineError(null);
  }

  /* ── Save handler with Client Clamp & Auto-Retry on Out-of-Bounds Rejection ── */
  async function handleSave() {
    if (!isValid || !hasChanged) return;
    setSaving(true);
    setInlineError(null);

    // Ensure value is clamped client-side before sending
    let clampedValue = Math.max(0, numOccupancy);
    if (maxCapacity > 0 && clampedValue > maxCapacity) {
      clampedValue = maxCapacity;
    }

    try {
      await onUpdate(shelter.id, clampedValue);
      toast?.({ type: "success", message: `Saved: Occupancy updated to ${clampedValue}.` });
    } catch (err) {
      console.warn("Initial occupancy update rejected, attempting auto-recalculation retry...", err);
      // Auto-retry with fresh clamped value
      try {
        const freshClamped = Math.max(0, Math.min(maxCapacity > 0 ? maxCapacity : clampedValue, clampedValue));
        await onUpdate(shelter.id, freshClamped);
        setOccupancy(String(freshClamped));
        toast?.({ type: "warning", message: `Occupancy adjusted to valid range: ${freshClamped}.` });
      } catch (retryErr) {
        const userMsg = "Occupancy update rejected - value out of range, refreshing current count";
        setInlineError(userMsg);
        toast?.({ type: "error", message: userMsg });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isValid && hasChanged && !saving) {
      handleSave();
    }
  }

  return (
    <div className="card-base p-5 space-y-4 transition-all rounded-3xl border-[#DCE8E2] shadow-sm hover:border-[#B8D7C8] min-w-0 overflow-hidden">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-display text-[#1C1917] truncate">
              {shelter.name}
            </h3>
            {/* Separate 1-Tap Map Pinpoint Option */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab: "map" } }));
                  window.dispatchEvent(new CustomEvent("open-map-modal", { detail: { shelterId: shelter.id, lat: shelter.lat, lng: shelter.lng } }));
                }
              }}
              title="Locate camp on interactive disaster map"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold font-display bg-stone-100 hover:bg-[#F4845F]/15 text-stone-700 hover:text-[#F4845F] border border-stone-200/80 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-3 h-3 text-[#F4845F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>Map Pin</span>
            </button>
          </div>

          {shelter.contactNumber && (
            <p className="text-[11px] font-mono text-[#6E7973] mt-0.5 truncate flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span>{shelter.contactNumber}</span>
            </p>
          )}
        </div>
        <span className={`badge ${badgeStyle} shrink-0`}>
          {statusLabel}
        </span>
      </div>

      {/* Main Gauging Block with React Bits SloshGauge & Bed Inventory */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-white via-[#F0F7F4] to-[#FAF8F5] border border-[#DCE8E2] shadow-xs">
        <div className="flex flex-col items-center shrink-0">
          <SloshGauge
            value={pct}
            onChange={(newPct) => {
              if (maxCapacity > 0) {
                const newOcc = Math.round((newPct / 100) * maxCapacity);
                setOccupancy(String(newOcc));
                setInlineError(null);
              }
            }}
            interactive={true}
            showValue={true}
            liquidColor={tier === "red" ? "#E26D5C" : tier === "yellow" ? "#E0A96D" : "#52B788"}
            glassColor={tier === "red" ? "#FDF0ED" : tier === "yellow" ? "#FDF6ED" : "#EBF5F0"}
            width={68}
            height={120}
            radius={18}
            ticks={4}
            viscosity={0.16}
            tilt={0.4}
            splash={0.38}
            unit="%"
            ariaLabel="Shelter Live Occupancy Liquid Gauge"
          />
          <span className="text-[9px] font-mono font-bold text-stone-500 mt-1 uppercase tracking-wider">
            Interactive
          </span>
        </div>

        <div className="flex-1 w-full space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-[#6E7973]">Live Bed Occupancy:</span>
            <span className="text-sm font-bold font-mono text-[#1C1917]">
              {pct}% Capacity Used
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#FFFFFF] p-2.5 rounded-2xl border border-[#DCE8E2] shadow-xs">
              <div className="text-xs font-bold font-mono text-[#1C1917]">{shelter.totalCapacity}</div>
              <div className="text-[9px] font-semibold uppercase text-[#6E7973] font-mono">Total</div>
            </div>
            <div className="bg-[#FFFFFF] p-2.5 rounded-2xl border border-[#DCE8E2] shadow-xs">
              <div className="text-xs font-bold font-mono text-[#FF5A1F]">{numOccupancy}</div>
              <div className="text-[9px] font-semibold uppercase text-[#6E7973] font-mono">Occupied</div>
            </div>
            <div className="bg-[#FFFFFF] p-2.5 rounded-2xl border border-[#DCE8E2] shadow-xs">
              <div className="text-xs font-bold font-mono text-[#16A34A]">
                {Math.max(0, shelter.totalCapacity - numOccupancy)}
              </div>
              <div className="text-[9px] font-semibold uppercase text-[#6E7973] font-mono">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Touch Stepper Controls & Quick Adjust */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#1C1917]">
          <span>Adjust Headcount</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustOccupancy(-5)}
              disabled={saving || numOccupancy <= 0}
              className="px-2.5 py-1 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] font-mono text-[10.5px] cursor-pointer disabled:opacity-40 border border-[#DCE8E2] transition-all hover:scale-105 active:scale-95 shadow-xs"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => adjustOccupancy(-1)}
              disabled={saving || numOccupancy <= 0}
              className="px-2.5 py-1 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] font-mono text-[10.5px] cursor-pointer disabled:opacity-40 border border-[#DCE8E2] transition-all hover:scale-105 active:scale-95 shadow-xs"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => adjustOccupancy(1)}
              disabled={saving || numOccupancy >= shelter.totalCapacity}
              className="px-2.5 py-1 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] font-mono text-[10.5px] cursor-pointer disabled:opacity-40 border border-[#DCE8E2] transition-all hover:scale-105 active:scale-95 shadow-xs"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => adjustOccupancy(5)}
              disabled={saving || numOccupancy >= shelter.totalCapacity}
              className="px-2.5 py-1 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] font-mono text-[10.5px] cursor-pointer disabled:opacity-40 border border-[#DCE8E2] transition-all hover:scale-105 active:scale-95 shadow-xs"
            >
              +5
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-1 min-w-0">
            <input
              id={`occ-${shelter.id}`}
              type="number"
              min="0"
              max={shelter.totalCapacity}
              value={occupancy}
              onChange={(e) => {
                setOccupancy(e.target.value);
                setInlineError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={saving}
              className="form-input font-mono font-bold text-center rounded-2xl"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isValid || !hasChanged}
            className="btn-primary text-xs px-5 py-3 shrink-0 rounded-2xl shadow-xs"
          >
            {saving ? (
              <div className="flex items-center gap-1.5">
                <Spinner size="sm" className="text-white" />
                <span>Saving…</span>
              </div>
            ) : (
              <span>Save Occupancy</span>
            )}
          </button>
        </div>

        {inlineError && (
          <p className="text-[11px] font-medium text-[#DC2626] animate-fade-in">
            {inlineError}
          </p>
        )}

        {shelter.status === "pending" && (
          <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pending authority approval - will appear on live map once approved.</span>
          </div>
        )}
      </div>
    </div>
  );
}
