"use client";

import { useState, useEffect } from "react";
import { fetchNearbyHospitals } from "@/lib/hospitals";
import AILoadingState from "@/components/ui/AILoadingState";
import ParticleButton from "@/components/ui/ParticleButton";

export default function EmergencyHospitalDrawer({ isOpen, onClose, userLocation, onPlotRoute }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const lat = userLocation?.lat || 22.5726;
  const lng = userLocation?.lng || 88.3639;

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchNearbyHospitals(lat, lng, 15)
      .then((data) => {
        setHospitals(data || []);
      })
      .catch((err) => {
        console.warn("Failed to load emergency hospitals:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl border border-[#E5DCCE] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E5DCCE] flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#BE123C] text-[10px] font-bold font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C] animate-pulse" />
                Live 24/7 ER Grid
              </span>
              <span className="text-[10px] font-mono text-[#78716C]">
                GPS: {lat.toFixed(4)}°, {lng.toFixed(4)}°
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#1C1917] mt-1">
              Nearest Emergency ER Trauma Centers
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Real-time distance calculation, direct ambulance lines, and passable route plotting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#E5DCCE] text-[#44403C] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body / Hospital List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <AILoadingState
                title="Scanning Emergency Trauma Facilities"
                subtitle="Querying regional medical nodes & passable access routes"
                minDuration={2200}
                className="w-full max-w-sm shadow-none border-stone-200"
              />
            </div>
          ) : hospitals.length === 0 ? (
            <div className="py-12 text-center text-[#78716C]">
              <p className="text-sm font-semibold">No emergency centers detected in immediate sector.</p>
              <p className="text-xs mt-1">Contact National Emergency Helplines: 112 / 108</p>
            </div>
          ) : (
            hospitals.map((hosp, idx) => (
              <div
                key={hosp.id || idx}
                className="p-3.5 rounded-2xl bg-white border border-[#E5DCCE] shadow-xs hover:border-[#E11D48]/40 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold font-mono text-[#E11D48]">
                        #{idx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-[#1C1917] font-display truncate">
                        {hosp.name}
                      </h3>
                    </div>
                    {hosp.specialty && (
                      <span className="text-[10.5px] font-semibold text-[#78716C] block mt-0.5">
                        {hosp.specialty}
                      </span>
                    )}
                    {hosp.address && (
                      <span className="text-[10px] text-[#A8A29E] block truncate mt-0.5">
                        {hosp.address}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block font-mono text-sm font-bold text-[#0284C7]">
                      {hosp.distanceKm} km
                    </span>
                    <span className="text-[10px] text-[#78716C] block">
                      ~{hosp.drivingMins || 5} min drive
                    </span>
                  </div>
                </div>

                {/* Actions: Direct Call + Plot Route */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#FAF8F5]">
                  {hosp.phone && (
                    <a
                      href={`tel:${hosp.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#E5DCCE] border border-[#E5DCCE] text-[#1C1917] text-xs font-bold font-display flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span>Call ER Desk</span>
                    </a>
                  )}

                  <ParticleButton
                    particleColor="bg-[#E11D48]"
                    onClick={() => {
                      onPlotRoute(hosp);
                      onClose();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold font-display shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer h-auto border-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.314c-.317-.159-.69-.159-1.006 0L3.622 5.75c-.381.19-.622.58-.622 1.006v11.832c0 .836.88 1.38 1.628 1.006l4.875-2.437" />
                    </svg>
                    <span>Plot Route on Map</span>
                  </ParticleButton>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / National SOS */}
        <div className="p-3 bg-[#FAF8F5] border-t border-[#E5DCCE] text-center text-[10.5px] text-[#78716C]">
          National Disaster Ambulance Line: <a href="tel:108" className="font-bold text-[#E11D48] font-mono hover:underline">108</a> | Emergency SOS: <a href="tel:112" className="font-bold text-[#FF5A1F] font-mono hover:underline">112</a>
        </div>
      </div>
    </div>
  );
}
