"use client";

import { useState } from "react";
import { RESOURCE_TYPES } from "@/lib/volunteers";

/**
 * VolunteerIdCard Component - Step F14
 *
 * Official verified disaster relief credential badge for registered fleet volunteers.
 * Reuses the VoucherDisplay dashed card hierarchy with large mono VOL-XXXX-XXXX ID.
 */
export default function VolunteerIdCard({ volunteer }) {
  const [copied, setCopied] = useState(false);

  if (!volunteer) return null;

  const resourceMeta = RESOURCE_TYPES.find((r) => r.value === volunteer.resourceType) || {
    label: volunteer.resourceType || "Rescue Support",
    sub: "Community Field Support",
  };

  const handleCopyCode = () => {
    if (volunteer.verifiedId) {
      navigator.clipboard?.writeText(volunteer.verifiedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card-base p-5 border-2 border-dashed border-[#16A34A]/40 bg-[#FFFFFF] shadow-sm space-y-4 text-left animate-fade-in relative overflow-hidden">
      {/* Background Seal / Watermark Accent */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-[#E7F6EC]/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E4DCCC] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#E7F6EC] text-[#16A34A] flex items-center justify-center font-bold font-display text-sm border border-[#16A34A]/30 shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="badge badge-ok text-[9px] py-0.5 font-bold uppercase tracking-wider">
                Verified Credential
              </span>
              <span className="text-[10px] font-mono text-[#7A7268]">
                Govt. Auth
              </span>
            </div>
            <h2 className="text-sm font-bold font-display text-[#1C1917]">
              Rescue Fleet ID Pass
            </h2>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#16A34A] bg-[#E7F6EC] px-2 py-1 rounded-md font-semibold shrink-0">
          STATUS: READY
        </span>
      </div>

      {/* Volunteer Profile Details */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] text-xs">
        <div>
          <span className="text-[10px] text-[#7A7268] block">Volunteer Name</span>
          <span className="font-bold text-[#1C1917] truncate block">{volunteer.name || "Field Volunteer"}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#7A7268] block">Contact Phone</span>
          <span className="font-mono font-medium text-[#1C1917] truncate block">{volunteer.phone || "N/A"}</span>
        </div>
        <div className="col-span-2 pt-1 border-t border-[#E4DCCC]">
          <span className="text-[10px] text-[#7A7268] block">Assigned Resource / Fleet Category</span>
          <span className="font-semibold text-[#FF5A1F]">{resourceMeta.label}</span>
          <span className="text-[10px] text-[#7A7268] block">{resourceMeta.sub}</span>
        </div>
      </div>

      {/* Prominent Credential Code */}
      <div className="text-center p-4 rounded-xl bg-[#F0EBE2] border border-[#E4DCCC] space-y-1.5">
        <span className="text-[10px] uppercase font-mono tracking-widest text-[#7A7268]">
          Official Volunteer ID Code
        </span>
        <div className="font-mono text-2xl font-extrabold tracking-widest text-[#1C1917]">
          {volunteer.verifiedId || "VOL-PENDING"}
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="text-xs font-semibold text-[#FF5A1F] hover:text-[#C7420F] flex items-center justify-center gap-1 mx-auto pt-1 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          <span>{copied ? "Copied ID Code!" : "Copy Volunteer ID"}</span>
        </button>
      </div>

      {/* Instructions */}
      <div className="text-[11px] text-[#7A7268] space-y-1 bg-[#FFFFFF] p-2 rounded-lg border border-[#E4DCCC]">
        <div className="font-semibold text-[#1C1917]">Field Verification Protocol:</div>
        <div>1. Present this ID card to Camp Coordinators or Police checkpoints for restricted flood zone clearance.</div>
        <div>2. When dispatched to an SOS incident, confirm your ID code with dispatch authorities upon arrival.</div>
      </div>
    </div>
  );
}
