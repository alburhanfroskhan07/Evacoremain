"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * InstallPrompt Component - MeterMate / Meterverse Edition
 *
 * Ultra-sleek, non-intrusive frosted glass install chip.
 * Displays official EVACORE emblem and 1-tap native install trigger.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("evacore_install_dismissed")) return;
    } catch {}

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem("evacore_install_dismissed", "true");
    } catch {}
  };

  if (!showPrompt) return null;

  return (
    <div
      aria-label="App installation trigger"
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-sm animate-fade-in pointer-events-auto select-none"
    >
      <div className="glass-panel rounded-2xl px-3.5 py-2.5 shadow-xl border border-white/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-stone-200 shadow-xs">
            <Image
              src="/logo-emblem.png"
              alt="Evacore Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold font-display text-stone-900 truncate flex items-center gap-1.5">
              <span>Install EVACORE</span>
              <span className="text-[9px] font-mono font-bold uppercase text-emerald-700 bg-emerald-100 px-1 rounded">
                PWA
              </span>
            </div>
            <p className="text-[10.5px] text-stone-500 truncate">Instant zero-internet offline access</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="
              px-3 py-1.5 text-xs font-bold rounded-xl
              bg-gradient-to-r from-[#FF5A1F] to-[#E04B14] text-white
              hover:from-[#E04B14] hover:to-[#C7420F]
              transition-all duration-200 cursor-pointer shadow-xs active:scale-95
              flex items-center gap-1
            "
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-800 flex items-center justify-center text-xs transition-colors cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
