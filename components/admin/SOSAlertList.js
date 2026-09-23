"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";
import StatusMark from "@/components/ui/StatusMark";
import { RESOURCE_TYPES, findNearbyVerifiedVolunteers } from "@/lib/volunteers";

function EmergencyHospitalCard({ alertLat, alertLng }) {
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof alertLat !== "number" || typeof alertLng !== "number") return;
    let isMounted = true;

    fetch("/api/hospitals/nearest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: alertLat,
        lng: alertLng,
        preferEmergency: true,
        radiusKm: 15,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setHospitalData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch emergency hospital for SOS alert:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [alertLat, alertLng]);

  if (loading) {
    return (
      <div className="p-3 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] flex items-center gap-2 text-xs text-[#BE123C] animate-pulse">
        <Spinner size="xs" />
        <span>Locating nearest emergency hospital (ER)…</span>
      </div>
    );
  }

  const hosp = hospitalData?.hospital;
  if (!hosp) return null;

  const distKm = hospitalData.distanceKm?.toFixed(1) || hosp.distanceKm?.toFixed(1);
  const durationMins = hospitalData.durationSeconds
    ? Math.round(hospitalData.durationSeconds / 60)
    : null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] border border-[#FECDD3] space-y-2 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#BE123C]">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
            </svg>
            <span>Nearest Emergency Hospital</span>
          </div>
          <h4 className="font-bold text-xs text-[#9F1239] truncate font-display mt-0.5">
            {hosp.name}
          </h4>
        </div>

        {hosp.emergency ? (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#E11D48] text-white text-[9px] font-bold font-mono uppercase shadow-xs">
            24/7 ER Ready
          </span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD] text-[9px] font-bold font-mono uppercase">
            General
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#FDA4AF]/50 text-xs">
        <div className="flex items-center gap-2 text-[#881337] font-mono text-[11px]">
          {distKm && <span>{distKm} km</span>}
          {durationMins && (
            <>
              <span>•</span>
              <span>~{durationMins} mins</span>
            </>
          )}
        </div>

        {hosp.phone && (
          <a
            href={`tel:${hosp.phone}`}
            className="px-2.5 py-1 rounded-xl bg-[#BE123C] text-white text-[10.5px] font-bold hover:bg-[#9F1239] transition-all no-underline flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <span>Call</span>
          </a>
        )}
      </div>
    </div>
  );
}

const URGENCY_ORDER = {
  high: 1,
  medium: 2,
  low: 3,
};

const URGENCY_STYLES = {
  high: {
    badge: "badge-crit",
    label: "HIGH URGENCY",
    border: "border-l-4 border-l-[#DC2626]",
  },
  medium: {
    badge: "badge-warn",
    label: "MEDIUM URGENCY",
    border: "border-l-4 border-l-[#D97706]",
  },
  low: {
    badge: "badge-ok",
    label: "LOW URGENCY",
    border: "border-l-4 border-l-[#16A34A]",
  },
};

const CATEGORY_MAP = {
  medical: { label: "Medical Care", bg: "bg-[#FBE7E5] text-[#DC2626]" },
  trapped: { label: "Water Trapped", bg: "bg-[#FDF1DE] text-[#D97706]" },
  "food-water": { label: "Food & Rations", bg: "bg-[#FFE9DC] text-[#C7420F]" },
  other: { label: "Emergency Other", bg: "bg-[#F0EBE2] text-[#7A7268]" },
};

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

/**
 * SOSAlertList Component - Step F15
 *
 * Emergency SOS triage queue with live nearby verified volunteer dispatching.
 */
export default function SOSAlertList({
  alerts = [],
  onResolve,
  resolvingMap = {},
  verifiedVolunteers = [],
  onDispatch,
}) {
  const [dispatchStatusMap, setDispatchStatusMap] = useState({});
  const [dispatchErrorMap, setDispatchErrorMap] = useState({});

  const openAlerts = alerts
    .filter((a) => a.status !== "resolved")
    .sort((a, b) => {
      const uA = URGENCY_ORDER[a.urgencyLevel] || 99;
      const uB = URGENCY_ORDER[b.urgencyLevel] || 99;
      return uA - uB;
    });

  const handleDispatch = async (volunteerId, alertId, verifiedId) => {
    const key = `${alertId}_${volunteerId}`;
    setDispatchStatusMap((prev) => ({ ...prev, [key]: "dispatching" }));
    setDispatchErrorMap((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    try {
      if (onDispatch) {
        await onDispatch(volunteerId, alertId);
      }
      setDispatchStatusMap((prev) => ({ ...prev, [key]: "dispatched" }));
    } catch (err) {
      console.error("Volunteer dispatch failure:", err);
      setDispatchStatusMap((prev) => ({ ...prev, [key]: "failed" }));
      setDispatchErrorMap((prev) => ({
        ...prev,
        [key]: err?.message || "Dispatch operation failed. Check connection.",
      }));
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold font-display text-[#1C1917]">
            Emergency SOS Triage Queue
          </h3>
        </div>
        <span className="badge badge-crit text-[10px]">
          {openAlerts.length} Open
        </span>
      </div>

      {openAlerts.length === 0 ? (
        <div className="p-5 text-center rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] text-[#78716C] text-xs font-mono">
          No open emergency alerts in queue.
        </div>
      ) : (
        <div className="space-y-3">
          {openAlerts.map((alert) => {
            const urgencyKey = alert.urgencyLevel || "medium";
            const urgencyConfig = URGENCY_STYLES[urgencyKey] || URGENCY_STYLES.medium;
            const categoryConfig = CATEGORY_MAP[alert.category] || CATEGORY_MAP.other;
            const isResolving = !!resolvingMap[alert.id];
            const timeFormatted = formatTimestamp(alert.raisedAt);

            const alertLat = typeof alert.lat === "number" ? alert.lat : parseFloat(alert.lat);
            const alertLng = typeof alert.lng === "number" ? alert.lng : parseFloat(alert.lng);
            const nearbyVolunteers = findNearbyVerifiedVolunteers(
              alertLat,
              alertLng,
              verifiedVolunteers,
              5
            );

            return (
              <div
                key={alert.id}
                className={`rounded-2xl bg-[#FFFFFF] border border-[#E5DCCE] p-4.5 shadow-xs space-y-3 text-left hover:border-[#D6C8B2] transition-colors ${urgencyConfig.border}`}
              >
                {/* Header & Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge text-[9.5px] ${urgencyConfig.badge}`}>
                        {urgencyConfig.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${categoryConfig.bg}`}>
                        {categoryConfig.label}
                      </span>
                      {timeFormatted && (
                        <span className="text-[10px] text-[#78716C] font-mono">
                          • {timeFormatted}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[#1C1917] leading-relaxed">
                      {alert.message || <span className="italic text-[#78716C]">GPS Panic Broadcast triggered without message.</span>}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab: "map" } }));
                          window.dispatchEvent(
                            new CustomEvent("open-map-modal", {
                              detail: { lat: alert.lat, lng: alert.lng, title: `SOS Alert: ${alert.category || "Emergency"}` },
                            })
                          );
                        }
                      }}
                      title="View emergency teardrop pinpoint on map"
                      className="inline-flex items-center gap-1.5 text-[11px] text-[#F4845F] hover:text-[#E76F51] font-mono font-bold hover:underline cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[#F4845F] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span>GPS: {alert.lat}, {alert.lng} (Pinpoint on Map)</span>
                    </button>
                  </div>

                  {/* Resolve Action */}
                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => onResolve && onResolve(alert.id)}
                      disabled={isResolving}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-2xl bg-[#ECFDF3] text-[#16A34A] hover:bg-[#16A34A] hover:text-white border border-[#BBF7D0] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      {isResolving ? (
                        <>
                          <Spinner size="sm" />
                          <span>Resolving…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span>Mark Resolved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Supplementary Emergency Hospital Info (For Medical Alerts) ── */}
                {(alert.category === "medical" ||
                  alert.tag === "Medical Emergency" ||
                  (alert.message && alert.message.toLowerCase().includes("medical"))) && (
                  <EmergencyHospitalCard alertLat={alertLat} alertLng={alertLng} />
                )}

                {/* ── Nearby Available Volunteers & Fleet Dispatch (Step F15) ── */}
                <div className="pt-3 border-t border-[#E5DCCE] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C1917] flex items-center gap-1.5 font-display">
                      <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      Nearby Available Volunteers ({nearbyVolunteers.length})
                    </span>
                    <span className="text-[10px] font-mono text-[#78716C]">Sorted by Proximity</span>
                  </div>

                  {nearbyVolunteers.length === 0 ? (
                    <p className="text-[11px] text-[#78716C] italic bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#E5DCCE]">
                      No verified volunteers available within operating radius.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {nearbyVolunteers.map((vol) => {
                        const vId = vol.id || vol.uid;
                        const key = `${alert.id}_${vId}`;
                        const status = dispatchStatusMap[key] || "idle";
                        const err = dispatchErrorMap[key];
                        const resMeta = RESOURCE_TYPES.find((r) => r.value === vol.resourceType) || {
                          label: vol.resourceType || "Support",
                        };

                        return (
                          <div
                            key={vId}
                            className="p-2.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-[#D6C8B2] transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1C1917]">{vol.name || "Volunteer"}</span>
                                <span className="badge bg-[#FFE9DC] text-[#C7420F] text-[9.5px] py-0.5">
                                  {resMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#78716C]">
                                <span className="font-mono">{vol.distanceKm?.toFixed(1)} km away</span>
                                <span>•</span>
                                <span className="font-mono text-[#1C1917] font-semibold">{vol.verifiedId || "VOL-VERIFIED"}</span>
                              </div>
                            </div>

                            {/* Dispatch State Button (Step F15) */}
                            <div className="shrink-0">
                              {status === "idle" && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatch(vId, alert.id, vol.verifiedId)}
                                  className="btn-primary text-[11px] py-1.5 px-3.5 rounded-xl w-full sm:w-auto cursor-pointer shadow-xs"
                                >
                                  Dispatch
                                </button>
                              )}

                              {status === "dispatching" && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFE9DC] text-[#C7420F] text-[11px] font-semibold border border-[#FF5A1F]/30">
                                  <StatusMark status="running" size={14} strokeWidth={2.5} color="#C7420F" />
                                  <span>Dispatching…</span>
                                </div>
                              )}

                              {status === "dispatched" && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E7F6EC] text-[#16A34A] text-[11px] font-bold border border-[#16A34A]/30">
                                  <StatusMark status="done" doneColor="#16A34A" size={16} strokeWidth={2.5} />
                                  <span>Dispatched - {vol.verifiedId || "VOL-AUTH"}</span>
                                </div>
                              )}

                              {status === "failed" && (
                                <div className="flex items-center gap-1.5 text-[10px] text-[#DC2626]">
                                  <StatusMark status="failed" errorColor="#DC2626" size={14} strokeWidth={2.5} />
                                  <span>{err || "Failed"}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDispatch(vId, alert.id, vol.verifiedId)}
                                    className="underline font-bold text-[#DC2626] hover:text-[#991B1B] cursor-pointer"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
