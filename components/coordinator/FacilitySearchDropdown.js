"use client";

import { useState, useRef, useEffect, useMemo } from "react";

/**
 * FacilitySearchDropdown - Searchable Dropdown for Registered Camp Facilities
 * Allows coordinators to search and switch between registered facilities effortlessly.
 */
export default function FacilitySearchDropdown({
  shelters = [],
  selectedFacilityId,
  onSelectFacility,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "available" | "critical"
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeShelter = useMemo(
    () => shelters.find((s) => s.id === selectedFacilityId) || shelters[0] || null,
    [shelters, selectedFacilityId]
  );

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filter facilities based on search query and capacity status
  const filteredShelters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return shelters.filter((s) => {
      const nameMatch = (s.name || "").toLowerCase().includes(q);
      const addressMatch = (s.address || "").toLowerCase().includes(q);
      const contactMatch = (s.contactNumber || "").toLowerCase().includes(q);
      const idMatch = (s.id || "").toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || addressMatch || contactMatch || idMatch;

      if (!matchesSearch) return false;

      const occ = Number(s.currentOccupancy) || 0;
      const cap = Number(s.totalCapacity) || 100;
      const pct = (occ / cap) * 100;

      if (filterType === "available") return pct < 90;
      if (filterType === "critical") return pct >= 90;
      return true;
    });
  }, [shelters, searchQuery, filterType]);

  const activeOcc = Number(activeShelter?.currentOccupancy) || 0;
  const activeCap = Number(activeShelter?.totalCapacity) || 100;
  const activePct = Math.round((activeOcc / activeCap) * 100);

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* ── Main Selector Trigger Card ── */}
      <div className="rounded-2xl bg-white border border-[#DCE8E2] shadow-xs p-3.5 sm:p-4 hover:border-[#FF5A1F]/40 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Active Facility Overview */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2EA] border border-[#FF5A1F]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <svg className="w-5 h-5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E5DCCE]">
                  Active Facility Focus
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activePct >= 90
                    ? "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20"
                    : activePct >= 70
                    ? "bg-[#FFFBEB] text-[#D97706] border border-[#D97706]/20"
                    : "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20"
                }`}>
                  {activePct}% Capacity ({activeOcc}/{activeCap} Beds)
                </span>
                {activeShelter?.status === "approved" && (
                  <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Approved
                  </span>
                )}
              </div>

              <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917] truncate">
                {activeShelter?.name || "Select a Registered Facility"}
              </h2>

              <p className="text-xs text-[#78716C] truncate flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{activeShelter?.address || "Kolkata Disaster Sector Relief Zone"}</span>
                {activeShelter?.contactNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{activeShelter.contactNumber}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Dropdown Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="self-stretch sm:self-center px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FFE9DC] text-[#1C1917] hover:text-[#FF5A1F] border border-[#DCE8E2] hover:border-[#FF5A1F]/40 font-bold text-xs transition-all cursor-pointer flex items-center justify-between sm:justify-center gap-2 shadow-2xs active:scale-98 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span>Switch Facility ({shelters.length})</span>
            </div>
            <svg
              className={`w-4 h-4 text-[#78716C] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#FF5A1F]" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Searchable Facilities Dropdown Popover ── */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-2xl border border-[#DCE8E2] shadow-2xl overflow-hidden animate-fade-in divide-y divide-[#E5DCCE]/50">
          {/* 1. Live Search Input Header */}
          <div className="p-3 bg-[#FAF8F5] space-y-2.5">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facilities by name, sector, address, or phone..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-[#DCE8E2] text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15 transition-all shadow-inner"
              />
              <svg className="w-4 h-4 text-[#A8A29E] absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#A8A29E] hover:text-[#1C1917] text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === "all" ? "bg-[#FF5A1F] text-white font-bold" : "text-[#78716C] hover:text-[#1C1917] hover:bg-white"
                  }`}
                >
                  All ({shelters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("available")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === "available" ? "bg-[#16A34A] text-white font-bold" : "text-[#78716C] hover:text-[#1C1917] hover:bg-white"
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("critical")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === "critical" ? "bg-[#DC2626] text-white font-bold" : "text-[#78716C] hover:text-[#1C1917] hover:bg-white"
                  }`}
                >
                  Near Full (&ge;90%)
                </button>
              </div>

              <span className="text-[10px] text-[#78716C] font-mono">
                {filteredShelters.length} found
              </span>
            </div>
          </div>

          {/* 2. Scrollable Facilities List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#FAF8F5] p-1">
            {filteredShelters.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-xs font-bold text-[#1C1917]">No facilities found</p>
                <p className="text-[11px] text-[#78716C]">
                  No registered facility matches &quot;{searchQuery}&quot;. Try a different keyword or clear search.
                </p>
              </div>
            ) : (
              filteredShelters.map((s) => {
                const isSelected = s.id === (activeShelter?.id);
                const occ = Number(s.currentOccupancy) || 0;
                const cap = Number(s.totalCapacity) || 100;
                const pct = Math.round((occ / cap) * 100);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectFacility(s.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full p-3 text-left rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#FFF2EA] border border-[#FF5A1F]/40 shadow-xs"
                        : "hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#1C1917] truncate block">
                          {s.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#FF5A1F] bg-white px-1.5 py-0.2 rounded-md border border-[#FF5A1F]/30 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#78716C] truncate">
                        <span className="truncate">{s.address || "Sector Relief Camp"}</span>
                        {s.contactNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{s.contactNumber}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          pct >= 90
                            ? "bg-[#FEF2F2] text-[#DC2626]"
                            : pct >= 70
                            ? "bg-[#FFFBEB] text-[#D97706]"
                            : "bg-[#F0FDF4] text-[#16A34A]"
                        }`}>
                          {occ}/{cap}
                        </span>
                      </div>
                      <div className="w-20 bg-[#E5DCCE] h-1.5 rounded-full overflow-hidden ml-auto">
                        <div
                          className={`h-full ${
                            pct >= 90 ? "bg-[#DC2626]" : pct >= 70 ? "bg-[#D97706]" : "bg-[#16A34A]"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
