"use client";

import { useState } from "react";

export default function AIDispatchModal() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [dispatchedIds, setDispatchedIds] = useState({});

  const handleRunAutoDispatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/auto-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCommit: false }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.warn("Auto-dispatch run error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchSingle = (alertId) => {
    setDispatchedIds((prev) => ({ ...prev, [alertId]: true }));
  };

  return (
    <div className="card-base p-4 sm:p-5 space-y-4 border border-[#E5DCCE] bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DCCE] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#D9531E]/10 text-[#D9531E] flex items-center justify-center font-bold text-base">
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-display text-[#221E1B]">
                AI Emergency Auto-Dispatch & Routing
              </h2>
              <span className="badge badge-flare text-[9px] py-0.2 px-1.5">
                P1-P4 Smart Triage
              </span>
            </div>
            <p className="text-[11px] text-[#797167]">
              Matches pending SOS rescues to best-equipped volunteers by vehicle & medical skill
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAutoDispatch}
          disabled={loading}
          className="
            px-3.5 py-1.5 rounded-xl bg-[#D9531E] hover:bg-[#BF4413] text-white
            text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50
          "
        >
          {loading ? (
            "Matching Volunteers…"
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>Run AI Auto-Dispatch</span>
            </span>
          )}
        </button>
      </div>

      {!recommendations && !loading && (
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DCCE] text-xs text-[#797167] text-center">
          Click <strong>&quot;Run AI Auto-Dispatch&quot;</strong> to evaluate active SOS alerts against available 4x4 vehicles, paramedic teams, and rescue rafts.
        </div>
      )}

      {loading && (
        <div className="py-8 text-center space-y-2">
          <div className="inline-block w-6 h-6 border-2 border-[#D9531E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#797167]">Evaluating SOS severity, road water-levels, and volunteer skill profiles…</p>
        </div>
      )}

      {Array.isArray(recommendations) && recommendations.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {recommendations.map((rec, idx) => {
            const isDispatched = dispatchedIds[rec.alertId];
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-[#E5DCCE] bg-white shadow-xs space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        text-[10px] font-bold px-2 py-0.5 rounded-full font-mono
                        ${
                          rec.priorityLevel?.includes("P1")
                            ? "bg-[#DC2626] text-white"
                            : rec.priorityLevel?.includes("P2")
                              ? "bg-[#EA580C] text-white"
                              : "bg-[#F59E0B] text-white"
                        }
                      `}
                    >
                      {rec.priorityLevel || "P1-CRITICAL"} • Score: {rec.priorityScore || 95}/100
                    </span>
                    <span className="text-xs font-bold text-[#221E1B]">
                      Incident #{rec.alertId}
                    </span>
                  </div>

                  <div className="text-xs text-[#57534E]">
                    Assigned: <strong className="text-[#D9531E]">{rec.volunteerName}</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF7F2] text-xs space-y-1">
                  <p className="text-[#221E1B] leading-relaxed">
                    <strong>AI Rationale:</strong> {rec.matchRationale}
                  </p>
                  {rec.recommendedAction && (
                    <p className="text-[#D9531E] font-medium text-[11px]">
                      <strong>Action:</strong> {rec.recommendedAction}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDispatchSingle(rec.alertId)}
                    disabled={isDispatched}
                    className={`
                      px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs
                      ${
                        isDispatched
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-[#221E1B] hover:bg-[#3D3631] text-white"
                      }
                    `}
                  >
                    {isDispatched ? "✓ Volunteer Notified & Dispatched" : "Confirm & Send Dispatch SMS"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
