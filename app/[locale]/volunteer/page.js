"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeToVolunteer, RESOURCE_TYPES } from "@/lib/volunteers";
import VolunteerIdCard from "@/components/volunteer/VolunteerIdCard";
import VolunteerEvacueeTracker from "@/components/volunteer/VolunteerEvacueeTracker";
import FamilyVisualMatchManager from "@/components/reunification/FamilyVisualMatchManager";
import Spinner from "@/components/ui/Spinner";

function VolunteerDashboardContent() {
  const { user } = useAuth();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tracker"); // 'tracker' | 'reunification' | 'id_card'
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToVolunteer(user.uid, (data) => {
      setVolunteer(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Spinner size="md" />
        <span className="text-xs text-[#7A7268] font-mono">Loading volunteer profile…</span>
      </div>
    );
  }

  const resourceMeta = RESOURCE_TYPES.find((r) => r.value === volunteer?.resourceType) || {
    label: volunteer?.resourceType || "Rescue Support",
    sub: "Community Field Logistics",
  };

  const isVerified = Boolean(volunteer?.verified);

  return (
    <div className="space-y-4 animate-fade-in w-full max-w-2xl mx-auto py-2 min-w-0 overflow-x-hidden">
      {/* Toast alert */}
      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : toast.type === "info"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Responsive Header & Single-Line Portal Bar ── */}
      <div className="space-y-2.5 border-b border-[#CEE4D8] pb-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Volunteer Portal Box - Clean moderate rounded-lg, NOT an oval pill */}
            <span className="px-2.5 py-1 rounded-lg border border-[#FF5A1F]/30 bg-[#FFE9DC] text-[#C7420F] text-xs font-bold font-mono tracking-tight shrink-0 whitespace-nowrap shadow-2xs">
              Volunteer Portal
            </span>
            <h1 className="text-base sm:text-lg font-bold font-display text-[#1C1917] truncate whitespace-nowrap">
              Rescue Fleet Dashboard
            </h1>
          </div>
          {user?.email && (
            <span className="text-[10px] font-mono text-[#78716C] truncate hidden sm:inline shrink-0">
              {user.email}
            </span>
          )}
        </div>

        {/* Tab Navigation - Full-width 3-column grid, 100% contained within mobile frame */}
        <div className="w-full grid grid-cols-3 rounded-xl bg-white p-1 border border-[#CEE4D8] text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("tracker")}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center truncate ${
              activeTab === "tracker"
                ? "bg-[#16A34A] text-white shadow-xs font-extrabold"
                : "text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            Live Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reunification")}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center truncate flex items-center justify-center gap-1.5 ${
              activeTab === "reunification"
                ? "bg-[#16A34A] text-white shadow-xs font-extrabold"
                : "text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span className="truncate">Intake & AI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("id_card")}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center truncate ${
              activeTab === "id_card"
                ? "bg-[#16A34A] text-white shadow-xs font-extrabold"
                : "text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            ID Badge
          </button>
        </div>
      </div>

      {/* Dispatched Incident Notification (if active) */}
      {volunteer?.status === "dispatched" && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#EF4444] text-[#991B1B] space-y-2 animate-bounce-subtle shadow-md">
          <div className="flex items-center gap-2 font-bold text-sm">
            <svg className="w-5 h-5 text-[#DC2626] animate-pulse shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>EMERGENCY DISPATCH ORDER ACTIVE</span>
          </div>
          <p className="text-xs text-[#7F1D1D] leading-relaxed">
            You have been dispatched by District Administration to an active SOS triage incident. Use the Live Radar below to navigate to the evacuee&apos;s exact GPS location.
          </p>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "tracker" ? (
        <VolunteerEvacueeTracker volunteer={volunteer} />
      ) : activeTab === "reunification" ? (
        <FamilyVisualMatchManager
          userRole="volunteer"
          userName={volunteer?.name || "Field Volunteer"}
          toast={(t) => {
            setToast(t);
            setTimeout(() => setToast(null), 4000);
          }}
        />
      ) : (
        /* ID Badge Tab */
        !isVerified ? (
          <div className="card-base p-5 space-y-4 text-left border-[#F59E0B]/40 bg-[#FFFDF7]">
            {/* Pending Verification Badge */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold shrink-0 border border-[#FDE68A]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="badge badge-warn text-[9px] font-bold">
                    Verification Pending
                  </span>
                  <span className="text-[10px] font-mono text-[#7A7268]">
                    Queue Review
                  </span>
                </div>
                <h2 className="text-sm font-bold font-display text-[#1C1917]">
                  Awaiting Admin Verification
                </h2>
                <p className="text-xs text-[#92400E] leading-relaxed">
                  A district admin will verify your details before issuing your official physical credential badge.
                </p>
              </div>
            </div>

            {/* Submitted Information Preview */}
            <div className="p-3 rounded-xl bg-[#F0F7F4] border border-[#CEE4D8] space-y-2 text-xs">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[#78716C]">
                Submitted Registration Details
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Name:</span>
                <span className="font-semibold text-[#1C1917]">{volunteer?.name || "Field Volunteer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Phone:</span>
                <span className="font-mono text-[#1C1917]">{volunteer?.phone || "Not provided"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Resource:</span>
                <span className="font-semibold text-[#FF5A1F]">{resourceMeta.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Base Coordinates:</span>
                <span className="font-mono text-[11px] text-[#1C1917]">
                  {volunteer?.lat?.toFixed(4) || "22.5726"}, {volunteer?.lng?.toFixed(4) || "88.3639"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#CEE4D8] text-[11px] text-[#78716C]">
              Once verified by district control, your official <strong>Volunteer ID Badge</strong> will automatically appear here.
            </div>
          </div>
        ) : (
          <VolunteerIdCard volunteer={volunteer} />
        )
      )}
    </div>
  );
}

export default function VolunteerDashboardPage() {
  return (
    <RequireAuth allowedRoles={["volunteer", "admin"]}>
      <VolunteerDashboardContent />
    </RequireAuth>
  );
}
