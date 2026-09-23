"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function GuidePage() {
  const t = useTranslations("guide");

  const [checkedItems, setCheckedItems] = useState({
    docs: true,
    water: true,
    medicine: false,
    torch: false,
    cash: false,
    powerbank: false,
  });

  const toggleCheck = (key) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hotlines = [
    {
      agency: "NDRF Disaster Helpline",
      number: "1078",
      tel: "tel:1078",
      sub: "National Disaster Response Force - Rescue & Flood Boat Operations",
      tag: "24/7 Toll Free",
    },
    {
      agency: "Emergency Medical & Ambulance",
      number: "108",
      tel: "tel:108",
      sub: "Government Emergency Medical Ambulance & Paramedic Dispatch",
      tag: "Immediate ER",
    },
    {
      agency: "State Disaster Management (SDMA)",
      number: "1070",
      tel: "tel:1070",
      sub: "District Disaster Control Room & Shelter Availability Enquiries",
      tag: "Control Room",
    },
    {
      agency: "Police Emergency",
      number: "100",
      tel: "tel:100",
      sub: "Rapid Police Response, Law Enforcement & Perimeter Rescue",
      tag: "Emergency",
    },
    {
      agency: "Fire & Rescue Services",
      number: "101",
      tel: "tel:101",
      sub: "Structural Collapse, Tree Fall & Water Pumping Assistance",
      tag: "Fire/Rescue",
    },
  ];

  return (
    <div className="animate-fade-in space-y-4 w-full max-w-lg mx-auto min-w-0 pb-12">
      {/* ── Page Header ── */}
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFF2EA] border border-[#FF5A1F]/30 text-[#C7420F] text-[11px] font-bold font-display uppercase tracking-wider mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-ping" />
          <span>Disaster Preparedness Protocol</span>
        </div>
        <h1 className="text-xl font-bold font-display text-[#1C1917] tracking-tight">
          Emergency Quick Guide
        </h1>
        <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
          Critical survival protocols, 1-tap emergency hotlines, and offline disaster instructions.
        </p>
      </div>

      {/* ── 1-Tap Emergency Hotlines ── */}
      <div className="card-base p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917] font-display">
            <svg className="w-4 h-4 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <span>Emergency Dial Hotlines (1-Tap Direct Call)</span>
          </div>
          <span className="text-[10px] font-mono text-[#DC2626] font-semibold bg-[#FEF2F2] px-2 py-0.5 rounded-md border border-[#FECACA]">
            Toll-Free
          </span>
        </div>

        <div className="space-y-2">
          {hotlines.map((h) => (
            <div
              key={h.number}
              className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] hover:border-[#FF5A1F]/50 transition-all flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1C1917] font-display">{h.agency}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-[#E5DCCE] text-[#78716C] font-mono font-semibold">
                    {h.tag}
                  </span>
                </div>
                <p className="text-[10.5px] text-[#78716C] mt-0.5 leading-snug line-clamp-1">
                  {h.sub}
                </p>
              </div>
              <a
                href={h.tel}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold font-mono tracking-wide shadow-xs transition-all active:scale-95 no-underline"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>{h.number}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Offline QR Relief Pass Instructions ── */}
      <div className="card-base p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917] font-display">
          <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          <span>How Your Offline Relief Pass Works (Zero Internet)</span>
        </div>
        <div className="space-y-2 text-[11px] text-[#57534E] leading-relaxed">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE]">
            <span className="w-5 h-5 rounded-full bg-[#FFE9DC] text-[#FF5A1F] font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
            <p>
              When you register on the <strong className="text-[#1C1917]">Register</strong> tab, your family emergency pass and food ration vouchers are cryptographically stored on this device.
            </p>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE]">
            <span className="w-5 h-5 rounded-full bg-[#FFE9DC] text-[#FF5A1F] font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
            <p>
              Take a screenshot or save the QR code. You do <strong>NOT</strong> need internet or mobile network to show this pass at relief camps or registered ration stores.
            </p>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE]">
            <span className="w-5 h-5 rounded-full bg-[#FFE9DC] text-[#FF5A1F] font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
            <p>
              Camp coordinators and relief boat volunteers scan your QR code offline to admit your family, verify medical priority, and issue food supplies.
            </p>
          </div>
        </div>
        <Link
          href="/register-evacuee"
          className="btn-primary w-full text-xs font-semibold py-2 text-center block no-underline"
        >
          Register for Evacuation Pass Now
        </Link>
      </div>

      {/* ── Flood & Water Safety Rules ── */}
      <div className="card-base p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917] font-display">
          <svg className="w-4 h-4 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>Life-Safety Flood Navigation Guidelines</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] space-y-1">
            <div className="font-bold text-[#DC2626] font-display">Water Depth Danger</div>
            <p className="text-[#991B1B] leading-snug">
              6 inches (15 cm) of fast-flowing water can knock an adult down. 12 inches (30 cm) can float light cars. Do not attempt walking past knee level.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
            <div className="font-bold text-[#D97706] font-display">Downed Power Lines</div>
            <p className="text-[#92400E] leading-snug">
              Electric current travels through standing water. If power cables are visible in flooded streets, treat the entire puddle as deadly. Stay 30 meters clear.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-1">
            <div className="font-bold text-[#16A34A] font-display">Safe Corridors</div>
            <p className="text-[#166534] leading-snug">
              Use the live EVACORE map on the Home screen to view verified passable corridors and reported water obstructions before setting out.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-1">
            <div className="font-bold text-[#2563EB] font-display">Boil or Purify Water</div>
            <p className="text-[#1E40AF] leading-snug">
              Never drink tap or flood water during inundation. Use chlorine tablets or boil for 1 full minute to prevent acute cholera and waterborne infections.
            </p>
          </div>
        </div>
      </div>

      {/* ── Emergency Evacuation Packing Checklist ── */}
      <div className="card-base p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917] font-display">
            <svg className="w-4 h-4 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Evacuation Grab-Bag Checklist</span>
          </div>
          <span className="text-[10px] text-[#78716C] font-mono">
            {Object.values(checkedItems).filter(Boolean).length}/6 Packed
          </span>
        </div>

        <div className="space-y-1.5">
          {[
            { key: "docs", label: "Aadhaar / Voter ID / Land Records", sub: "Sealed in waterproof plastic pouch" },
            { key: "water", label: "Drinking Water (2L per person)", sub: "Clean bottled or boiled water" },
            { key: "medicine", label: "Essential Medicines & Prescriptions", sub: "Insulin, BP tablets, asthma inhalers, ORS sachets" },
            { key: "torch", label: "Flashlight / Torch & Extra Batteries", sub: "Do not use candles in flooded or gas leak areas" },
            { key: "cash", label: "Cash in Small Currency Notes", sub: "ATMs and digital payment UPI will be offline without power" },
            { key: "powerbank", label: "Charged Mobile Power Bank & Cable", sub: "Keep phone on Battery Saver / Airplane mode when not calling" },
          ].map((item) => (
            <label
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              className={`
                p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all select-none
                ${checkedItems[item.key]
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                  : "bg-[#FAF8F5] border-[#E5DCCE] text-[#1C1917] hover:bg-[#F5F2EB]"
                }
              `}
            >
              <div className="min-w-0">
                <span className={`text-xs font-semibold block ${checkedItems[item.key] ? "line-through opacity-80" : ""}`}>
                  {item.label}
                </span>
                <span className="text-[10px] text-[#78716C] block leading-none mt-0.5">
                  {item.sub}
                </span>
              </div>
              <input
                type="checkbox"
                checked={checkedItems[item.key]}
                onChange={() => {}}
                className="w-4 h-4 text-[#16A34A] rounded-md focus:ring-0 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
