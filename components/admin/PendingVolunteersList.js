"use client";

import { useState, useMemo } from "react";
import Spinner from "@/components/ui/Spinner";
import { RESOURCE_TYPES } from "@/lib/volunteers";

/**
 * VolunteersGovernance Component - Step F13
 *
 * Full Admin Volunteer Force Governance:
 * 1. Pending volunteer verification queue with instant credential issuance.
 * 2. Verified volunteer fleet roster showing official VOL-XXXX-XXXX IDs, deployment statuses, and resource assets.
 */
export default function PendingVolunteersList({
  pendingVolunteers = [],
  verifiedVolunteers = [],
  onVerify,
}) {
  const [subTab, setSubTab] = useState("pending"); // "pending" | "verified"
  const [searchQuery, setSearchQuery] = useState("");
  const [verifyingId, setVerifyingId] = useState(null);

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingVolunteers;
    return pendingVolunteers.filter((v) =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q) ||
      (v.resourceType || "").toLowerCase().includes(q) ||
      (v.id || v.uid || "").toLowerCase().includes(q)
    );
  }, [pendingVolunteers, searchQuery]);

  const filteredVerified = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return verifiedVolunteers;
    return verifiedVolunteers.filter((v) =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q) ||
      (v.verifiedId || "").toLowerCase().includes(q) ||
      (v.resourceType || "").toLowerCase().includes(q) ||
      (v.id || v.uid || "").toLowerCase().includes(q)
    );
  }, [verifiedVolunteers, searchQuery]);

  const handleVerify = async (v) => {
    if (!onVerify) return;
    const targetUid = v.uid || v.id;
    setVerifyingId(targetUid);
    try {
      await onVerify(targetUid);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* ── Sub-navigation & Live Counters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5DCCE]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("pending")}
            className={`
              px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border
              ${subTab === "pending"
                ? "bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-sm"
                : "bg-[#F7F4EF] text-[#78716C] border-[#E5DCCE] hover:bg-[#EBE5DB] hover:text-[#1C1917]"
              }
            `}
          >
            <span>Pending Verification</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${subTab === "pending" ? "bg-white/20 text-white" : "bg-[#FF5A1F] text-white"}`}>
              {pendingVolunteers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("verified")}
            className={`
              px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border
              ${subTab === "verified"
                ? "bg-[#1C1917] text-white border-[#1C1917] shadow-sm"
                : "bg-[#F7F4EF] text-[#78716C] border-[#E5DCCE] hover:bg-[#EBE5DB] hover:text-[#1C1917]"
              }
            `}
          >
            <span>Verified Fleet Force</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${subTab === "verified" ? "bg-white/20 text-white" : "bg-[#16A34A] text-white"}`}>
              {verifiedVolunteers.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, UID or ID..."
            className="w-full text-xs rounded-xl border border-[#E5DCCE] bg-[#F7F4EF] px-3.5 py-2 pl-9 text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#FF5A1F] focus:bg-white transition-all shadow-2xs"
          />
          <svg className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      {/* ── TAB 1: PENDING VERIFICATION QUEUE ── */}
      {subTab === "pending" && (
        <div className="space-y-3">
          {filteredPending.length === 0 ? (
            <div className="card-base p-8 sm:p-10 text-center space-y-2.5 bg-[#FAF8F5] border border-[#E5DCCE] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[#E7F6EC] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-base font-bold font-display text-[#1C1917]">
                {searchQuery ? "No Matching Pending Volunteers" : "No Pending Volunteer Verifications"}
              </h3>
              <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? "Try searching with a different name, phone number, or UID."
                  : "All community volunteers who registered have been verified by the District Command."}
              </p>
            </div>
          ) : (
            filteredPending.map((v) => {
              const targetId = v.uid || v.id;
              const resMeta = RESOURCE_TYPES.find((r) => r.value === v.resourceType) || {
                label: v.resourceType || "Rescue Support",
                sub: "Field Support",
              };
              const isBusy = verifyingId === targetId;

              return (
                <div
                  key={targetId}
                  className="card-base p-4 sm:p-5 space-y-3.5 text-left border border-[#E5DCCE] hover:border-[#FF5A1F]/50 rounded-2xl transition-all shadow-xs bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-warn text-[10px] font-bold">
                          Awaiting Verification
                        </span>
                        <span className="text-[11px] font-mono text-[#78716C] px-2 py-0.5 rounded-md bg-[#F7F4EF] border border-[#E5DCCE]">
                          UID: {targetId?.substring(0, 10)}…
                        </span>
                      </div>
                      <h4 className="text-base font-bold font-display text-[#1C1917]">
                        {v.name || "Community Volunteer"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#78716C]">
                        {v.phone && (
                          <span className="font-mono flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                            <span>{v.phone}</span>
                          </span>
                        )}
                        {v.email && (
                          <span className="font-mono flex items-center gap-1.5 text-[#57534E]">
                            <svg className="w-3.5 h-3.5 text-[#78716C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <span>{v.email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVerify(v)}
                      disabled={isBusy}
                      className="btn-primary text-xs font-semibold py-2.5 px-4 shrink-0 flex items-center gap-2 cursor-pointer shadow-xs rounded-xl active:scale-95"
                    >
                      {isBusy ? (
                        <>
                          <Spinner size="xs" className="text-white" />
                          <span>Verifying…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span>Verify Volunteer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Resource & Location Meta */}
                  <div className="p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E5DCCE] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-[#78716C] block uppercase tracking-wider">Resource / Fleet Asset</span>
                      <span className="font-bold text-sm text-[#FF5A1F]">{resMeta.label}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[#78716C] block uppercase tracking-wider">Base Coordinates</span>
                      <span className="font-mono text-xs font-semibold text-[#1C1917]">
                        {typeof v.lat === "number" ? v.lat.toFixed(4) : "22.5726"},{" "}
                        {typeof v.lng === "number" ? v.lng.toFixed(4) : "88.3639"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: VERIFIED VOLUNTEER FLEET FORCE ── */}
      {subTab === "verified" && (
        <div className="space-y-3">
          {filteredVerified.length === 0 ? (
            <div className="card-base p-8 sm:p-10 text-center space-y-2.5 bg-[#FAF8F5] border border-[#E5DCCE] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F4EF] border border-[#E5DCCE] text-[#78716C] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold font-display text-[#1C1917]">
                {searchQuery ? "No Matching Verified Volunteers" : "No Verified Volunteers Yet"}
              </h3>
              <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? "Try searching with a different name, credential code, or phone number."
                  : "Verify volunteers in the Pending Verification tab to issue their persistent credential codes."}
              </p>
            </div>
          ) : (
            filteredVerified.map((v) => {
              const targetId = v.uid || v.id;
              const resMeta = RESOURCE_TYPES.find((r) => r.value === v.resourceType) || {
                label: v.resourceType || "Rescue Support",
                sub: "Field Support",
              };
              const isDispatched = Boolean(v.dispatchedToSosId);

              return (
                <div
                  key={targetId}
                  className="card-base p-4 sm:p-5 space-y-3.5 text-left border border-[#E5DCCE] hover:border-[#16A34A]/50 rounded-2xl transition-all shadow-xs bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-success text-[10px] font-bold inline-flex items-center gap-1.5">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Verified Active
                        </span>

                        {v.verifiedId && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-[#16A34A]/10 text-[#15803D] border border-[#16A34A]/25">
                            ID: {v.verifiedId}
                          </span>
                        )}

                        {isDispatched ? (
                          <span className="badge badge-error text-[10px] font-bold">
                            Dispatched to SOS
                          </span>
                        ) : (
                          <span className="badge badge-info text-[10px] font-bold">
                            Available on Standby
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold font-display text-[#1C1917]">
                        {v.name || "Community Volunteer"}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#78716C]">
                        {v.phone && (
                          <span className="font-mono flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                            <span>{v.phone}</span>
                          </span>
                        )}
                        {v.email && (
                          <span className="font-mono flex items-center gap-1.5 text-[#57534E]">
                            <svg className="w-3.5 h-3.5 text-[#78716C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            <span>{v.email}</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-[#A8A29E] px-2 py-0.5 rounded-md bg-[#F7F4EF]">
                          UID: {targetId?.substring(0, 10)}…
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resource & Location Meta */}
                  <div className="p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E5DCCE] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-[#78716C] block uppercase tracking-wider">Resource / Fleet Category</span>
                      <span className="font-bold text-sm text-[#16A34A]">{resMeta.label}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[#78716C] block uppercase tracking-wider">Operational Coordinates</span>
                      <span className="font-mono text-xs font-semibold text-[#1C1917]">
                        {typeof v.lat === "number" ? v.lat.toFixed(4) : "22.5726"},{" "}
                        {typeof v.lng === "number" ? v.lng.toFixed(4) : "88.3639"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
