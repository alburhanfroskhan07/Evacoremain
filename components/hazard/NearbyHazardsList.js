"use client";

import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

/**
 * NearbyHazardsList - Step F6
 *
 * Props:
 * - hazards: Array<{ id, type, lat, lng, reportedAt, verifiedCount }>
 * - onVerify: (hazardId: string) => Promise<void>
 * - onDismiss: (hazardId: string) => Promise<void>
 * - isAdmin: boolean
 * - title?: string
 */
export default function NearbyHazardsList({
  hazards = [],
  onVerify,
  onResolve,
  onDismiss,
  isAdmin = false,
  showSolved = true,
  title = "Active Road & Flood Hazards",
}) {
  const [loadingMap, setLoadingMap] = useState({});

  const typeMeta = {
    waterlogged: {
      label: "Waterlogged Road",
      badge: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
    },
    bridge_closed: {
      label: "Bridge Closed",
      badge: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    },
    fallen_tree: {
      label: "Fallen Tree / Debris",
      badge: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    },
    power_line: {
      label: "Power Line Down",
      badge: "bg-[#F3E8FF] text-[#7C3AED] border-[#DDD6FE]",
    },
  };

  const handleVerifyClick = async (id) => {
    if (loadingMap[id]) return;
    setLoadingMap((prev) => ({ ...prev, [id]: "verify" }));
    try {
      await onVerify?.(id);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleResolveClick = async (id) => {
    if (loadingMap[id]) return;
    setLoadingMap((prev) => ({ ...prev, [id]: "resolve" }));
    try {
      await onResolve?.(id);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleDismissClick = async (id) => {
    if (loadingMap[id]) return;
    setLoadingMap((prev) => ({ ...prev, [id]: "dismiss" }));
    try {
      await onDismiss?.(id);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [id]: null }));
    }
  };

  if (hazards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E2D7C3] p-5 text-center text-xs text-[#78716C] bg-[#FAF8F5] space-y-1 animate-fade-in">
        <div className="w-7 h-7 rounded-full bg-[#ECFDF3] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto mb-1.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="font-semibold text-[#1C1917]">No active road blockages</div>
        <p className="text-[11px] text-[#78716C]">
          All reported routes in this sector are clear for emergency evacuation and relief supply transit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2D7C3] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center font-bold text-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-[#1C1917]">{title}</h3>
            <p className="text-[11px] text-[#78716C]">
              Real-time crowd-sourced road obstacles affecting shelter routing.
            </p>
          </div>
        </div>

        <span className="badge badge-crit text-[10px]">
          {hazards.length} Active
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {hazards.map((h) => {
          const meta = typeMeta[h.type] || {
            label: h.type || "Road Hazard",
            badge: "bg-[#FBE7E5] text-[#DC2626] border-[#FECACA]",
          };

          const isVerifying = loadingMap[h.id] === "verify";
          const isResolving = loadingMap[h.id] === "resolve";
          const isDismissing = loadingMap[h.id] === "dismiss";

          const isAiVerified = Boolean(h.aiVerified || h.aiAnalysis);
          const ai = h.aiAnalysis;

          return (
            <div
              key={h.id}
              className={`p-3.5 rounded-2xl border bg-[#FFFFFF] shadow-xs flex flex-col justify-between gap-2.5 transition-all ${isAiVerified ? "border-[#BBF7D0] hover:border-[#16A34A]" : "border-[#E2D7C3] hover:border-[#DC2626]/40"}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.badge}`}>
                      {meta.label}
                    </span>
                    {isAiVerified && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] text-[9px] font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        <span>AI {ai?.confidenceScore ? `${ai.confidenceScore}%` : "Verified"}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#78716C]">
                    Verified: {h.verifiedCount || 1}x
                  </span>
                </div>

                {ai?.title && (
                  <p className="text-xs font-bold text-[#1C1917] leading-tight">
                    {ai.title}
                  </p>
                )}

                {ai?.waterDepth && (
                  <div className="text-[10.5px] font-mono text-[#0284C7] bg-[#E0F2FE]/60 px-2 py-0.5 rounded-lg w-fit">
                    Depth: {ai.waterDepth.estimatedCm}cm ({ai.waterDepth.category})
                  </div>
                )}

                <div className="text-xs font-mono text-[#78716C] flex items-center gap-1 pt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>
                    GPS: {typeof h.lat === "number" ? h.lat.toFixed(4) : "22.5726"},{" "}
                    {typeof h.lng === "number" ? h.lng.toFixed(4) : "88.3639"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => handleVerifyClick(h.id)}
                  disabled={!!loadingMap[h.id]}
                  className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E2D7C3] text-[#1C1917] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Confirm blockage is still there (+1 vote)"
                >
                  {isVerifying ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-[#E05318]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span>Still there (+1)</span>
                    </>
                  )}
                </button>

                {(showSolved || onResolve) && (
                  <button
                    type="button"
                    onClick={() => handleResolveClick(h.id)}
                    disabled={!!loadingMap[h.id]}
                    className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-[#ECFDF3] hover:bg-[#D1FADF] border border-[#A6F4C5] text-[#027A48] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                    title="Mark hazard as solved / road cleared"
                  >
                    {isResolving ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#12B76A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Solved</span>
                      </>
                    )}
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDismissClick(h.id)}
                    disabled={!!loadingMap[h.id]}
                    className="py-1.5 px-2.5 rounded-xl text-xs font-medium text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer shrink-0"
                    title="Dismiss false report"
                  >
                    {isDismissing ? <Spinner size="sm" /> : "Dismiss"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
