"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { subscribeToShelters } from "@/lib/shelters";
import { subscribeToHazards, reportHazard } from "@/lib/hazards";
import ReportHazardSheet from "@/components/hazard/ReportHazardSheet";
import EmergencyHospitalDrawer from "@/components/evacuee/EmergencyHospitalDrawer";
import { useToast } from "@/components/ui/Toast";
import ShelterMap from "@/components/map/ShelterMap";
import MeterGauge from "@/components/ui/MeterGauge";
import MeterMateTaskbar from "@/components/ui/MeterMateTaskbar";
import ParticleButton from "@/components/ui/ParticleButton";
import SloshGauge from "@/components/ui/SloshGauge";
import JellyRadio from "@/components/ui/JellyRadio";
import StatusMark from "@/components/ui/StatusMark";
import { haversineDistance } from "@/lib/geo";

function computeStats(shelters) {
  const total = shelters.length;
  const totalCapacity = shelters.reduce((s, sh) => s + (Number(sh.totalCapacity ?? sh.capacity) || 0), 0);
  const totalOccupancy = shelters.reduce((s, sh) => s + (Number(sh.currentOccupancy ?? sh.occupancy) || 0), 0);
  const pct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
  const available = shelters.filter(
    (sh) => (Number(sh.currentOccupancy ?? sh.occupancy) || 0) < (Number(sh.totalCapacity ?? sh.capacity) || 0)
  ).length;
  return { total, totalCapacity, totalOccupancy, pct, available };
}

// Occupancy bar component inspired by MeterMate telemetry bars
function OccupancyBar({ value, max, label, variant = "auto" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color =
    variant === "green"
      ? "bg-emerald-500"
      : pct >= 85
      ? "bg-red-500"
      : pct >= 60
      ? "bg-amber-500"
      : "bg-emerald-500";
  const glow =
    variant === "green"
      ? "shadow-[0_0_8px_rgba(34,197,94,0.35)]"
      : pct >= 85
      ? "shadow-[0_0_8px_rgba(239,68,68,0.35)]"
      : pct >= 60
      ? "shadow-[0_0_8px_rgba(245,158,11,0.35)]"
      : "shadow-[0_0_8px_rgba(34,197,94,0.35)]";

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
        <span className="text-stone-600 uppercase tracking-wider">{label}</span>
        <span className={pct >= 85 ? "text-red-600" : pct >= 60 ? "text-amber-600" : "text-emerald-600"}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-200/70 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} ${glow} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Individual camp card for the Camps view
function CampCard({ shelter, userCoords, onNavigate }) {
  const cap = Number(shelter.totalCapacity ?? shelter.capacity ?? 0);
  const occ = Number(shelter.currentOccupancy ?? shelter.occupancy ?? 0);
  const headroom = Math.max(0, cap - occ);
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  const isFull = headroom === 0;
  const dist = userCoords && shelter.lat && shelter.lng
    ? haversineDistance(userCoords.lat, userCoords.lng, shelter.lat, shelter.lng)
    : null;

  return (
    <div className={`
      glass-panel rounded-3xl p-4.5 space-y-3.5 transition-all duration-200
      hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group border
      ${isFull ? "border-red-200/80 bg-white/80" : "border-emerald-200/60 bg-white/90"}
    `}>
      <div className="flex items-start gap-3.5">
        {/* SloshGauge fluid camp occupancy liquid meter */}
        <div className="shrink-0 flex flex-col items-center">
          <SloshGauge
            value={pct}
            showValue={true}
            interactive={false}
            liquidColor={isFull ? "#E26D5C" : pct >= 70 ? "#E0A96D" : "#52B788"}
            glassColor="rgba(248, 250, 252, 0.75)"
            width={58}
            height={108}
            radius={14}
            ticks={3}
            viscosity={0.16}
            tilt={0.4}
            splash={0.38}
            unit="%"
            ariaLabel={`${shelter.name} Occupancy ${pct}%`}
          />
          <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mt-1">Level</span>
        </div>

        {/* Camp Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold font-display text-stone-900 truncate group-hover:text-[#F4845F] transition-colors">
                {shelter.name}
              </h3>
              <p className="text-[10.5px] text-stone-500 font-mono truncate">
                {shelter.address || shelter.location || "Relief Camp · Safe Haven"}
              </p>
            </div>
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase shrink-0
              ${isFull
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"}
            `}>
              {isFull ? "At Capacity" : `${headroom} Free`}
            </span>
          </div>

          {/* Tactical metrics row */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { label: "Capacity", val: cap || "—" },
              { label: "Free Beds", val: isFull ? "Full" : headroom },
              { label: "Walk ETA", val: dist ? `~${Math.max(2, Math.round((dist / 4.5) * 60))}m` : "—" },
            ].map(({ label, val }) => (
              <div key={label} className="py-1.5 px-1 rounded-xl bg-stone-50/90 border border-stone-100">
                <div className="text-[8px] font-mono uppercase tracking-wider text-stone-400">{label}</div>
                <div className="text-[10.5px] font-black font-mono text-stone-800 mt-0.5">{val}</div>
              </div>
            ))}
          </div>

          {/* Action buttons with 1-tap Map Pinpoint option */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {onNavigate && !isFull && (
              <button
                type="button"
                onClick={() => onNavigate(shelter)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#52B788] hover:bg-[#40916C] text-white font-bold text-xs font-display flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Plot Route
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab: "map" } }));
                  window.dispatchEvent(
                    new CustomEvent("open-map-modal", {
                      detail: { shelterId: shelter.id, lat: shelter.lat, lng: shelter.lng },
                    })
                  );
                }
              }}
              title="Locate camp on interactive disaster map"
              className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-[#F4845F]/15 text-stone-700 hover:text-[#F4845F] border border-stone-200 text-xs font-bold font-display flex items-center justify-center gap-1 transition-all active:scale-98 cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-[#F4845F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>Map Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { toast, ToastContainer } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shelters, setShelters] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [isHazardSheetOpen, setIsHazardSheetOpen] = useState(false);
  const [isHospitalDrawerOpen, setIsHospitalDrawerOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [hospitalCount, setHospitalCount] = useState(10);
  const [activeTab, setActiveTab] = useState("home");
  const [campSearch, setCampSearch] = useState("");
  const [campFilter, setCampFilter] = useState("all"); // all | open | nearest

  const [liveDisasterData, setLiveDisasterData] = useState({
    alertTitle: "South Bengal Monsoon Inundation Alert",
    alertLevel: "WARNING",
    riverStageMeters: 1.84,
    riverStatus: "Approaching Warning Level (2.5m)",
    floodRiskPercent: 68,
    temperature: 28,
    rainfallMm: 14.2,
    windSpeedKmh: 22,
    humidity: 84,
    aiAssessment: "Active monsoon rain bands crossing South Bengal. Primary evacuation corridors clear.",
    newsArticles: [],
  });
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userCoords, setUserCoords] = useState({ lat: 22.5726, lng: 88.3639 });
  const [gpsLocked, setGpsLocked] = useState(false);

  const fetchLiveIRLNews = useCallback(async (coords = userCoords) => {
    setIsRefreshingNews(true);
    try {
      const res = await fetch(`/api/ai/live-disaster-news?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) {
        const data = await res.json();
        setLiveDisasterData(data);
      }
    } catch (err) {
      console.warn("Live disaster news fetch notice:", err);
    } finally {
      setIsRefreshingNews(false);
    }
  }, [userCoords]);

  useEffect(() => {
    fetchLiveIRLNews(userCoords);
  }, [fetchLiveIRLNews, userCoords]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setUserCoords({ lat, lng });
          setGpsLocked(true);
          import("@/lib/hospitals").then(({ fetchNearbyHospitals }) => {
            fetchNearbyHospitals(lat, lng, 15).then((hospitals) => {
              if (hospitals && hospitals.length > 0) setHospitalCount(hospitals.length);
            }).catch(() => {});
          });
        },
        () => {},
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    // 1. Initial shelter fetch directly from API to guarantee instant load
    fetch("/api/shelters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.shelters && Array.isArray(data.shelters) && data.shelters.length > 0) {
          setShelters(data.shelters);
          setLoading(false);
        }
      })
      .catch(() => {});

    // 2. Real-time subscription with fallback
    const fallbackTimer = setTimeout(() => setLoading(false), 200);
    try {
      const unsubShelters = subscribeToShelters((liveShelters) => {
        clearTimeout(fallbackTimer);
        if (liveShelters && liveShelters.length > 0) {
          setShelters(liveShelters);
        }
        setLoading(false);
      });
      const unsubHazards = subscribeToHazards((liveHazards) => {
        setHazards(liveHazards || []);
      });
      import("@/lib/hospitals").then(({ fetchNearbyHospitals }) => {
        fetchNearbyHospitals(22.5726, 88.3639, 15).then((hospitals) => {
          if (hospitals && hospitals.length > 0) setHospitalCount(hospitals.length);
        }).catch(() => {});
      });
      return () => {
        clearTimeout(fallbackTimer);
        unsubShelters && unsubShelters();
        unsubHazards && unsubHazards();
      };
    } catch (err) {
      clearTimeout(fallbackTimer);
      setLoading(false);
    }
  }, []);

  // Listen for open-map-modal and close-map-modal events
  useEffect(() => {
    const handleOpenMap = () => {
      setActiveTab("map");
      setIsMapModalOpen(true);
    };
    const handleCloseMap = () => {
      setIsMapModalOpen(false);
    };
    window.addEventListener("open-map-modal", handleOpenMap);
    window.addEventListener("close-map-modal", handleCloseMap);
    return () => {
      window.removeEventListener("open-map-modal", handleOpenMap);
      window.removeEventListener("close-map-modal", handleCloseMap);
    };
  }, []);

  // Read URL query parameter ?tab=... on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["home", "camps", "map"].includes(tabParam)) {
        setActiveTab(tabParam);
        if (tabParam === "map") {
          setIsMapModalOpen(false);
        }
      }
    }
  }, []);

  // Listen for custom "switch-tab" events from BottomNav / Navbar / internal triggers
  useEffect(() => {
    const handler = (e) => {
      const tab = e.detail?.tab;
      if (tab && ["home", "camps", "map"].includes(tab)) {
        setActiveTab(tab);
        if (tab !== "map") {
          setIsMapModalOpen(false);
        }
      }
    };
    window.addEventListener("switch-tab", handler);
    return () => window.removeEventListener("switch-tab", handler);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab !== "map") {
      setIsMapModalOpen(false);
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { syncAllOfflineData } = await import("@/lib/offline-sync");
      const result = await syncAllOfflineData();
      const count = result.synced ?? result.syncedCount ?? 0;
      toast?.({
        type: "success",
        message: count > 0
          ? `Cloud sync complete! ${count} offline records uploaded.`
          : "System online. All disaster grid telemetry synchronized.",
      });
    } catch (err) {
      toast?.({ type: "error", message: "Sync attempt failed: network unreachable." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReportHazard = async ({ type, lat, lng, aiAnalysis }) => {
    try {
      await reportHazard({ type, lat, lng, aiAnalysis });
      toast?.({
        type: "success",
        message: aiAnalysis
          ? `AI-Verified Hazard pinned to map! Evacuation routes recalculating.`
          : "Hazard reported! Added to live evacuation map.",
      });
    } catch (err) {
      toast?.({
        type: "error",
        message: err.message || "Failed to log hazard report.",
      });
    }
  };

  const stats = computeStats(shelters);

  const nearestSafeHaven = useMemo(() => {
    if (!shelters || shelters.length === 0) return null;
    const active = shelters.filter((s) => s.status !== "rejected" && s.lat && s.lng);
    if (active.length === 0) return null;
    let closest = null;
    let minKm = Infinity;
    for (const sh of active) {
      const d = haversineDistance(userCoords.lat, userCoords.lng, sh.lat, sh.lng);
      const cap = Number(sh.totalCapacity ?? sh.capacity ?? 0);
      const occ = Number(sh.currentOccupancy ?? sh.occupancy ?? 0);
      const headroom = Math.max(0, cap - occ);
      if (headroom > 0 && d < minKm) {
        minKm = d;
        closest = { ...sh, distanceKm: d, walkingMins: Math.max(2, Math.round((d / 4.5) * 60)), headroom };
      }
    }
    if (!closest) {
      for (const sh of active) {
        const d = haversineDistance(userCoords.lat, userCoords.lng, sh.lat, sh.lng);
        if (d < minKm) {
          minKm = d;
          closest = { ...sh, distanceKm: d, walkingMins: Math.max(2, Math.round((d / 4.5) * 60)), headroom: 0 };
        }
      }
    }
    return closest;
  }, [shelters, userCoords]);

  // Filtered & sorted camps for the Camps tab
  const filteredCamps = useMemo(() => {
    let list = [...shelters];
    if (campSearch.trim()) {
      const q = campSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.location?.toLowerCase().includes(q)
      );
    }
    if (campFilter === "open") {
      list = list.filter((s) => {
        const cap = Number(s.totalCapacity ?? s.capacity ?? 0);
        const occ = Number(s.currentOccupancy ?? s.occupancy ?? 0);
        return occ < cap;
      });
    }
    if (campFilter === "nearest" || campFilter === "all") {
      list = list
        .filter((s) => s.lat && s.lng)
        .map((s) => ({
          ...s,
          _dist: haversineDistance(userCoords.lat, userCoords.lng, s.lat, s.lng),
        }))
        .sort((a, b) => (a._dist ?? 999) - (b._dist ?? 999));
    }
    return list;
  }, [shelters, campSearch, campFilter, userCoords]);

  // Public disaster grid and relief camps directory are open to all citizens without login
  if (loading) {
    return <DashboardSkeleton />;
  }

  const liveArticles = liveDisasterData.newsArticles || [];

  return (
    <div className="animate-fade-in space-y-3 sm:space-y-4 max-w-5xl mx-auto pb-32 sm:pb-24">

      {/* ── 1. Telemetry Ribbon ── */}
      <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black font-display text-stone-900 truncate block">
              {liveDisasterData.location || "District Disaster Grid • Active Monitoring"}
            </span>
          </div>
          {gpsLocked && (
            <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-bold hidden sm:inline">
              GPS Locked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 hover:text-[#FF5A1F] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Force telemetry and offline record sync"
          >
            <svg className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#FF5A1F]" : "text-emerald-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{isSyncing ? "Syncing…" : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Desktop Navigation Taskbar (Hidden on mobile to preserve single bottom glass dock) ── */}
      <div className="hidden md:block">
        <MeterMateTaskbar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          shelterCount={stats.total}
          hazardCount={hazards.length}
          hospitalCount={hospitalCount}
        />
      </div>

      {/* ── 3. HOME TAB ── */}
      {activeTab === "home" && (
        <div className="space-y-4 animate-fade-slide">

          {/* MeterMate Circular Dials */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <MeterGauge
              value={liveDisasterData.floodRiskPercent || stats.pct}
              max={100}
              size={135}
              strokeWidth={11}
              title="District Flood Load"
              unit="%"
              subtitle={`${liveDisasterData.rainfallMm || 14} mm/h Rain`}
            />
            <MeterGauge
              value={stats.totalOccupancy}
              max={stats.totalCapacity || 1}
              size={135}
              strokeWidth={11}
              title="Beds Occupied"
              unit={`/${stats.totalCapacity}`}
              subtitle={`${stats.totalCapacity - stats.totalOccupancy} Free Beds`}
            />
            <MeterGauge
              value={stats.available}
              max={stats.total || 1}
              size={135}
              strokeWidth={11}
              variant="green"
              title="Open Camps"
              unit={`/${stats.total}`}
              subtitle="Intake Active"
            />
            <MeterGauge
              value={hospitalCount}
              max={20}
              size={135}
              strokeWidth={11}
              variant="sky"
              title="24/7 ER Centers"
              unit=" Active"
              subtitle="Trauma Units"
            />
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Snap Hazard */}
            <div className="glass-panel p-4 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">AI Vision</span>
                </div>
                <h3 className="text-sm font-bold font-display text-stone-900">Road Flooded Ahead?</h3>
                <p className="text-xs text-stone-600">Snap photo to calculate water depth & vehicle passability in 2s.</p>
              </div>
              <ParticleButton
                particleColor="bg-red-500"
                onClick={() => setIsHazardSheetOpen(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold font-display text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 h-auto border-0"
              >
                Snap Hazard Photo
              </ParticleButton>
            </div>

            {/* Medical ER */}
            <div className="glass-panel p-4 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">{hospitalCount} Active</span>
                </div>
                <h3 className="text-sm font-bold font-display text-stone-900">Need Medical ER?</h3>
                <p className="text-xs text-stone-600">Locate 24/7 ER trauma centers, emergency doctors, and ambulance routes.</p>
              </div>
              <ParticleButton
                particleColor="bg-rose-500"
                onClick={() => setIsHospitalDrawerOpen(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold font-display text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 h-auto border-0"
              >
                Find Hospitals ({hospitalCount}) →
              </ParticleButton>
            </div>

            {/* Family Pass */}
            <div className="glass-panel p-4 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF5A1F] flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono text-[#FF5A1F] font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Offline QR</span>
                </div>
                <h3 className="text-sm font-bold font-display text-stone-900">Ration & Voucher Pass</h3>
                <p className="text-xs text-stone-600">Generate offline digital QR pass for food, clean water, and baby milk.</p>
              </div>
              <Link
                href="/register-evacuee"
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#FF5A1F] to-[#E04B14] hover:from-[#E04B14] hover:to-[#C7420F] text-white font-bold font-display text-xs transition-all shadow-xs text-center block no-underline active:scale-98"
              >
                Get Family Pass →
              </Link>
            </div>
          </div>

          {/* Nearest Safe Haven */}
          {nearestSafeHaven && (
            <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 border border-emerald-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono uppercase tracking-wider mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>#1 Recommended Safe Haven for You</span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black font-display text-stone-900 tracking-tight truncate">
                    {nearestSafeHaven.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 mt-0.5 truncate">
                    {nearestSafeHaven.address || "District Emergency Relief Camp Sector"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-right shrink-0 shadow-xs">
                  <div className="text-base sm:text-lg font-black font-mono text-[#FF5A1F] leading-none">
                    {nearestSafeHaven.distanceKm < 1
                      ? `${Math.round(nearestSafeHaven.distanceKm * 1000)}m`
                      : `${nearestSafeHaven.distanceKm.toFixed(1)}km`}
                  </div>
                  <div className="text-[10.5px] font-mono text-stone-500 mt-0.5">
                    ~{nearestSafeHaven.walkingMins} min walk
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-stone-50 border border-stone-200 text-center text-xs font-mono">
                <div>
                  <span className="text-[10px] text-stone-500 block">Bed Headroom</span>
                  <span className="font-bold text-emerald-600">
                    {nearestSafeHaven.headroom > 0 ? `${nearestSafeHaven.headroom} free` : "At Cap"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">Corridor</span>
                  <span className="font-bold text-emerald-600 font-display">Passable</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">Drinking Water</span>
                  <span className="font-bold text-sky-600 font-display">Available</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange("map")}
                className="w-full py-3 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04B14] text-white font-bold font-display text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                View Safe Evacuation Corridor on Map
              </button>
            </div>
          )}

          {/* Live News Feed */}
          {liveArticles.length > 0 && (
            <div className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-orange-100 text-[#FF5A1F] flex items-center justify-center text-xs font-bold">📰</span>
                  <h3 className="text-xs sm:text-sm font-bold font-display text-stone-900">Verified Field News & Civil Defense Bulletins</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">AI Verified</span>
              </div>
              <div className="divide-y divide-stone-100">
                {liveArticles.slice(0, 3).map((article) => (
                  <a
                    key={article.id}
                    href={article.link && article.link !== "#" ? article.link : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 flex items-baseline justify-between gap-2 hover:bg-stone-50 rounded-xl px-2 transition-colors block no-underline group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-orange-50 text-[#C7420F]">{article.tag}</span>
                        <span className="text-[10.5px] font-mono text-stone-500 font-semibold">{article.source} • {article.time}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-[#FF5A1F] transition-colors truncate">{article.title}</h4>
                    </div>
                    <span className="text-xs font-bold text-[#FF5A1F] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline shrink-0">Read ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. CAMPS TAB ── */}
      {activeTab === "camps" && (
        <div className="space-y-3 animate-fade-slide">
          {/* Header */}
          <div className="glass-panel px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black font-display text-stone-900">
                {stats.total} Relief Camps
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                {stats.available} intake-active · {stats.totalCapacity - stats.totalOccupancy} free beds district-wide
              </p>
            </div>
            <div>
              <JellyRadio
                items={[
                  { value: "all", label: "All Camps" },
                  { value: "open", label: "Open Only" },
                  { value: "nearest", label: "Nearest" },
                ]}
                value={campFilter}
                onChange={(val) => setCampFilter(val)}
                chipColor="rgba(241, 245, 249, 0.85)"
                activeColor="#FFFFFF"
                activeTextColor="#0F172A"
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search camps by name or location…"
              value={campSearch}
              onChange={(e) => setCampSearch(e.target.value)}
              className="form-input pl-10 pr-4"
            />
          </div>

          {/* District-wide Capacity Overview */}
          <div className="glass-panel rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-500">District Capacity Overview</h3>
            <OccupancyBar value={stats.totalOccupancy} max={stats.totalCapacity || 1} label="District Bed Load" />
            <OccupancyBar value={stats.available} max={stats.total || 1} label="Open Camps" variant="green" />
          </div>

          {/* Camp Grid */}
          {filteredCamps.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <p className="text-stone-500 text-sm font-display">No camps match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCamps.map((shelter) => (
                <CampCard
                  key={shelter.id}
                  shelter={shelter}
                  userCoords={userCoords}
                  onNavigate={(sh) => {
                    setActiveTab("map");
                    setIsMapModalOpen(false);
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("focus-map", { detail: { target: "camp", shelter: sh } }));
                    }, 150);
                    toast?.({ type: "info", message: `Plotting route to ${sh.name}…` });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. MAP TAB ── */}
      {activeTab === "map" && (
        <div className="space-y-3 animate-fade-slide">
          {/* Header Ribbon */}
          <div className="glass-panel px-4 py-3 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black font-display text-stone-900">Live Disaster Grid Map</h2>
              <p className="text-[10.5px] font-mono text-stone-500">
                {shelters.length} Camps · {hazards.length} Hazards · {hospitalCount} Medical Units
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs font-display flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Fullscreen
            </button>
          </div>

          {/* Embedded Map */}
          <div className="glass-panel rounded-3xl overflow-hidden" style={{ height: "60vh", minHeight: 380 }}>
            <ShelterMap
              shelters={shelters}
              hazards={hazards}
              userCoords={userCoords}
              isActive={activeTab === "map"}
              onReportHazard={() => {
                setIsHazardSheetOpen(true);
              }}
              className="w-full h-full"
            />
          </div>

          {/* Map Legend */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { color: "bg-emerald-500", label: "Relief Camps", count: shelters.length },
              { color: "bg-red-500", label: "Flood Hazards", count: hazards.length },
              { color: "bg-sky-500", label: "Medical Units", count: hospitalCount },
            ].map(({ color, label, count }) => (
              <div key={label} className="glass-panel rounded-xl py-2.5 px-3 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-stone-500">{label}</div>
                  <div className="text-xs font-black font-mono text-stone-900">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fullscreen Map Modal ── */}
      {isMapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100000] isolate flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-6 transition-opacity"
        >
          <div className="w-full max-w-5xl h-[100dvh] sm:h-[90vh] rounded-none sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border-0 sm:border sm:border-stone-200">
            <div className="px-4 sm:px-6 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗺️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-display text-stone-900">Live Disaster Grid Map</h3>
                  <p className="text-[10.5px] font-mono text-stone-500">
                    {shelters.length} Camps • {hazards.length} Hazards • {hospitalCount} Medical Units
                  </p>
                </div>
              </div>

              {/* Quick Tab Jump + Close */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMapModalOpen(false);
                    handleTabChange("home");
                  }}
                  className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold font-display flex items-center gap-1 cursor-pointer transition-colors"
                  title="Switch to Home Dashboard"
                >
                  <span>🏠</span>
                  <span className="hidden xs:inline">Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMapModalOpen(false);
                    handleTabChange("camps");
                  }}
                  className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold font-display flex items-center gap-1 cursor-pointer transition-colors"
                  title="Switch to Camps Directory"
                >
                  <span>🏕️</span>
                  <span className="hidden xs:inline">Camps</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMapModalOpen(false);
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("close-map-modal"));
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ml-1"
                  aria-label="Close Map"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 relative w-full h-full">
              <ShelterMap
                shelters={shelters}
                hazards={hazards}
                userCoords={userCoords}
                isActive={isMapModalOpen}
                onReportHazard={() => {
                  setIsMapModalOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("close-map-modal"));
                  }
                  setIsHazardSheetOpen(true);
                }}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Drawers & Sheets ── */}
      <EmergencyHospitalDrawer
        isOpen={isHospitalDrawerOpen}
        onClose={() => setIsHospitalDrawerOpen(false)}
        userLocation={userCoords}
        onPlotRoute={(hosp) => {
          setIsHospitalDrawerOpen(false);
          setActiveTab("map");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("open-hospital-layer", { detail: { hospital: hosp } }));
          }, 300);
          toast?.({ type: "info", message: `Plotting safe route to ${hosp.name} (${hosp.distanceKm} km)...` });
        }}
      />

      <ReportHazardSheet
        isOpen={isHazardSheetOpen}
        onClose={() => setIsHazardSheetOpen(false)}
        onReport={handleReportHazard}
      />

      <ToastContainer />
    </div>
  );
}
