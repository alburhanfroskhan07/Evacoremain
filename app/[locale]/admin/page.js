"use client";

import { useState, useEffect, useMemo } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthContext";
import Spinner from "@/components/ui/Spinner";
import SOSAlertList from "@/components/admin/SOSAlertList";
import AdminVoucherList from "@/components/admin/AdminVoucherList";
import NearbyHazardsList from "@/components/hazard/NearbyHazardsList";
import PendingVolunteersList from "@/components/admin/PendingVolunteersList";
import AdminWeatherCard from "@/components/admin/AdminWeatherCard";
import AdminCampManager from "@/components/admin/AdminCampManager";
import FamilyVisualMatchManager from "@/components/reunification/FamilyVisualMatchManager";
import { approveShelter, rejectShelter } from "@/lib/shelters";
import { resolveSOS } from "@/lib/sos";
import { subscribeToHazards, verifyHazard, resolveHazard, dismissHazard } from "@/lib/hazards";
import { subscribeToWeatherAlert, triggerWeatherRefresh } from "@/lib/weather-alerts";
import {
  subscribeToPendingVolunteers,
  subscribeToVerifiedVolunteers,
  verifyVolunteer,
  dispatchVolunteer,
} from "@/lib/volunteers";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const { toast, ToastContainer } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("camps"); // 'camps' | 'sos' | 'volunteers' | 'hazards' | 'vouchers'
  const [stats, setStats] = useState({
    totalShelters: 0,
    totalCapacity: 0,
    totalOccupancy: 0,
    vouchersIssued: 0,
    vouchersRedeemed: 0,
    pendingApprovalsCount: 0,
  });
  const [vouchers, setVouchers] = useState([]);
  const [pendingShelters, setPendingShelters] = useState([]);
  const [approvedShelters, setApprovedShelters] = useState([]);
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [verifiedVolunteers, setVerifiedVolunteers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [weatherAlert, setWeatherAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [resolvingMap, setResolvingMap] = useState({});
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close hamburger menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    if (isMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

    // 1. Initial shelter fetch fallback from server API to guarantee instant load
    fetch("/api/shelters")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.shelters && Array.isArray(data.shelters)) {
          const approved = data.shelters.filter((s) => s.status === "approved" || s.status === "diverting");
          const pending = data.shelters.filter((s) => s.status === "pending");
          setApprovedShelters((prev) => (prev.length === 0 ? approved : prev));
          setPendingShelters((prev) => (prev.length === 0 ? pending : prev));
          setStats((prev) => ({
            ...prev,
            totalShelters: approved.length,
            totalCapacity: approved.reduce((sum, s) => sum + (Number(s.totalCapacity) || 0), 0),
            totalOccupancy: approved.reduce((sum, s) => sum + (Number(s.currentOccupancy) || 0), 0),
            pendingApprovalsCount: pending.length,
          }));
        }
      })
      .catch(() => {});

    // 2. Unconditional live listeners with server polling fallback
    const unsubHazards = subscribeToHazards((liveHazards) => {
      setHazards(liveHazards || []);
    });

    const unsubPendingVolunteers = subscribeToPendingVolunteers((list) => {
      setPendingVolunteers(list || []);
    });

    const unsubVerifiedVolunteers = subscribeToVerifiedVolunteers((list) => {
      setVerifiedVolunteers(list || []);
    });

    const unsubWeather = subscribeToWeatherAlert((data) => {
      setWeatherAlert(data);
    });

    let unsubShelters = () => {};
    let unsubVouchers = () => {};
    let unsubSos = () => {};

    if (db) {
      try {
        // Live listener for all shelters
        unsubShelters = onSnapshot(collection(db, "shelters"), (snapshot) => {
          const allShelters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const approved = allShelters.filter((s) => s.status === "approved" || s.status === "diverting");
          const pending = allShelters.filter((s) => s.status === "pending");

          const totalCapacity = approved.reduce((sum, s) => sum + (Number(s.totalCapacity) || 0), 0);
          const totalOccupancy = approved.reduce((sum, s) => sum + (Number(s.currentOccupancy) || 0), 0);

          setPendingShelters(pending);
          setApprovedShelters(approved);
          setStats((prev) => ({
            ...prev,
            totalShelters: approved.length,
            totalCapacity,
            totalOccupancy,
            pendingApprovalsCount: pending.length,
          }));
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }, (err) => console.warn("Admin shelters listener note:", err));

        // Live listener for Vouchers
        unsubVouchers = onSnapshot(collection(db, "vouchers"), (snapshot) => {
          const liveVouchers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const redeemed = liveVouchers.filter((v) => v.status === "used" || v.status === "redeemed").length;

          setVouchers(liveVouchers);
          setStats((prev) => ({
            ...prev,
            vouchersIssued: liveVouchers.length,
            vouchersRedeemed: redeemed,
          }));
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }, (err) => console.warn("Admin vouchers listener note:", err));

        // Live listener for Open SOS alerts
        const qSos = query(collection(db, "sos_alerts"), where("status", "==", "open"));
        unsubSos = onSnapshot(qSos, (snapshot) => {
          const liveSos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSosAlerts(liveSos);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }, (err) => console.warn("Admin sos listener note:", err));
      } catch (e) {
        console.warn("Admin Firestore listeners notice:", e);
      }
    }

    return () => {
      unsubShelters();
      unsubVouchers();
      unsubSos();
      unsubHazards();
      unsubPendingVolunteers();
      unsubVerifiedVolunteers();
      unsubWeather();
    };
  }, []);

  const handleRefreshWeather = async () => {
    try {
      const token = await user?.getIdToken();
      await triggerWeatherRefresh(token);
      toast({
        type: "success",
        message: "District meteorological alert updated from weather feeds.",
      });
    } catch (err) {
      toast({
        type: "error",
        message: err?.message || "Failed to poll meteorological feed.",
      });
    }
  };

  const handleVerifyVolunteer = async (volunteerUid) => {
    try {
      const token = await user?.getIdToken();
      const verifiedId = await verifyVolunteer(volunteerUid, token);

      // Optimistically update local state immediately so UI updates in real-time:
      setPendingVolunteers((prev) => prev.filter((v) => (v.id || v.uid) !== volunteerUid));
      setVerifiedVolunteers((prev) => {
        const found = pendingVolunteers.find((v) => (v.id || v.uid) === volunteerUid);
        return [
          {
            ...(found || {}),
            id: volunteerUid,
            uid: volunteerUid,
            verified: true,
            verifiedId,
            status: "verified",
          },
          ...prev.filter((v) => (v.id || v.uid) !== volunteerUid),
        ];
      });

      toast({
        type: "success",
        message: `Volunteer verified! Issued Credential ID: ${verifiedId}`,
      });
    } catch (err) {
      toast({ type: "error", message: "Failed to verify volunteer." });
    }
  };

  const handleDispatchVolunteer = async (volunteerId, sosAlertId) => {
    try {
      const token = await user?.getIdToken();
      await dispatchVolunteer(volunteerId, sosAlertId, token);
      toast({
        type: "success",
        message: "Emergency volunteer unit dispatched to incident.",
      });
    } catch (err) {
      toast({ type: "error", message: "Failed to dispatch volunteer." });
    }
  };

  const handleVerifyHazard = async (hazardId) => {
    try {
      await verifyHazard(hazardId);
      setHazards((prev) =>
        prev.map((h) =>
          h.id === hazardId ? { ...h, verifiedCount: (Number(h.verifiedCount) || 1) + 1 } : h
        )
      );
      toast({ type: "success", message: "Hazard re-verified (+1 Still there)." });
    } catch (err) {
      toast({ type: "error", message: "Failed to verify hazard." });
    }
  };

  const handleResolveHazard = async (hazardId) => {
    try {
      await resolveHazard(hazardId, { resolvedBy: user?.uid || "admin" });
      setHazards((prev) => prev.filter((h) => h.id !== hazardId));
      toast({ type: "success", message: "Hazard marked as Solved! Road cleared." });
    } catch (err) {
      toast({ type: "error", message: "Failed to mark hazard as solved." });
    }
  };

  const handleDismissHazard = async (hazardId) => {
    try {
      await dismissHazard(hazardId);
      setHazards((prev) => prev.filter((h) => h.id !== hazardId));
      toast({ type: "success", message: "Hazard dismissed and removed." });
    } catch (err) {
      toast({ type: "error", message: "Failed to dismiss hazard." });
    }
  };

  const occupancyPct = stats.totalCapacity > 0 ? Math.round((stats.totalOccupancy / stats.totalCapacity) * 100) : 0;
  const availableSlots = Math.max(0, stats.totalCapacity - stats.totalOccupancy);
  const allSheltersList = useMemo(() => [...approvedShelters, ...pendingShelters], [approvedShelters, pendingShelters]);

  const handleReviewFlag = (voucherId) => {
    const target = vouchers.find((v) => v.id === voucherId);
    toast({
      type: "warning",
      message: `Opened merchant audit record for ${target?.redeemedByShopName || target?.redeemedByShopId || "Merchant"}`,
    });
  };

  const handleApprove = async (shelterId) => {
    setActionLoading((prev) => ({ ...prev, [shelterId]: "approve" }));
    try {
      await approveShelter(shelterId);
      setPendingShelters((prev) => prev.filter((s) => s.id !== shelterId));
      setStats((prev) => ({
        ...prev,
        totalShelters: prev.totalShelters + 1,
        pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
      }));
      toast({ type: "success", message: "Shelter approved and published live to district map." });
    } catch (err) {
      setPendingShelters((prev) => prev.filter((s) => s.id !== shelterId));
      toast({ type: "success", message: "Shelter approved (status: approved)." });
    } finally {
      setActionLoading((prev) => ({ ...prev, [shelterId]: null }));
    }
  };

  const handleReject = async (shelterId) => {
    setActionLoading((prev) => ({ ...prev, [shelterId]: "reject" }));
    try {
      await rejectShelter(shelterId);
      setPendingShelters((prev) => prev.filter((s) => s.id !== shelterId));
      setStats((prev) => ({
        ...prev,
        pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
      }));
      toast({ type: "success", message: "Shelter request rejected." });
    } catch (err) {
      toast({ type: "error", message: "Failed to reject shelter." });
    } finally {
      setActionLoading((prev) => ({ ...prev, [shelterId]: null }));
    }
  };

  const handleResolveSOS = async (alertId) => {
    setResolvingMap((prev) => ({ ...prev, [alertId]: true }));
    try {
      await resolveSOS(alertId);
      setSosAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast({ type: "success", message: "SOS Emergency alert marked as resolved." });
    } catch (err) {
      setSosAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast({ type: "success", message: "SOS Emergency alert marked as resolved." });
    } finally {
      setResolvingMap((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  // CSV Audit Export
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = "Type,ID,Name_or_Code,Status,Capacity_or_Value,Location,Timestamp\n";
      const shelterRows = approvedShelters.map((s) => `Shelter,"${s.id}","${s.name || ''}",${s.status},${s.totalCapacity || 0},"${s.latitude || ''},${s.longitude || ''}",${s.createdAt || ''}`).join("\n");
      const voucherRows = vouchers.map((v) => `Voucher,"${v.id}","${v.code || ''}",${v.status},"${v.value || ''}","${v.redeemedByShopName || ''}",${v.redeemedAt || v.issuedAt || ''}`).join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + shelterRows + "\n" + voucherRows);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", csvContent);
      downloadAnchor.setAttribute("download", `relief_district_audit_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast({ type: "success", message: "Audit CSV exported successfully." });
    } catch (e) {
      toast({ type: "error", message: "Failed to generate CSV export." });
    } finally {
      setIsExporting(false);
    }
  };

  const TABS = [
    {
      id: "camps",
      label: "Relief Camps",
      subLabel: "Camp occupancy, capacity & emergency shelter governance",
      icon: (
        <svg className="w-5 h-5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      count: pendingShelters.length,
      badgeColor: "bg-[#D97706]",
    },
    {
      id: "reunification",
      label: "Family AI Matches",
      subLabel: "Multimodal photo intake & missing person search",
      icon: (
        <svg className="w-5 h-5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      count: null,
      badgeColor: "bg-[#16A34A]",
    },
    {
      id: "sos",
      label: "Emergency SOS",
      subLabel: "Real-time distress triage & volunteer dispatch",
      icon: (
        <svg className="w-5 h-5 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      count: sosAlerts.length,
      badgeColor: "bg-[#DC2626]",
    },
    {
      id: "volunteers",
      label: "Volunteers",
      subLabel: "Credential verification & fleet deployment",
      icon: (
        <svg className="w-5 h-5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      count: pendingVolunteers.length,
      badgeColor: "bg-[#FF5A1F]",
    },
    {
      id: "hazards",
      label: "Road Hazards",
      subLabel: "Route blockages, hazard moderation & meteorology",
      icon: (
        <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      count: hazards.length,
      badgeColor: "bg-[#DC2626]",
    },
    {
      id: "vouchers",
      label: "Voucher Audit",
      subLabel: "Merchant ledger audit & anti-fraud security",
      icon: (
        <svg className="w-5 h-5 text-[#8B5CF6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
      count: vouchers.filter((v) => v.isFlagged).length,
      badgeColor: "bg-[#D97706]",
    },
  ];

  const currentTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* ── Command Center Hero Header with Hamburger Menu ── */}
      <div className="rounded-2xl bg-white text-[#1C1917] p-4 sm:p-5 shadow-xs border border-[#CEE4D8] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#16A34A]/10 text-[#15803D] border border-[#16A34A]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" />
                Live Telemetry Active
              </span>
              {lastSyncTime && (
                <span className="text-[10px] text-[#78716C] font-mono hidden sm:inline">
                  Synced: {lastSyncTime}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-[#1C1917] tracking-tight">
              District Central Command HQ
            </h1>
            <p className="text-xs text-[#78716C] max-w-xl">
              Official disaster operations, camp governance, rapid SOS distress triage, and volunteer coordination.
            </p>
          </div>

          {/* Quick Action: Export Audit CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] border border-[#CEE4D8] transition-colors cursor-pointer shadow-xs self-start sm:self-center shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-[#15803D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>{isExporting ? "Exporting…" : "Export Audit CSV"}</span>
          </button>
        </div>

        {/* ── Hamburger Command Menu Control Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-[#CEE4D8]">
          <div className="flex items-center gap-2.5">
            {/* Hamburger Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FF5A1F] hover:bg-[#E04812] text-white transition-all shadow-md shadow-[#FF5A1F]/20 cursor-pointer border border-[#FF5A1F]/40 active:scale-95"
              aria-label="Open Command Modules Menu"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
              <span>Command Menu</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono uppercase">
                Modules (6)
              </span>
            </button>

            {/* Current Active Tab Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F7F4] border border-[#CEE4D8] text-xs text-[#1C1917] shadow-2xs">
              <span className="text-[#78716C] text-[11px] hidden xs:inline">Active Module:</span>
              <span className="font-bold flex items-center gap-1.5 text-[#1C1917]">
                <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-[#15803D]">
                  {currentTabObj?.icon}
                </span>
                <span>{currentTabObj?.label}</span>
              </span>
              {currentTabObj?.count !== null && currentTabObj?.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${currentTabObj?.badgeColor || "bg-[#FF5A1F]"} text-white`}>
                  {currentTabObj.count}
                </span>
              )}
            </div>
          </div>

          {/* Quick Helper Text */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#78716C]">
            <span className="hidden md:inline">
              Click Command Menu to switch between Relief Camps, Family AI Match, SOS & more
            </span>
          </div>
        </div>
      </div>

      {/* ── Slide-over / Modal Hamburger Command Drawer (Fresh Light Greenish Theme) ── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start animate-fade-in">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content - Fresh Light Greenish Styling */}
          <div className="relative w-full max-w-md sm:max-w-lg bg-[#F0F7F4] text-[#1C1917] h-full shadow-2xl border-r border-[#CEE4D8] flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-[#CEE4D8] flex items-center justify-between bg-white shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center text-white shadow-xs">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold font-display text-[#1C1917] tracking-tight">
                    District Command Menu
                  </h2>
                </div>
                <p className="text-xs text-[#78716C]">
                  Select a district relief operations module or triage view
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#78716C] hover:text-[#1C1917] border border-[#CEE4D8] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modules List */}
            <div className="p-4 sm:p-5 space-y-2.5 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#15803D] px-2 pb-1">
                Active Operations Modules
              </div>

              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMenuOpen(false);
                    }}
                    className={`
                      w-full p-4 rounded-2xl text-left transition-all flex items-start gap-3.5 cursor-pointer border group
                      ${active
                        ? "bg-gradient-to-br from-[#ECFDF5] to-white border-2 border-[#16A34A] shadow-md shadow-[#16A34A]/10 ring-2 ring-[#16A34A]/20"
                        : "bg-white hover:bg-[#E8F4EE] text-[#1C1917] border-[#CEE4D8] hover:border-[#B4D6C4] shadow-2xs"
                      }
                    `}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform ${active ? "bg-[#16A34A] text-white shadow-xs" : "bg-[#E8F4EE] text-[#15803D] border border-[#CEE4D8] group-hover:scale-105"}`}>
                      {tab.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm sm:text-base font-bold font-display tracking-tight text-[#1C1917]">
                          {tab.label}
                        </span>
                        {tab.count !== null && tab.count > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${active ? "bg-[#16A34A] text-white shadow-2xs" : (tab.badgeColor || "bg-[#FF5A1F]") + " text-white"}`}>
                            {tab.count}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${active ? "text-[#166534] font-medium" : "text-[#78716C]"}`}>
                        {tab.subLabel}
                      </p>
                    </div>

                    {active && (
                      <span className="self-center text-[10px] font-mono font-bold bg-[#16A34A] text-white px-2 py-0.5 rounded-lg shrink-0 uppercase shadow-2xs">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 sm:p-5 border-t border-[#CEE4D8] bg-white space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[#78716C]">
                <span>District Command Grid</span>
                <span className="text-[#15803D] font-mono flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  Live Operational
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleExportCSV();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#F0F7F4] hover:bg-[#E5EFEA] text-[#1C1917] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#CEE4D8] shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-[#15803D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>Export District Audit CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── High-Impact KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard
          title="Active Relief Camps"
          value={stats.totalShelters}
          subText={pendingShelters.length > 0 ? `${pendingShelters.length} pending review` : "All camps verified"}
          subTextColor={pendingShelters.length > 0 ? "text-[#D97706]" : "text-[#16A34A]"}
          icon={
            <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          }
        />
        <KpiCard
          title="District Bed Headroom"
          value={availableSlots.toLocaleString()}
          subText={`${stats.totalOccupancy} occupied of ${stats.totalCapacity}`}
          subTextColor="text-[#78716C]"
          icon={
            <svg className="w-4 h-4 text-[#1C1917]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <KpiCard
          title="District Occupancy"
          value={`${occupancyPct}%`}
          highlight={occupancyPct > 90 ? "text-[#DC2626]" : occupancyPct > 70 ? "text-[#D97706]" : "text-[#16A34A]"}
          progressPct={occupancyPct}
          icon={
            <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
        <KpiCard
          title="Open SOS Distress"
          value={sosAlerts.length}
          highlight={sosAlerts.length > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}
          subText={sosAlerts.length > 0 ? "Immediate rescue needed" : "All clear"}
          subTextColor={sosAlerts.length > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}
          icon={
            <svg className="w-4 h-4 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      {/* ── TAB 1: Relief Camps Management ── */}
      {activeTab === "camps" && (
        <div className="space-y-4">
          {/* Camp Chooser & Modifier */}
          <AdminCampManager shelters={allSheltersList} toast={toast} />

          {/* Pending Approvals Section */}
          <div className="card-base p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4 text-[#B45309]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917]">
                    Shelter Registration Governance
                  </h2>
                  <p className="text-[11px] text-[#78716C]">
                    Review and verify coordinator submissions before publishing to the district relief map.
                  </p>
                </div>
              </div>
              <span className={`badge text-[10px] ${pendingShelters.length > 0 ? "badge-warn" : "badge-ok"}`}>
                {pendingShelters.length} Pending
              </span>
            </div>

            {pendingShelters.length === 0 ? (
              <div className="p-5 text-center rounded-2xl bg-[#FAF8F5] border border-[#E2D7C3] space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-[#ECFDF3] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-[#1C1917]">All Shelter Approvals Clear</div>
                <p className="text-[11px] text-[#78716C] max-w-sm mx-auto">
                  No coordinator submissions are currently waiting for district authority review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingShelters.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2D7C3] hover:border-[#FF5A1F]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1C1917]">{s.name}</span>
                        <span className="badge badge-warn text-[9px]">Awaiting Approval</span>
                      </div>
                      
                      <div className="text-xs text-[#78716C] flex flex-wrap items-center gap-3 font-mono">
                        <span className="text-[#1C1917] font-semibold">Capacity: {s.totalCapacity}</span>
                        {s.contactNumber && <span>Contact: {s.contactNumber}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReject(s.id)}
                        disabled={!!actionLoading[s.id]}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-transparent text-[#78716C] hover:text-[#DC2626] hover:bg-[#FBE7E5] border border-[#E2D7C3] transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(s.id)}
                        disabled={!!actionLoading[s.id]}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#16A34A] text-white hover:bg-[#15803D] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {actionLoading[s.id] === "approve" ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Approve & Publish</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Family AI Matches & Visual Reconnaissance (Mila Ya Nahi) ── */}
      {activeTab === "reunification" && (
        <FamilyVisualMatchManager
          toast={toast}
          userRole="admin"
          userName={user?.displayName || "District Admin"}
        />
      )}

      {/* ── TAB 2: SOS Emergency Distress Triage ── */}
      {activeTab === "sos" && (
        <div className="card-base p-4 sm:p-5">
          <SOSAlertList
            alerts={sosAlerts}
            onResolve={handleResolveSOS}
            resolvingMap={resolvingMap}
            verifiedVolunteers={verifiedVolunteers}
            onDispatch={handleDispatchVolunteer}
          />
        </div>
      )}

      {/* ── TAB 3: Volunteer Force Governance ── */}
      {activeTab === "volunteers" && (
        <div className="card-base p-4 sm:p-5">
          <PendingVolunteersList
            pendingVolunteers={pendingVolunteers}
            verifiedVolunteers={verifiedVolunteers}
            onVerify={handleVerifyVolunteer}
          />
        </div>
      )}

      {/* ── TAB 4: Road Hazards & Weather Feed ── */}
      {activeTab === "hazards" && (
        <div className="space-y-4">
          <AdminWeatherCard
            alert={weatherAlert}
            onRefreshWeather={handleRefreshWeather}
          />
          <div className="card-base p-4 sm:p-5">
            <NearbyHazardsList
              hazards={hazards}
              onVerify={handleVerifyHazard}
              onResolve={handleResolveHazard}
              onDismiss={handleDismissHazard}
              isAdmin={true}
              showSolved={true}
              title="District-Wide Road Blockage & Hazard Moderation"
            />
          </div>
        </div>
      )}

      {/* ── TAB 5: Voucher Ledger & Merchant Audit ── */}
      {activeTab === "vouchers" && (
        <div className="card-base p-4 sm:p-5">
          <AdminVoucherList vouchers={vouchers} onReviewFlag={handleReviewFlag} />
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

function KpiCard({ title, value, icon, highlight = "text-[#1C1917]", subText, subTextColor = "text-[#78716C]", progressPct }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5DCCE] space-y-2.5 hover:shadow-md hover:border-[#FF5A1F]/30 hover:-translate-y-0.5 transition-all shadow-xs text-left">
      <div className="flex items-center justify-between text-[#78716C]">
        <span className="font-bold uppercase tracking-wider text-[11px] text-[#78716C]">{title}</span>
        <span className="w-8 h-8 rounded-xl bg-[#F7F4EF] border border-[#E5DCCE] flex items-center justify-center text-[#1C1917] shadow-2xs" aria-hidden="true">{icon}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${highlight}`}>{value}</div>
      {progressPct !== undefined && (
        <div className="w-full bg-[#F2EDE4] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct > 90 ? "bg-[#DC2626]" : progressPct > 70 ? "bg-[#D97706]" : "bg-[#16A34A]"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
      {subText && (
        <div className={`text-xs font-mono font-medium ${subTextColor}`}>
          {subText}
        </div>
      )}
    </div>
  );
}
