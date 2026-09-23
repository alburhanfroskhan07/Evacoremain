"use client";

import { useState } from "react";
import Link from "next/link";
import EvacueeRegistrationForm from "@/components/evacuee/EvacueeRegistrationForm";
import FamilyPassVault from "@/components/evacuee/FamilyPassVault";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function RegisterEvacueePage() {
  const { toast, ToastContainer } = useToast();
  const t = useTranslations("evacuee");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  async function handleAIExtract(input) {
    const payload = typeof input === "string" ? { text: input } : input;
    const res = await fetch("/api/ai/extract-evacuee-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to extract info via AI");
    }

    return await res.json();
  }

  return (
    <div className="animate-fade-in space-y-4 w-full max-w-2xl mx-auto min-w-0 pb-16">
      {/* ── Quick Navigation for Citizens ── */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/90 text-stone-700 hover:text-[#FF5A36] hover:border-[#FF5A36]/40 text-xs font-bold transition-all no-underline shadow-2xs active:scale-95 select-none"
        >
          <svg className="w-3.5 h-3.5 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Disaster Grid</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/?tab=camps"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all no-underline shadow-2xs active:scale-95 select-none"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M3 20l9-16 9 16M12 4v16M8.5 20l3.5-7 3.5 7" />
            </svg>
            <span>Relief Camps</span>
          </Link>

          <Link
            href="/?tab=map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/90 text-[#FF5A36] hover:bg-orange-100 text-xs font-bold transition-all no-underline shadow-2xs active:scale-95 select-none"
          >
            <svg className="w-3.5 h-3.5 text-[#FF5A36]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Live Map</span>
          </Link>
        </div>
      </div>

      {/* ── Top Header: Spacious, Clear, Reassuring ── */}
      <div className="text-center sm:text-left space-y-1.5 pt-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF2EA] border border-[#FF5A1F]/30 text-[10px] font-bold font-mono uppercase tracking-wider text-[#FF5A1F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-pulse" />
          <span>Emergency Relief Intake</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-[#1C1917] tracking-tight">
          {t("title", "Register Family for Safe Shelter")}
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed max-w-xl">
          Instant shelter bed matching, verified water-safe routing, and offline QR relief pass generation.
        </p>
      </div>

      {/* ── Active Registered Family Passes on this Phone (Collapsible) ── */}
      <FamilyPassVault onRefreshTrigger={refreshTrigger} />

      {/* ── Main Registration Interface ── */}
      <EvacueeRegistrationForm
        onAIExtract={handleAIExtract}
        toast={toast}
        onRegistered={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ToastContainer />
    </div>
  );
}
