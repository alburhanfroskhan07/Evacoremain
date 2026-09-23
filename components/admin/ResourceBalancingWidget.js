"use client";

import { useState, useEffect } from "react";

export default function ResourceBalancingWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executedTransfers, setExecutedTransfers] = useState({});

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/supply-prediction");
      if (res.ok) {
        const json = await res.json();
        setData(json.analysis);
      }
    } catch (err) {
      console.warn("Could not fetch supply predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleExecuteTransfer = (idx) => {
    setExecutedTransfers((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="card-base p-4 sm:p-5 space-y-4 border border-[#E5DCCE] bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DCCE] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#D9531E]/10 text-[#D9531E] flex items-center justify-center">
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-display text-[#221E1B]">
                AI Resource Depletion & Re-allocation
              </h2>
              <span className="badge badge-flare text-[9px] py-0.2 px-1.5">
                OpenRouter AI
              </span>
            </div>
            <p className="text-[11px] text-[#797167]">
              Real-time consumption modeling & inter-shelter balancing
            </p>
          </div>
        </div>

        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="
            px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5ECE0] text-[#D9531E]
            border border-[#E5DCCE] text-xs font-semibold flex items-center gap-1.5
            transition-all cursor-pointer shadow-xs disabled:opacity-50
          "
        >
          <span>{loading ? "Calculating..." : "Refresh Prediction"}</span>
        </button>
      </div>

      {loading && !data && (
        <div className="py-8 text-center space-y-2">
          <div className="inline-block w-6 h-6 border-2 border-[#D9531E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#797167]">Analyzing shelter depletion rates & inventory balances…</p>
        </div>
      )}

      {data && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Banner */}
          {data.logisticsSummary && (
            <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DCCE] text-xs text-[#221E1B] leading-relaxed flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#D9531E] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="font-semibold text-[#D9531E]">Disaster Logistics Summary</p>
                <p className="text-[#57534E] mt-0.5">{data.logisticsSummary}</p>
              </div>
            </div>
          )}

          {/* Critical Depletion Alerts */}
          {Array.isArray(data.criticalAlerts) && data.criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#797167] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>Stockout Warnings</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.criticalAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`
                      p-3 rounded-2xl border text-xs space-y-1 transition-all
                      ${
                        alert.severity === "CRITICAL"
                          ? "bg-[#FEF2F2] border-[#DC2626]/30 text-[#991B1B]"
                          : "bg-[#FFFBEB] border-[#F59E0B]/30 text-[#92400E]"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="truncate">{alert.shelterName}</span>
                      <span
                        className={`
                          text-[10px] px-2 py-0.5 rounded-full font-mono font-bold
                          ${
                            alert.severity === "CRITICAL"
                              ? "bg-[#DC2626] text-white"
                              : "bg-[#F59E0B] text-white"
                          }
                        `}
                      >
                        {alert.hoursRemaining}h Left
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold flex items-center gap-1">
                      <span>{alert.resource}: {alert.message}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfer Proposals */}
          {Array.isArray(data.transferProposals) && data.transferProposals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#797167]">
                AI Inter-Shelter Transfer Directives
              </h3>
              <div className="space-y-2">
                {data.transferProposals.map((prop, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white border border-[#E5DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#221E1B]">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                          {prop.fromShelter}
                        </span>
                        <span>➔</span>
                        <span className="text-[#D9531E] bg-[#D9531E]/10 px-2 py-0.5 rounded-lg border border-[#D9531E]/20 text-[11px]">
                          {prop.toShelter}
                        </span>
                      </div>
                      <p className="text-[#57534E] text-[11.5px]">
                        <strong>Transfer:</strong> {prop.quantity} of {prop.resource} • {prop.reason}
                      </p>
                    </div>

                    <button
                      onClick={() => handleExecuteTransfer(idx)}
                      disabled={executedTransfers[idx]}
                      className={`
                        px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs
                        ${
                          executedTransfers[idx]
                            ? "bg-emerald-600 text-white cursor-default"
                            : "bg-[#D9531E] hover:bg-[#BF4413] text-white"
                        }
                      `}
                    >
                      {executedTransfers[idx] ? "✓ Directive Dispatched" : "Approve Transfer"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
