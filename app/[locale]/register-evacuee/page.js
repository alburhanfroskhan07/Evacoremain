"use client";

import { useState } from "react";
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
