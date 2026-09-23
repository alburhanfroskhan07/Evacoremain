"use client";

import { useState, useMemo } from "react";
import SupplyStatusRow from "./SupplyStatusRow";
import { DEFAULT_SUPPLY_ITEMS } from "@/lib/supplies";

/**
 * SuppliesCard - Step F2
 *
 * Polished camp supplies triage board with mobile filter chips,
 * 1-tap stock actions, and guaranteed non-empty display.
 */
export default function SuppliesCard({ supplies = [], onUpdateSupply }) {
  const [filter, setFilter] = useState("all"); // "all" | "critical" | "low" | "adequate"

  // Guaranteed non-empty items
  const items = supplies && supplies.length > 0 ? supplies : DEFAULT_SUPPLY_ITEMS;

  const criticalCount = useMemo(() => items.filter((i) => i.status === "critical").length, [items]);
  const lowCount = useMemo(() => items.filter((i) => i.status === "low").length, [items]);
  const adequateCount = useMemo(() => items.filter((i) => i.status === "adequate").length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const handleMarkAllAdequate = () => {
    items.forEach((item) => {
      if (item.status !== "adequate") {
        onUpdateSupply?.(item.itemId, "adequate");
      }
    });
  };

  return (
    <div className="card-base p-4 sm:p-5 space-y-3.5 shadow-sm rounded-3xl border-[#DCE8E2] min-w-0 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE8E2] pb-3.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <svg className="w-4.5 h-4.5 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917] truncate">
                Camp Logistics & Supplies Board
              </h2>
            </div>
            <p className="text-[11px] text-[#6E7973] line-clamp-1">
              Tap any status to update relief dispatch trucks & district magistrate.
            </p>
          </div>
        </div>

        {/* Status Counter Badge */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          {criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold font-mono bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
              {criticalCount} Critical Deficit
            </span>
          ) : lowCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold font-mono bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              {lowCount} Low Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-bold font-mono bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              All 6 Stocked
            </span>
          )}
        </div>
      </div>

      {/* Quick Filter Chips for Phone */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
              filter === "all"
                ? "bg-[#1C1917] text-white shadow-2xs"
                : "bg-[#F0F7F4] text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("critical")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
              filter === "critical"
                ? "bg-[#DC2626] text-white shadow-2xs"
                : "bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]"
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("low")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
              filter === "low"
                ? "bg-[#D97706] text-white shadow-2xs"
                : "bg-[#FFFBEB] text-[#D97706] hover:bg-[#FEF3C7]"
            }`}
          >
            Low ({lowCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("adequate")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
              filter === "adequate"
                ? "bg-[#16A34A] text-white shadow-2xs"
                : "bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]"
            }`}
          >
            Adequate ({adequateCount})
          </button>
        </div>

        {/* 1-Tap Replenish All Shortcut */}
        {(criticalCount > 0 || lowCount > 0) && (
          <button
            type="button"
            onClick={handleMarkAllAdequate}
            className="text-[10px] font-mono font-bold text-[#15803D] hover:text-[#16A34A] bg-[#DCFCE7]/60 hover:bg-[#DCFCE7] px-2 py-1 rounded-md border border-[#86EFAC]/50 cursor-pointer transition-colors shrink-0"
            title="Mark all 6 items as Adequate"
          >
            ✓ Mark All Stocked
          </button>
        )}
      </div>

      {/* Supplies Rows */}
      <div className="divide-y divide-[#DCE8E2] min-w-0">
        {filteredItems.map((item) => (
          <SupplyStatusRow
            key={item.itemId}
            itemName={item.itemName}
            status={item.status}
            onChange={(newStatus) => onUpdateSupply?.(item.itemId, newStatus)}
          />
        ))}
      </div>
    </div>
  );
}
