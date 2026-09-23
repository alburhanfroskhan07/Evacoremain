"use client";

import { useState, useEffect } from "react";
import { injectDisasterSimulation, clearDisasterSimulation, getActiveSimulation } from "@/lib/simulation";
import Spinner from "@/components/ui/Spinner";

/**
 * SimulationControlBar
 *
 * 1-Click Disaster Chaos Simulation Toolbar for SIH judges and live presentations.
 * Injects realistic multi-casualty disaster incidents and road blockages across the sectors.
 */
export default function SimulationControlBar({ onSimulationChange, toast }) {
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sim = getActiveSimulation();
    setActiveSimulation(sim);
  }, []);

  const handleTriggerCyclone = async () => {
    setLoading(true);
    try {
      const sim = await injectDisasterSimulation("cyclone_yaas");
      setActiveSimulation(sim);
      toast?.({
        type: "warning",
        message: "Cyclone Yaas Disaster Incident Injected: 4 SOS Alerts & 3 Road Blockages live.",
      });
      onSimulationChange?.(sim);
    } catch (err) {
      console.warn("Simulation trigger error:", err);
      toast?.({ type: "error", message: "Failed to inject simulation." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    setLoading(true);
    try {
      await clearDisasterSimulation();
      setActiveSimulation(null);
      toast?.({
        type: "success",
        message: "Simulation cleared. Restored live standard operational state.",
      });
      onSimulationChange?.(null);
    } catch (err) {
      console.warn("Simulation reset error:", err);
      toast?.({ type: "error", message: "Failed to reset simulation." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DCCE] bg-gradient-to-r from-[#FAF8F5] via-[#FFF9F5] to-[#FFFFFF] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
          activeSimulation ? "bg-[#DC2626] text-white animate-pulse" : "bg-[#FAF8F5] text-[#78716C] border border-[#E5DCCE]"
        }`}>
          {activeSimulation ? (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#D9531E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1C1917] font-display text-xs truncate">
              {activeSimulation ? activeSimulation.name : "Disaster Chaos Simulator"}
            </span>
            {activeSimulation && (
              <span className="px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 text-[9px] font-bold uppercase">
                {activeSimulation.threatLevel}
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-[#78716C] truncate">
            {activeSimulation
              ? `Injected: 4 Priority SOS Alerts • 3 AeroEye Blockages • ${activeSimulation.rainfallMmPerHour}mm/hr Rain`
              : "1-Click inject multi-casualty disaster incidents for live SIH judge testing"}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {!activeSimulation ? (
          <button
            type="button"
            onClick={handleTriggerCyclone}
            disabled={loading}
            className="
              px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C]
              text-white text-xs font-bold font-display shadow-xs transition-all
              active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5
            "
          >
            {loading ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>Simulate Cyclone Yaas</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResetSimulation}
            disabled={loading}
            className="
              px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#E5DCCE]
              text-[#1C1917] border border-[#E5DCCE] text-xs font-bold font-display shadow-xs transition-all
              active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5
            "
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-[#1C1917]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Clear Simulation</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
