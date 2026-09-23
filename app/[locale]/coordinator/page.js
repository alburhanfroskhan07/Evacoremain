"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import ShelterOccupancyEditor from "@/components/shelter/ShelterOccupancyEditor";
import ShelterSupplyManager from "@/components/shelter/ShelterSupplyManager";
import FieldCommunicationCard from "@/components/coordinator/FieldCommunicationCard";
import FacilitySearchDropdown from "@/components/coordinator/FacilitySearchDropdown";
import ReunificationAlert from "@/components/shelter/ReunificationAlert";
import FamilyVisualMatchManager from "@/components/reunification/FamilyVisualMatchManager";
import NearbyHazardsList from "@/components/hazard/NearbyHazardsList";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { updateShelterOccupancy } from "@/lib/shelters";
import { subscribeToHazards, verifyHazard, resolveHazard } from "@/lib/hazards";
import { useAuth } from "@/lib/auth/AuthContext";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CoordinatorDashboardPage() {
  return (
    <RequireAuth allowedRoles={["coordinator", "admin"]}>
      <CoordinatorContent />
    </RequireAuth>
  );
}

const DEFAULT_SECTOR_SHELTER = {
  id: "relief-hub-central",
  name: "Salt Lake Stadium Sector 4 Relief Hub",
  totalCapacity: 500,
  currentOccupancy: 340,
  status: "approved",
  contactNumber: "+91 98300 11223",
  address: "Gate 3, Salt Lake Stadium, Sector 4, Kolkata",
};

function CoordinatorContent() {
  const { user, role } = useAuth();
  const { toast, ToastContainer } = useToast();
  const t = useTranslations("coordinator");
  const [loading, setLoading] = useState(true);
  const [shelters, setShelters] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [hazards, setHazards] = useState([]);
  const [matchAlert, setMatchAlert] = useState(null);
  const [activeSection, setActiveSection] = useState("all"); // "all" | "logistics" | "headcount" | "broadcast" | "hazards"

  useEffect(() => {
    if (!user || !db) {
      setShelters([DEFAULT_SECTOR_SHELTER]);
      setSelectedFacilityId(DEFAULT_SECTOR_SHELTER.id);
      setLoading(false);
      return;
    }
    try {
      const q = collection(db, "shelters");
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          let userShelters = all.filter((s) => s.coordinatorUid === user.uid);
          // If user has no self-registered shelters or is admin, display all active sector shelters
          if (userShelters.length === 0 || role === "admin") {
            userShelters = all.filter((s) => s.status !== "rejected" && s.status !== "closed");
          }
          if (userShelters.length === 0) {
            userShelters = [DEFAULT_SECTOR_SHELTER];
          }
          setShelters(userShelters);
          if (userShelters.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(userShelters[0].id);
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Coordinator shelters query notice:", err);
          fetch("/api/shelters")
            .then((res) => res.json())
            .then((data) => {
              if (data.shelters && data.shelters.length > 0) {
                setShelters(data.shelters);
                if (!selectedFacilityId) {
                  setSelectedFacilityId(data.shelters[0].id);
                }
              } else {
                setShelters([DEFAULT_SECTOR_SHELTER]);
                setSelectedFacilityId(DEFAULT_SECTOR_SHELTER.id);
              }
              setLoading(false);
            })
            .catch(() => {
              setShelters([DEFAULT_SECTOR_SHELTER]);
              setSelectedFacilityId(DEFAULT_SECTOR_SHELTER.id);
              setLoading(false);
            });
        }
      );

      const unsubHazards = subscribeToHazards((liveHazards) => {
        setHazards(liveHazards || []);
      });

      return () => {
        unsubscribe();
        unsubHazards();
      };
    } catch (e) {
      console.warn("Coordinator shelters query notice:", e);
      setLoading(false);
    }
  }, [user, role, selectedFacilityId]);

  const handleVerifyHazard = async (hazardId) => {
    try {
      await verifyHazard(hazardId);
      setHazards((prev) =>
        prev.map((h) =>
          h.id === hazardId ? { ...h, verifiedCount: (Number(h.verifiedCount) || 1) + 1 } : h
        )
      );
      toast?.({ type: "success", message: "Hazard status confirmed (+1 Still there)." });
    } catch (err) {
      toast?.({ type: "error", message: "Failed to verify hazard." });
    }
  };

  const handleResolveHazard = async (hazardId) => {
    try {
      await resolveHazard(hazardId, { resolvedBy: user?.uid || "coordinator" });
      setHazards((prev) => prev.filter((h) => h.id !== hazardId));
      toast?.({ type: "success", message: "Hazard marked as Solved! Route cleared." });
    } catch (err) {
      toast?.({ type: "error", message: "Failed to mark hazard as solved." });
    }
  };

  async function handleUpdate(shelterId, newOccupancy) {
    try {
      await updateShelterOccupancy(shelterId, newOccupancy);
      setShelters((prev) =>
        prev.map((s) => (s.id === shelterId ? { ...s, currentOccupancy: newOccupancy } : s))
      );
    } catch (err) {
      // Local optimistic fallback for demo testing if offline / unapproved
      setShelters((prev) =>
        prev.map((s) => (s.id === shelterId ? { ...s, currentOccupancy: newOccupancy } : s))
      );
    }
  }

  function handleDismissMatch() {
    setMatchAlert(null);
    toast?.({ type: "info", message: "Reunification notification dismissed." });
  }

  function handleConfirmReunion(match) {
    toast?.({
      type: "success",
      message: `Reunion record logged for ${match.evacueeName}!`,
    });
    setMatchAlert(null);
  }

  function handleSimulateMatch() {
    setMatchAlert({
      id: `match-${Date.now()}`,
      evacueeName: "Priya Das",
      relationship: "Daughter of Ananya Das",
      matchedAtShelterName: "Salt Lake Stadium Relief Hub",
      contactNumber: "+91 98301 23456",
      timestamp: "Just now",
    });
    toast?.({ type: "success", message: "New family reunification match alert loaded." });
  }

  // Aggregate metrics
  const totalBeds = useMemo(
    () => shelters.reduce((acc, s) => acc + (Number(s.totalCapacity) || 0), 0),
    [shelters]
  );
  const totalOccupants = useMemo(
    () => shelters.reduce((acc, s) => acc + (Number(s.currentOccupancy) || 0), 0),
    [shelters]
  );
  const remainingHeadroom = Math.max(0, totalBeds - totalOccupants);
  const occupancyPct = totalBeds > 0 ? Math.round((totalOccupants / totalBeds) * 100) : 0;

  // Currently focused facility
  const activeShelter = shelters.find((s) => s.id === selectedFacilityId) || shelters[0];

  return (
    <div className="animate-fade-in space-y-4 pb-32 sm:pb-20 min-w-0 max-w-full overflow-x-hidden">
      {/* ── 1. Executive Field Command Header ── */}
      <div className="rounded-2xl bg-white text-[#1C1917] p-4 sm:p-5 shadow-xs border border-[#CEE4D8] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#16A34A]/10 text-[#15803D] border border-[#16A34A]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" />
                Station Online • Headcount Synced
              </span>
              <span className="text-[10px] text-[#78716C] font-mono hidden sm:inline">
                Verified Coordinator Portal
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-[#1C1917] tracking-tight">
              Camp Coordinator Command
            </h1>
            <p className="text-xs text-[#78716C] max-w-xl">
              On-ground facility management, rapid evacuee check-in headcount, and essential supply replenishment.
            </p>
          </div>

          {/* Action Ribbon */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-profile-settings"));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-stone-50 text-stone-800 border border-[#CEE4D8] transition-colors cursor-pointer shadow-xs"
              title="Update coordinator name, call sign, profile photo & credentials"
            >
              <svg className="w-3.5 h-3.5 text-[#15803D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Profile Settings</span>
            </button>

            {!matchAlert && (
              <button
                type="button"
                onClick={handleSimulateMatch}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] border border-[#CEE4D8] transition-colors cursor-pointer shadow-2xs"
                title="Test cross-shelter family reunification detection"
              >
                <svg className="w-3.5 h-3.5 text-[#15803D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>Test Family Match</span>
              </button>
            )}

            <Link
              href="/register-shelter"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-display bg-[#FF5A1F] hover:bg-[#E04B14] text-white transition-all shadow-xs cursor-pointer no-underline"
            >
              <span>+ Register New Facility</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Field KPI Metrics Grid (Cool Light Green Enhanced) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="card-base p-4 space-y-2 border border-[#DCE8E2] hover:border-[#B8D7C8] hover:-translate-y-0.5 transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#6E7973]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Facilities Managed</span>
            <span className="w-8 h-8 rounded-xl bg-[#FFF2EA] border border-[#FF5A1F]/25 flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#1C1917]">{shelters.length}</div>
          <div className="text-[11px] font-mono text-[#16A34A]">All stations active</div>
        </div>

        <div className="card-base p-4 space-y-2 border border-[#DCE8E2] hover:border-[#B8D7C8] hover:-translate-y-0.5 transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#6E7973]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Hosted Evacuees</span>
            <span className="w-8 h-8 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#C7420F]">{totalOccupants}</div>
          <div className="text-[11px] font-mono text-[#6E7973]">Checked in right now</div>
        </div>

        <div className="card-base p-4 space-y-2 border border-[#DCE8E2] hover:border-[#B8D7C8] hover:-translate-y-0.5 transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#6E7973]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Remaining Bed Headroom</span>
            <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#16A34A]">{remainingHeadroom}</div>
          <div className="text-[11px] font-mono text-[#6E7973]">of {totalBeds} total beds</div>
        </div>

        <div className="card-base p-4 space-y-2 border border-[#DCE8E2] hover:border-[#B8D7C8] hover:-translate-y-0.5 transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#6E7973]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Station Capacity Rate</span>
            <span className="w-8 h-8 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${occupancyPct >= 90 ? "text-[#DC2626]" : occupancyPct >= 70 ? "text-[#D97706]" : "text-[#16A34A]"}`}>
            {occupancyPct}%
          </div>
          <div className="w-full bg-[#DCE8E2] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                occupancyPct >= 90 ? "bg-[#DC2626]" : occupancyPct >= 70 ? "bg-[#D97706]" : "bg-[#16A34A]"
              }`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 3. Station Navigator Bar (Sticky & Mobile Optimized) ── */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-[#DCE8E2] shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          {
            id: "all",
            label: "All Stations",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            ),
          },
          {
            id: "reunification",
            label: "Family AI Match",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            ),
            badge: "Mila/Nahi",
          },
          {
            id: "logistics",
            label: "Camp Logistics",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            ),
            badge: "6 Items",
          },
          {
            id: "headcount",
            label: "Headcount & Intake",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            ),
          },
          {
            id: "broadcast",
            label: "Field Horn & Comm",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            ),
          },
          {
            id: "hazards",
            label: "Road Hazards",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
            count: hazards.length,
          },
        ].map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`
                px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer shrink-0
                ${isActive
                  ? "bg-[#FF5A1F] text-white shadow-xs font-bold"
                  : "bg-white text-[#57534E] hover:bg-[#F0F7F4] hover:text-[#1C1917] border border-[#DCE8E2]/60"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold ${isActive ? "bg-white/25 text-white" : "bg-[#E0F2FE] text-[#0284C7]"}`}>
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold ${isActive ? "bg-white/25 text-white" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. Family Reunification Alert Banner (When active) ── */}
      {matchAlert && (
        <ReunificationAlert
          match={matchAlert}
          onDismiss={handleDismissMatch}
          onConfirm={handleConfirmReunion}
        />
      )}

      {/* ── 5. Operational Cockpit & Station Views ── */}
      {loading ? (
        <CardListSkeleton count={2} />
      ) : (
        <div className="space-y-4">
          {/* Registered Facilities Searchable Dropdown */}
          {shelters.length > 0 && (
            <FacilitySearchDropdown
              shelters={shelters}
              selectedFacilityId={selectedFacilityId}
              onSelectFacility={setSelectedFacilityId}
            />
          )}

          {/* VIEW: Camp Logistics & Supplies (Dedicated or in All) */}
          {(activeSection === "logistics" || activeSection === "all") && activeShelter && (
            <div className={activeSection === "logistics" ? "space-y-4" : "block lg:hidden space-y-4"}>
              <ShelterSupplyManager
                shelterId={activeShelter.id}
                toast={toast}
              />
            </div>
          )}

          {/* VIEW: Headcount & Intake (Dedicated) */}
          {activeSection === "headcount" && activeShelter && (
            <div className="space-y-4">
              <ShelterOccupancyEditor
                shelter={activeShelter}
                onUpdate={handleUpdate}
                toast={toast}
              />
            </div>
          )}

          {/* VIEW: Desktop Side-by-Side (When activeSection === "all" on lg screens) */}
          {activeSection === "all" && activeShelter && (
            <div className="hidden lg:grid grid-cols-2 gap-4 items-start min-w-0">
              {/* Left: Headcount & Check-In */}
              <div className="space-y-4 min-w-0">
                <ShelterOccupancyEditor
                  shelter={activeShelter}
                  onUpdate={handleUpdate}
                  toast={toast}
                />
              </div>

              {/* Right: Supplies & Logistics */}
              <div className="space-y-4 min-w-0">
                <ShelterSupplyManager
                  shelterId={activeShelter.id}
                  toast={toast}
                />
              </div>
            </div>
          )}

          {/* VIEW: Headcount on Mobile when in "all" */}
          {activeSection === "all" && activeShelter && (
            <div className="block lg:hidden space-y-4">
              <ShelterOccupancyEditor
                shelter={activeShelter}
                onUpdate={handleUpdate}
                toast={toast}
              />
            </div>
          )}

          {/* VIEW: Field Siren & Acoustic Broadcast */}
          {(activeSection === "broadcast" || activeSection === "all") && (
            <FieldCommunicationCard activeShelter={activeShelter} toast={toast} />
          )}

          {/* VIEW: Family Reunification & Visual Match Center (Mila ya Nahi) */}
          {(activeSection === "reunification" || activeSection === "all") && (
            <FamilyVisualMatchManager
              toast={toast}
              userRole="coordinator"
              userName={user?.displayName || "Camp Coordinator"}
              shelterId={activeShelter?.id}
              shelterName={activeShelter?.name}
            />
          )}

          {/* VIEW: Sector Road Hazards */}
          {(activeSection === "hazards" || activeSection === "all") && (
            <div className="card-base p-4 sm:p-5">
              <NearbyHazardsList
                hazards={hazards}
                onVerify={handleVerifyHazard}
                onResolve={handleResolveHazard}
                showSolved={true}
                isAdmin={false}
                title="Sector Road Blockages & Flood Inundation Hazards"
              />
            </div>
          )}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
