"use client";

import { useState, useEffect } from "react";
import { startSiren, stopSiren, isSirenActive } from "@/lib/acoustic-beacon";
import { getOfflineCounts, syncAllOfflineData } from "@/lib/offline-sync";

/**
 * FieldCommunicationCard
 *
 * Emergency Field Communication & Acoustic Broadcast Station for Camp Coordinators.
 * Provides high-penetration acoustic distress signals (evacuation horn, rescue whistle, morse),
 * local station bulletin broadcasts, and zero-connection sync telemetry.
 */
export default function FieldCommunicationCard({ activeShelter, toast }) {
  const [beaconMode, setBeaconMode] = useState(null); // 'siren' | 'whistle' | 'morse' | null
  const [offlineCounts, setOfflineCounts] = useState({ total: 0 });
  const [activeBulletin, setActiveBulletin] = useState("Station operational. Intake active.");
  const [customBulletin, setCustomBulletin] = useState("");
  const [bulletinTimestamp, setBulletinTimestamp] = useState("Just now");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check initial siren state
    if (isSirenActive()) {
      setBeaconMode("siren");
    }

    // Load offline pending counts
    try {
      const counts = getOfflineCounts();
      setOfflineCounts(counts);
    } catch {}

    return () => {
      // Clean up siren on unmount if playing
      stopSiren();
    };
  }, []);

  const handleTriggerAcoustic = (mode) => {
    if (beaconMode === mode) {
      stopSiren();
      setBeaconMode(null);
      toast?.({
        type: "info",
        message: "Acoustic broadcast stopped.",
      });
      return;
    }

    const started = startSiren(mode);
    if (started) {
      setBeaconMode(mode);
      const modeLabel =
        mode === "siren"
          ? "Camp Evacuation Horn"
          : mode === "whistle"
          ? "Rescue Whistle"
          : "Morse SOS Beacon";
      toast?.({
        type: "warning",
        message: `Sounding ${modeLabel} (high-decibel acoustic broadcast).`,
      });
    } else {
      toast?.({
        type: "error",
        message: "Audio synthesizer blocked. Check device audio permissions.",
      });
    }
  };

  const handleStopAllSound = () => {
    stopSiren();
    setBeaconMode(null);
    toast?.({
      type: "info",
      message: "All field acoustic broadcasts muted.",
    });
  };

  const handleBroadcastAdvisory = (text) => {
    const message = text.trim();
    if (!message) return;
    setActiveBulletin(message);
    setBulletinTimestamp(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setCustomBulletin("");
    toast?.({
      type: "success",
      message: "Station bulletin broadcasted to camp ledger.",
    });
  };

  const handleSyncOffline = async () => {
    setIsSyncing(true);
    try {
      const result = await syncAllOfflineData();
      const updated = getOfflineCounts();
      setOfflineCounts(updated);
      toast?.({
        type: "success",
        message: `Offline sync completed: ${result?.syncedCount || 0} records uploaded.`,
      });
    } catch (err) {
      toast?.({
        type: "error",
        message: "Offline sync failed: Check network connectivity.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="card-base p-4 sm:p-5 space-y-4 rounded-3xl border-[#DCE8E2] shadow-sm bg-white min-w-0 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE8E2] pb-3.5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-display text-[#1C1917] truncate">
                Field Communication & Acoustic Broadcast Station
              </h2>
              {beaconMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#DC2626] text-white animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  AUDIO ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6E7973] line-clamp-1">
              High-decibel acoustic evacuation sirens, local camp bulletin, and zero-net relay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#F0F7F4] text-[#16A34A] border border-[#DCE8E2]">
            VHF 156.800 MHz
          </span>
          {beaconMode && (
            <button
              type="button"
              onClick={handleStopAllSound}
              className="px-3 py-1 rounded-xl text-xs font-bold font-mono bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-all cursor-pointer shadow-xs"
            >
              Mute Broadcast
            </button>
          )}
        </div>
      </div>

      {/* ── Acoustic Siren & Beacon Synthesizer Controls ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1C1917] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Acoustic Distress & Camp Evacuation Signals
          </span>
          <span className="text-[10px] font-mono text-[#6E7973]">
            Zero-internet Web Audio oscillator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Signal 1: Warble Evacuation Horn */}
          <button
            type="button"
            onClick={() => handleTriggerAcoustic("siren")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
              beaconMode === "siren"
                ? "bg-[#FEF2F2] border-[#DC2626] shadow-sm ring-1 ring-[#DC2626]"
                : "bg-white border-[#DCE8E2] hover:bg-[#F8FAF9] hover:border-[#B8D7C8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-display text-[#1C1917]">
                Evacuation Siren
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${beaconMode === "siren" ? "bg-[#DC2626] animate-ping" : "bg-[#DCE8E2]"}`} />
            </div>
            <p className="text-[10px] text-[#6E7973] font-mono">
              650Hz - 1250Hz Dual Warble
            </p>
            <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md self-start ${
              beaconMode === "siren" ? "bg-[#DC2626] text-white" : "bg-[#F0F7F4] text-[#16A34A]"
            }`}>
              {beaconMode === "siren" ? "Broadcasting" : "Sound Horn"}
            </span>
          </button>

          {/* Signal 2: High-Pitch Piercing Whistle */}
          <button
            type="button"
            onClick={() => handleTriggerAcoustic("whistle")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
              beaconMode === "whistle"
                ? "bg-[#FEF2F2] border-[#DC2626] shadow-sm ring-1 ring-[#DC2626]"
                : "bg-white border-[#DCE8E2] hover:bg-[#F8FAF9] hover:border-[#B8D7C8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-display text-[#1C1917]">
                Rescue Whistle
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${beaconMode === "whistle" ? "bg-[#DC2626] animate-ping" : "bg-[#DCE8E2]"}`} />
            </div>
            <p className="text-[10px] text-[#6E7973] font-mono">
              3.1 kHz Wind-Penetrating
            </p>
            <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md self-start ${
              beaconMode === "whistle" ? "bg-[#DC2626] text-white" : "bg-[#F0F7F4] text-[#16A34A]"
            }`}>
              {beaconMode === "whistle" ? "Broadcasting" : "Sound Whistle"}
            </span>
          </button>

          {/* Signal 3: Morse Code SOS */}
          <button
            type="button"
            onClick={() => handleTriggerAcoustic("morse")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
              beaconMode === "morse"
                ? "bg-[#FEF2F2] border-[#DC2626] shadow-sm ring-1 ring-[#DC2626]"
                : "bg-white border-[#DCE8E2] hover:bg-[#F8FAF9] hover:border-[#B8D7C8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-display text-[#1C1917]">
                Morse SOS Beacon
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${beaconMode === "morse" ? "bg-[#DC2626] animate-ping" : "bg-[#DCE8E2]"}`} />
            </div>
            <p className="text-[10px] text-[#6E7973] font-mono">
              ... --- ... Distress Pulse
            </p>
            <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-md self-start ${
              beaconMode === "morse" ? "bg-[#DC2626] text-white" : "bg-[#F0F7F4] text-[#16A34A]"
            }`}>
              {beaconMode === "morse" ? "Broadcasting" : "Sound Morse"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Camp Station Advisory Bulletin & Offline Sync Bar ── */}
      <div className="p-3.5 rounded-2xl bg-[#F0F7F4] border border-[#DCE8E2] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold font-display text-[#1C1917]">
              Current Station Advisory:
            </span>
            <span className="text-xs font-mono text-[#0284C7] bg-white px-2 py-0.5 rounded-lg border border-[#BAE6FD] truncate">
              {activeBulletin}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6E7973] shrink-0">
            Updated: {bulletinTimestamp}
          </span>
        </div>

        {/* Quick Bulletin Broadcast Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[10px] font-mono text-[#6E7973] font-bold mr-1">
            Quick Broadcast:
          </span>
          {[
            "Station intake active",
            "Medical triage open",
            "Emergency rations arriving",
            "Boil water mandate",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBroadcastAdvisory(preset)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#E7F6EC] text-[#1C1917] border border-[#DCE8E2] font-mono text-[10px] transition-all cursor-pointer shadow-2xs"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom Broadcast Input & Offline Sync Button */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1 border-t border-[#DCE8E2]/60">
          <input
            type="text"
            value={customBulletin}
            onChange={(e) => setCustomBulletin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBroadcastAdvisory(customBulletin)}
            placeholder="Type custom camp advisory announcement..."
            className="flex-1 px-3 py-1.5 rounded-xl border border-[#DCE8E2] text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
          />
          <button
            type="button"
            onClick={() => handleBroadcastAdvisory(customBulletin)}
            disabled={!customBulletin.trim()}
            className="px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-bold font-display transition-all cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Broadcast
          </button>
          <button
            type="button"
            onClick={handleSyncOffline}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F7F4] text-[#16A34A] border border-[#16A34A]/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            title="Flush local offline queue to cloud server"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span>{isSyncing ? "Syncing..." : `Sync Offline Queue (${offlineCounts.total || 0})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
