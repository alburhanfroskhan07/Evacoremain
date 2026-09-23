"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { haversineDistance } from "@/lib/geo";
import Spinner from "@/components/ui/Spinner";
import ShelterMap from "@/components/map/ShelterMap";
import { startSiren, stopSiren, isSirenActive } from "@/lib/acoustic-beacon";

const SPECIAL_NEEDS_ICONS = {
  medical: { label: "Medical / Injured", color: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]" },
  infant: { label: "Infant / Child", color: "bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]" },
  elderly: { label: "Elderly Senior", color: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]" },
  disability: { label: "Disability / Mobility", color: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" },
  pregnant: { label: "Pregnant / Maternity", color: "bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]" },
};

const RESCUE_STATUS_CONFIG = {
  pending: { label: "Pending Rescue", color: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" },
  en_route: { label: "Volunteer En Route", color: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]" },
  located: { label: "Evacuee Located", color: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" },
  escorted_to_shelter: { label: "Escorting to Camp", color: "bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]" },
  rescued: { label: "Rescue Completed", color: "bg-[#F4FBF7] text-[#15803D] border-[#86EFAC]" },
};

export default function VolunteerEvacueeTracker({ volunteer, toast }) {
  const [evacuees, setEvacuees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'sos' | 'medical' | 'nearby' | 'pending'
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'
  const [selectedEvacuee, setSelectedEvacuee] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  // Volunteer's live coordinates
  const [volLocation, setVolLocation] = useState({
    lat: typeof volunteer?.lat === "number" ? volunteer.lat : 22.5726,
    lng: typeof volunteer?.lng === "number" ? volunteer.lng : 88.3639,
  });
  const [gpsLocked, setGpsLocked] = useState(false);

  // Track live volunteer GPS position
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setVolLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsLocked(true);
      },
      (err) => {
        console.warn("Volunteer GPS notice:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch live evacuees from API
  const fetchEvacuees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/volunteer/evacuees");
      const data = await res.json();
      if (data?.evacuees) {
        setEvacuees(data.evacuees);
      }
    } catch (err) {
      console.warn("Failed to load evacuees:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvacuees();
    const interval = setInterval(fetchEvacuees, 15000); // 15s polling
    return () => clearInterval(interval);
  }, [fetchEvacuees]);

  // Update rescue status for an evacuee
  const handleUpdateStatus = async (evacueeId, newStatus) => {
    try {
      setUpdatingId(evacueeId);
      const res = await fetch("/api/volunteer/evacuees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evacueeId,
          rescueStatus: newStatus,
          volunteerId: volunteer?.uid || volunteer?.id || "vol-local",
          volunteerName: volunteer?.name || "Field Volunteer",
        }),
      });

      if (!res.ok) throw new Error("Status update failed");

      setEvacuees((prev) =>
        prev.map((item) =>
          item.id === evacueeId
            ? {
                ...item,
                rescueStatus: newStatus,
                dispatchedVolunteerName: volunteer?.name || "Field Volunteer",
              }
            : item
        )
      );

      toast?.({
        type: "success",
        message: `Updated status to: ${RESCUE_STATUS_CONFIG[newStatus]?.label || newStatus}`,
      });
    } catch (err) {
      toast?.({ type: "error", message: "Failed to update rescue status." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle volunteer acoustic rescue horn/siren
  const handleToggleSiren = () => {
    if (sirenPlaying) {
      stopSiren();
      setSirenPlaying(false);
      toast?.({ type: "info", message: "Acoustic rescue horn stopped." });
    } else {
      const ok = startSiren("siren");
      if (ok) {
        setSirenPlaying(true);
        toast?.({
          type: "warning",
          message: "Loud acoustic beacon active to guide nearby evacuees.",
        });
      }
    }
  };

  // Process & annotate evacuees with distance and urgency
  const processedEvacuees = useMemo(() => {
    return evacuees
      .map((evac) => {
        const eLat = typeof evac.liveLat === "number" ? evac.liveLat : evac.lat;
        const eLng = typeof evac.liveLng === "number" ? evac.liveLng : evac.lng;
        const distanceKm =
          typeof eLat === "number" && typeof eLng === "number"
            ? haversineDistance(volLocation.lat, volLocation.lng, eLat, eLng)
            : 999;

        // Estimated travel time (15 km/h boat/4x4 in flood water)
        const etaMinutes = Math.max(1, Math.round((distanceKm / 15) * 60));

        return {
          ...evac,
          targetLat: eLat,
          targetLng: eLng,
          distanceKm,
          etaMinutes,
        };
      })
      .sort((a, b) => {
        // SOS Critical first, then by nearest distance
        if (a.isSOS && !b.isSOS) return -1;
        if (!a.isSOS && b.isSOS) return 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [evacuees, volLocation]);

  // Filtered evacuees
  const filteredEvacuees = useMemo(() => {
    return processedEvacuees.filter((item) => {
      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchMissing = item.missingFamilyMemberName?.toLowerCase().includes(q);
        const matchShelter = item.assignedShelterName?.toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchMissing && !matchShelter) {
          return false;
        }
      }

      // Category chip filter
      if (activeFilter === "sos") return item.isSOS;
      if (activeFilter === "medical") {
        return (
          item.specialNeeds?.includes("medical") ||
          item.specialNeeds?.includes("infant") ||
          item.specialNeeds?.includes("pregnant")
        );
      }
      if (activeFilter === "nearby") return item.distanceKm <= 3.0;
      if (activeFilter === "pending") return item.rescueStatus === "pending";

      return true;
    });
  }, [processedEvacuees, searchQuery, activeFilter]);

  // Map markers format for ShelterMap component
  const mapShelters = useMemo(() => {
    return filteredEvacuees.map((e) => ({
      id: e.id,
      name: `${e.isSOS ? "[SOS] " : ""}${e.name} (${e.familySize} ppl)`,
      lat: e.targetLat,
      lng: e.targetLng,
      totalCapacity: e.familySize,
      currentOccupancy: e.familySize,
      approved: true,
      contactNumber: e.phone || "Emergency Relay",
      isEvacueeTarget: true,
      isSOS: e.isSOS,
      urgencyLevel: e.urgencyLevel,
      rescueStatus: e.rescueStatus,
      specialNeeds: e.specialNeeds,
      notes: e.notes,
    }));
  }, [filteredEvacuees]);

  return (
    <div className="space-y-4 text-left animate-fade-in w-full max-w-full overflow-x-hidden min-w-0">
      {/* ── Top SAR Radar Telemetry Bar ── */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1C1917] via-[#292524] to-[#1C1917] text-white border border-white/10 shadow-md space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping" />
            <span className="text-xs font-bold font-display uppercase tracking-wider text-[#F59E0B]">
              Field Rescue Radar
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                sirenPlaying
                  ? "bg-[#DC2626] text-white animate-pulse"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              <span>{sirenPlaying ? "Stop Horn" : "Sound SAR Horn"}</span>
            </button>
            <button
              type="button"
              onClick={fetchEvacuees}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer flex items-center justify-center"
              title="Refresh Radar"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center font-mono">
          <div className="p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-[#A8A29E] block">Targets</span>
            <span className="text-sm font-bold text-white">{filteredEvacuees.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-[#DC2626] block font-bold">SOS Alerts</span>
            <span className="text-sm font-bold text-[#EF4444]">
              {processedEvacuees.filter((e) => e.isSOS).length}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-[#A8A29E] block">My GPS</span>
            <span className="text-[11px] font-bold text-[#22C55E] truncate block">
              {gpsLocked ? "Active" : "Standard"}
            </span>
          </div>
        </div>
      </div>

      {/* ── View Toggle & Search Bar ── */}
      <div className="space-y-2">
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2">
          {/* Mode Switcher - 2 columns that adapt cleanly */}
          <div className="grid grid-cols-2 rounded-xl bg-[#F0F7F4] p-1 border border-[#CEE4D8] text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                viewMode === "list"
                  ? "bg-white text-[#1C1917] shadow-xs font-extrabold"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              List ({filteredEvacuees.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                viewMode === "map"
                  ? "bg-white text-[#1C1917] shadow-xs font-extrabold"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              Tactical Map
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#78716C] self-end xs:self-center">
            Sorted by nearest
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evacuee name, missing person, notes…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#CEE4D8] bg-[#FFFFFF] text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
          <svg className="w-4 h-4 text-[#A8A29E] absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: "all", label: "All Targets" },
            { id: "sos", label: "Urgent SOS" },
            { id: "medical", label: "Medical / Infant" },
            { id: "nearby", label: "Within 3 km" },
            { id: "pending", label: "Pending" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                activeFilter === tab.id
                  ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                  : "bg-[#FFFFFF] text-[#78716C] border-[#CEE4D8] hover:bg-[#F0F7F4]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAP VIEW MODE ── */}
      {viewMode === "map" && (
        <div className="space-y-2 animate-fade-in">
          <div className="rounded-2xl border border-[#E5DCCE] overflow-hidden shadow-sm" style={{ height: "420px" }}>
            <ShelterMap
              shelters={mapShelters}
              userCoords={volLocation}
              onSelectShelter={(target) => setSelectedEvacuee(target)}
            />
          </div>
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] text-[#166534] flex items-center justify-between">
            <span>Your live rescue position is shown on the map in blue.</span>
            <span className="font-mono font-bold">{volLocation.lat.toFixed(4)}, {volLocation.lng.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* ── LIST VIEW MODE ── */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {loading && evacuees.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Spinner size="md" className="mx-auto" />
              <div className="text-xs font-mono text-[#78716C]">Scanning disaster area for evacuees…</div>
            </div>
          ) : filteredEvacuees.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E5DCCE] text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#E5DCCE] flex items-center justify-center mx-auto text-[#78716C]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div className="text-sm font-bold text-[#1C1917]">No Evacuees Match Current Filters</div>
              <p className="text-xs text-[#78716C]">Try clearing search or switching to &quot;All Targets&quot;.</p>
            </div>
          ) : (
            filteredEvacuees.map((evac) => {
              const statusMeta = RESCUE_STATUS_CONFIG[evac.rescueStatus] || RESCUE_STATUS_CONFIG.pending;
              const isSOS = evac.isSOS;
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${evac.targetLat},${evac.targetLng}`;

              return (
                <div
                  key={evac.id}
                  className={`
                    p-3.5 sm:p-4 rounded-2xl border transition-all text-left space-y-3 bg-[#FFFFFF] shadow-xs min-w-0 max-w-full overflow-hidden
                    ${isSOS ? "border-l-4 border-l-[#DC2626] border-[#FECACA] bg-gradient-to-br from-[#FFFDFD] to-[#FFFFFF]" : "border-[#CEE4D8]"}
                  `}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#CEE4D8]/60 pb-2.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSOS && (
                          <span className="badge bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[9.5px] font-bold animate-pulse">
                            SOS DISTRESS
                          </span>
                        )}
                        <span className={`badge text-[9.5px] font-bold border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold font-display text-[#1C1917] mt-1 truncate">
                        {evac.name}
                      </h3>
                      <div className="text-xs text-[#78716C] truncate">
                        Family: <strong className="text-[#1C1917]">{evac.familySize} ppl</strong>
                        {evac.phone && (
                          <span className="ml-1.5 font-mono">
                            • <a href={`tel:${evac.phone}`} className="text-[#0284C7] font-semibold">{evac.phone}</a>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Distance Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold font-mono text-[#FF5A1F]">
                        {evac.distanceKm < 1
                          ? `${Math.round(evac.distanceKm * 1000)} m`
                          : `${evac.distanceKm.toFixed(1)} km`}
                      </div>
                      <div className="text-[10px] font-mono text-[#78716C]">
                        ~{evac.etaMinutes} min transit
                      </div>
                    </div>
                  </div>

                  {/* Special Needs Badges */}
                  {evac.specialNeeds && evac.specialNeeds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {evac.specialNeeds.map((needKey) => {
                        const meta = SPECIAL_NEEDS_ICONS[needKey] || { label: needKey, color: "bg-[#F0F7F4] text-[#44403C] border-[#CEE4D8]" };
                        return (
                          <span
                            key={needKey}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${meta.color}`}
                          >
                            <span>{meta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Missing Person Alert (if recorded) */}
                  {evac.missingFamilyMemberName && (
                    <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-0.5">
                      <span className="font-bold text-[11px] block">Missing Family Member Reported:</span>
                      <span className="truncate block">{evac.missingFamilyMemberName}</span>
                    </div>
                  )}

                  {/* Situation Notes / Intake Message */}
                  {evac.notes && (
                    <div className="p-2.5 rounded-xl bg-[#F0F7F4] border border-[#CEE4D8] text-xs text-[#44403C]">
                      <span className="text-[10px] uppercase font-mono font-bold text-[#78716C] block">Situation Intake:</span>
                      <p className="leading-relaxed mt-0.5">{evac.notes}</p>
                    </div>
                  )}

                  {/* Assigned Shelter */}
                  {evac.assignedShelterName && (
                    <div className="text-xs text-[#78716C] flex items-center gap-1 truncate">
                      <span>Camp:</span>
                      <span className="font-semibold text-[#1C1917] truncate">{evac.assignedShelterName}</span>
                    </div>
                  )}

                  {/* GPS Telemetry */}
                  <div className="text-[11px] font-mono text-[#78716C] flex items-center justify-between border-t border-[#CEE4D8]/60 pt-2">
                    <span className="truncate">GPS: {evac.targetLat.toFixed(4)}, {evac.targetLng.toFixed(4)}</span>
                    {evac.dispatchedVolunteerName && (
                      <span className="text-[#D97706] font-semibold truncate ml-2">Assigned: {evac.dispatchedVolunteerName}</span>
                    )}
                  </div>

                  {/* ── 1-Tap Action Center ── */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Navigation Button */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#E04810] text-white font-bold text-xs
                        hover:from-[#E04810] hover:to-[#C7420F] transition-all flex items-center justify-center gap-2 shadow-xs
                        active:scale-98 cursor-pointer no-underline text-center
                      "
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span>Start GPS Navigation</span>
                    </a>

                    {/* Field Status Quick Buttons */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        disabled={updatingId === evac.id}
                        onClick={() => handleUpdateStatus(evac.id, "en_route")}
                        className={`p-1.5 rounded-lg border text-[10.5px] font-semibold text-center truncate transition-all cursor-pointer ${
                          evac.rescueStatus === "en_route"
                            ? "bg-[#FFFBEB] border-[#F59E0B] text-[#B45309] font-bold"
                            : "bg-[#FFFFFF] border-[#CEE4D8] text-[#78716C] hover:bg-[#F0F7F4]"
                        }`}
                      >
                        En Route
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === evac.id}
                        onClick={() => handleUpdateStatus(evac.id, "located")}
                        className={`p-1.5 rounded-lg border text-[10.5px] font-semibold text-center truncate transition-all cursor-pointer ${
                          evac.rescueStatus === "located"
                            ? "bg-[#F0FDF4] border-[#16A34A] text-[#15803D] font-bold"
                            : "bg-[#FFFFFF] border-[#CEE4D8] text-[#78716C] hover:bg-[#F0F7F4]"
                        }`}
                      >
                        Located
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === evac.id}
                        onClick={() => handleUpdateStatus(evac.id, "rescued")}
                        className={`p-1.5 rounded-lg border text-[10.5px] font-semibold text-center truncate transition-all cursor-pointer ${
                          evac.rescueStatus === "rescued"
                            ? "bg-[#F4FBF7] border-[#15803D] text-[#15803D] font-bold"
                            : "bg-[#FFFFFF] border-[#CEE4D8] text-[#78716C] hover:bg-[#F0F7F4]"
                        }`}
                      >
                        Rescued
                      </button>
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
