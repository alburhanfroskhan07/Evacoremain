"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * AppSplashLoader Component
 *
 * Silky-smooth branded startup loading screen.
 * Displays official EVACORE emblem, animated radar telemetry wave,
 * and high-tech initialization sequence. Fades out smoothly into the application.
 */
export default function AppSplashLoader() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [stageText, setStageText] = useState("Calibrating Disaster Mesh…");
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    setMounted(true);

    // If already loaded in this session, skip splash screen instantly for smooth navigation
    try {
      if (sessionStorage.getItem("evacore_booted")) {
        setVisible(false);
        return;
      }
    } catch {}

    const t1 = setTimeout(() => {
      setStageText("Acquiring Regional Telemetry…");
      setProgress(55);
    }, 400);

    const t2 = setTimeout(() => {
      setStageText("Locking Offline Safe Haven Vault…");
      setProgress(85);
    }, 850);

    const t3 = setTimeout(() => {
      setStageText("EVACORE Operational");
      setProgress(100);
    }, 1200);

    const t4 = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("evacore_booted", "true");
      } catch {}
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (!mounted || !visible) return null;

  return (
    <div
      aria-label="EVACORE Loading Screen"
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#0C1210] text-white transition-opacity duration-500 overflow-hidden select-none"
    >
      {/* Background Subtle Radar Grid Circles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full border border-emerald-500/10 animate-ping opacity-30" />
        <div className="w-[340px] h-[340px] rounded-full border border-emerald-500/15 animate-pulse opacity-40" />
        <div className="w-[200px] h-[200px] rounded-full border border-[#FF5A1F]/20" />
      </div>

      {/* Center Branded Emblem & Wave */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6 flex items-center justify-center">
          {/* Pulsing Aura */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#FF5A1F] to-emerald-500 blur-xl opacity-40 animate-pulse" />
          
          {/* Logo Frame */}
          <div className="relative w-full h-full rounded-3xl bg-white border-2 border-stone-200/90 p-3 shadow-2xl flex items-center justify-center">
            <Image
              src="/logo-emblem.png"
              alt="Evacore Logo"
              width={80}
              height={80}
              priority
              className="w-full h-full object-contain"
            />
          </div>

          {/* Radar Beacon Dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#0C1210]" />
          </span>
        </div>

        {/* Title & Brand */}
        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-wider text-white flex items-center gap-2">
          <span>
            <span className="text-[#FF5A36]">Eva</span>
            <span className="text-white">corE</span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            v2.0
          </span>
        </h1>
        <p className="text-xs font-mono text-stone-400 tracking-widest uppercase mt-1">
          Disaster Telemetry & Safe Haven Grid
        </p>

        {/* Progress Meter Bar */}
        <div className="w-56 sm:w-64 mt-8 space-y-2">
          <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden p-0.25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#FF5A1F] to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
            <span className="truncate pr-2">{stageText}</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="absolute bottom-6 text-[10px] font-mono text-stone-500 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>SECURE OFFLINE DISASTER NODE • WEST BENGAL GRID</span>
      </div>
    </div>
  );
}
