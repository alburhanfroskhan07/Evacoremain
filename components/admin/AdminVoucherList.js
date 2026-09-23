"use client";

import React, { useState } from "react";

/**
 * AdminVoucherList
 *
 * Displays voucher issuance and redemption records for district administrators.
 * Shows a prominent red "Flagged" badge with a tooltip explaining the reason
 * (prop field `flagReason`) whenever `isFlagged` is true.
 *
 * @param {Object} props
 * @param {Array<{
 *   id: string,
 *   code: string,
 *   evacueeName?: string,
 *   value?: string|number,
 *   status: 'redeemed'|'active'|'expired',
 *   issuedAt?: string,
 *   redeemedAt?: string,
 *   redeemedByShopName?: string,
 *   redeemedByShopId?: string,
 *   flagReason?: string,
 * }>} props.vouchers - List of voucher records
 * @param {Function} [props.onReviewFlag] - Callback when an admin reviews a flagged voucher
 */
function formatTimestamp(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (val.toDate && typeof val.toDate === "function") {
    return val.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (val.seconds) {
    return new Date(val.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (val instanceof Date) {
    return val.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

export default function AdminVoucherList({ vouchers = [], onReviewFlag }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'flagged' | 'redeemed' | 'active'
  const [search, setSearch] = useState("");

  const filteredVouchers = vouchers.filter((v) => {
    if (filter === "flagged" && !v.isFlagged) return false;
    if (filter === "redeemed" && v.status !== "redeemed") return false;
    if (filter === "active" && v.status !== "active") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = v.code?.toLowerCase().includes(q);
      const matchName = v.evacueeName?.toLowerCase().includes(q);
      const matchShop = v.redeemedByShopName?.toLowerCase().includes(q);
      const matchReason = v.flagReason?.toLowerCase().includes(q);
      return matchCode || matchName || matchShop || matchReason;
    }
    return true;
  });

  const flaggedCount = vouchers.filter((v) => v.isFlagged).length;

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFE9DC] border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[#1C1917]">
                Voucher Redemptions & Audit Log
              </h2>
              {flaggedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBE7E5] text-[#DC2626] border border-[#FECACA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-ping" />
                  {flaggedCount} Flagged
                </span>
              )}
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Live ledger of relief vouchers, merchant redemptions, and AI anomaly alerts.
            </p>
          </div>
        </div>

        {/* Filter Pills + Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search code, shop, name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                px-3 py-1.5 text-xs rounded-xl bg-[#FAF8F5] text-[#1C1917] placeholder-[#A8A29E]
                border border-[#E2D7C3] focus:border-[#FF5A1F] outline-none w-44 sm:w-52
              "
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1.5 text-xs text-[#78716C] hover:text-[#1C1917] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#FAF8F5] border border-[#E2D7C3]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-[#FF5A1F] text-white shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              All ({vouchers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("flagged")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filter === "flagged"
                  ? "bg-[#DC2626] text-white shadow-xs"
                  : "text-[#DC2626] hover:bg-[#FBE7E5]"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Flagged</span>
              <span>({flaggedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("redeemed")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filter === "redeemed"
                  ? "bg-[#FF5A1F] text-white shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              Redeemed
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Cards */}
      {filteredVouchers.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#FAF8F5]/60 border border-[#E2D7C3] text-[#78716C] text-xs">
          No voucher redemption records found for the selected filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredVouchers.map((voucher) => (
            <div
              key={voucher.id}
              className={`
                p-3.5 rounded-2xl border transition-all duration-150 shadow-xs space-y-2.5
                ${
                  voucher.isFlagged
                    ? "bg-[#FFF8F8] border-[#FECACA] hover:border-[#DC2626]/60"
                    : "bg-[#FFFFFF] border-[#E2D7C3] hover:border-[#FF5A1F]/40"
                }
              `}
            >
              {/* Top Row: Voucher Code + Status + Flag */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E2D7C3] text-[#1C1917]">
                    {voucher.code}
                  </span>
                  <StatusBadge status={voucher.status} />
                </div>

                {voucher.isFlagged ? (
                  <FlaggedBadge
                    reason={voucher.flagReason || "Flagged for unusual redemption velocity"}
                    voucherId={voucher.id}
                    onReview={onReviewFlag}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#16A34A] font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* Middle Row: Recipient & Value */}
              <div className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <span className="text-[#78716C] block text-[10px] uppercase font-mono">Recipient</span>
                  <span className="font-semibold text-[#1C1917]">
                    {voucher.evacueeName || "Anonymous Recipient"}
                  </span>
                </div>
                {voucher.value && (
                  <div className="text-right">
                    <span className="text-[#78716C] block text-[10px] uppercase font-mono">Entitlement</span>
                    <span className="font-medium text-[#1C1917]">{voucher.value}</span>
                  </div>
                )}
              </div>

              {/* Bottom Row: Merchant & Timestamp */}
              <div className="pt-2 border-t border-[#E2D7C3]/60 flex items-center justify-between gap-2 text-[11px] text-[#78716C]">
                <div>
                  {voucher.redeemedByShopName ? (
                    <span>Redeemed at: <strong className="text-[#1C1917] font-medium">{voucher.redeemedByShopName}</strong></span>
                  ) : (
                    <span className="italic">Not yet redeemed</span>
                  )}
                </div>
                <div>
                  {formatTimestamp(voucher.redeemedAt)
                    ? `Redeemed: ${formatTimestamp(voucher.redeemedAt)}`
                    : formatTimestamp(voucher.issuedAt)
                    ? `Issued: ${formatTimestamp(voucher.issuedAt)}`
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FlaggedBadge
 * Renders a small red 'Flagged' badge with an interactive tooltip explaining `flagReason`.
 */
function FlaggedBadge({ reason, voucherId, onReview }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Flagged: ${reason}`}
        className="
          group inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold
          bg-[#FBE7E5] text-[#DC2626] border border-[#FECACA]
          hover:bg-[#DC2626] hover:text-white transition-all cursor-pointer shadow-xs
        "
      >
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>Flagged</span>
      </button>

      {/* Tooltip Popover */}
      {showTooltip && (
        <div
          role="tooltip"
          className="
            absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl
            bg-[#1C1917] border border-[#DC2626]/40 text-white text-xs shadow-2xl
            backdrop-blur-md z-50 animate-fade-in text-left pointer-events-auto
          "
        >
          {/* Arrow */}
          <div
            className="absolute -top-1.5 right-4 w-3 h-3 bg-[#1C1917] border-t border-l border-[#DC2626]/40 transform rotate-45"
            aria-hidden="true"
          />

          <div className="relative space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#FF5A1F] font-bold uppercase tracking-wider text-[10px]">
              <svg className="w-3.5 h-3.5 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span>AI Anomaly Alert</span>
            </div>
            <p className="text-xs text-[#E2D7C3] leading-relaxed">
              {reason}
            </p>
            {onReview && (
              <div className="pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onReview(voucherId)}
                  className="text-[11px] font-semibold text-[#FF5A1F] hover:underline cursor-pointer"
                >
                  Review Merchant Log →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "redeemed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#16A34A] border border-[#BBF7D0]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        Redeemed
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFE9DC] text-[#C7420F] border border-[#FFD2B8]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF8F5] text-[#78716C] border border-[#E2D7C3]">
      Expired
    </span>
  );
}

