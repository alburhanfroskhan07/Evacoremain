"use client";

import { useState, useEffect, useRef } from "react";
import { getSavedFamilyPasses, deleteFamilyPass } from "@/lib/family-passes";
import { QRCodeSVG } from "qrcode.react";
import { generateEmergencyPassPDF, svgToPngDataUrl } from "@/lib/pdf-pass";
import Spinner from "@/components/ui/Spinner";

export default function FamilyPassVault({ onRefreshTrigger }) {
  const [passes, setPasses] = useState([]);
  const [selectedPass, setSelectedPass] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const modalQrRef = useRef(null);

  const loadPasses = () => {
    const data = getSavedFamilyPasses();
    setPasses(data);
  };

  useEffect(() => {
    loadPasses();
  }, [onRefreshTrigger]);

  if (passes.length === 0) return null;

  const totalMembers = passes.reduce((sum, p) => sum + (parseInt(p.familySize, 10) || 1), 0);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this pass from your phone vault?")) {
      const updated = deleteFamilyPass(id);
      setPasses(updated || []);
      if (selectedPass?.id === id) setSelectedPass(null);
    }
  };

  const handleDownloadSinglePDF = async (pass) => {
    if (pdfLoading || !pass) return;
    setPdfLoading(true);
    try {
      let qrPngUrl = null;
      const svgEl = modalQrRef.current?.querySelector("svg");
      if (svgEl) {
        qrPngUrl = await svgToPngDataUrl(svgEl);
      }

      await generateEmergencyPassPDF(pass, qrPngUrl);
    } catch (err) {
      console.warn("Single PDF pass generation note:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadAllPDF = async () => {
    if (pdfLoading || passes.length === 0) return;
    setPdfLoading(true);
    try {
      await generateEmergencyPassPDF(passes, null);
    } catch (err) {
      console.warn("Batch PDF passes generation note:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="card-base p-4.5 border-[#FF5A1F]/30 bg-gradient-to-br from-[#FFFDFB] via-[#FFF8F4] to-[#FFFFFF] space-y-3.5 shadow-sm animate-fade-in">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF2EA] text-[#FF5A1F] border border-[#FFD4C2] flex items-center justify-center font-bold shadow-xs">
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold font-display text-[#1C1917]">
              Registered On This Device
            </h2>
            <p className="text-[11px] text-[#78716C] font-mono">
              {passes.length} {passes.length === 1 ? "Registration" : "Registrations"} · <strong className="text-[#1C1917]">{totalMembers} Family Members</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadAllPDF}
            disabled={pdfLoading}
            className="text-[11px] font-semibold text-[#1C1917] bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102 active:scale-98"
            title="Download PDF Sheet for all family passes"
          >
            {pdfLoading ? (
              <Spinner size="sm" />
            ) : (
              <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span>PDF Pass</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[#FF5A1F] font-semibold hover:underline flex items-center gap-1 cursor-pointer p-1"
          >
            {isExpanded ? "Hide" : "View"}
            <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Passes List */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1">
          {passes.map((pass) => (
            <div
              key={pass.id}
              onClick={() => setSelectedPass(pass)}
              className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] hover:border-[#FF5A1F] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1C1917] font-display">{pass.name}</span>
                  <span className="badge badge-flare text-[9.5px]">
                    {pass.familySize} Members
                  </span>
                </div>
                <div className="text-[11px] text-[#78716C] flex items-center gap-1.5 font-mono">
                  <span>{pass.assignedShelterName || "Emergency Relief Ration Pass"}</span>
                  {pass.isOffline && (
                    <span className="text-[9px] text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full font-bold">
                      Offline Pass
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6933] to-[#FF5A1F] text-white text-[11px] font-bold shadow-xs hover:from-[#FF5A1F] hover:to-[#E84D14] transition-all shrink-0"
                >
                  Show QR
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(pass.id, e)}
                  title="Remove from this device"
                  className="p-1.5 rounded-xl hover:bg-[#FEF2F2] text-[#A8A29E] hover:text-[#DC2626] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Pass Inspection Modal */}
      {selectedPass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedPass(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 space-y-4 shadow-2xl animate-scale-in text-center border border-[#E5DCCE]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DCCE] pb-3">
              <span className="badge badge-flare text-[10px]">Official Digital Pass</span>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="w-7 h-7 rounded-full bg-[#FAF8F5] text-[#78716C] hover:text-[#1C1917] flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold font-display text-[#1C1917]">{selectedPass.name}</h3>
              <p className="text-xs text-[#78716C] mt-0.5">
                Family Size: <strong>{selectedPass.familySize} Members</strong> · {selectedPass.assignedShelterName || "Relief Goods Voucher"}
              </p>
            </div>

            {/* QR Code Container */}
            <div ref={modalQrRef} className="p-3.5 bg-white rounded-3xl border-2 border-[#E5DCCE] inline-block shadow-sm">
              <QRCodeSVG
                value={selectedPass.qrCode || selectedPass.voucherCode || selectedPass.id}
                size={180}
                level="H"
              />
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E5DCCE] text-xs font-mono text-[#1C1917] space-y-1">
              <div className="text-[10px] text-[#78716C] uppercase tracking-wider font-semibold">Pass Code</div>
              <div className="font-bold text-sm tracking-wider text-[#FF5A1F]">
                {selectedPass.qrCode || selectedPass.voucherCode || selectedPass.id}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadSinglePDF(selectedPass)}
                disabled={pdfLoading}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] text-xs font-bold font-display text-[#1C1917] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                {pdfLoading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Generating PDF…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Download Offline PDF Pass</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="btn-primary w-full text-xs font-semibold py-2.5 rounded-2xl"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
