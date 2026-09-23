"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateEmergencyPassPDF, svgToPngDataUrl } from "@/lib/pdf-pass";
import Spinner from "@/components/ui/Spinner";
import TearTicket from "@/components/ui/TearTicket";

/**
 * VoucherDisplay Component with interactive TearTicket physics
 */
export default function VoucherDisplay({ code, expiresAt, evacueeName, shelterName }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  const qrWrapperRef = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (pdfGenerating || !code) return;
    setPdfGenerating(true);
    try {
      let qrPngUrl = null;
      const svgEl = qrWrapperRef.current?.querySelector("svg");
      if (svgEl) {
        qrPngUrl = await svgToPngDataUrl(svgEl);
      }

      await generateEmergencyPassPDF({
        voucherCode: code,
        qrCode: code,
        name: evacueeName || "Registered Evacuee",
        assignedShelterName: shelterName || "Designated Emergency Relief Point",
        familySize: 1,
      }, qrPngUrl);
    } catch (err) {
      console.warn("PDF generation warning:", err);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-fade-in">
      {/* Tear-Off Stub Interactive Relief Ticket */}
      <TearTicket
        width={460}
        height={220}
        stubSize={140}
        radius={20}
        torn={isTorn}
        onTear={() => {
          setIsTorn(true);
          handleCopy();
        }}
        background="rgba(255, 255, 255, 0.92)"
        stubBackground="rgba(254, 252, 248, 0.95)"
        color="#1e293b"
        borderColor="rgba(244, 132, 95, 0.25)"
        stub={
          <div ref={qrWrapperRef} className="h-full w-full flex flex-col items-center justify-center p-3 text-center">
            <div className={`p-1.5 bg-white rounded-xl shadow-xs border border-stone-200/90 ${isExpired ? "opacity-25 grayscale" : ""}`}>
              {code ? (
                <QRCodeSVG value={code} size={90} level="M" includeMargin={false} />
              ) : (
                <div className="w-[90px] h-[90px] flex items-center justify-center text-stone-400 text-[10px] font-mono">
                  No Code
                </div>
              )}
            </div>
            <span className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mt-2">
              {isTorn ? "Torn / Active" : "Drag to Tear"}
            </span>
          </div>
        }
      >
        <div className="h-full w-full p-5 flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F4845F] border border-[#FCD7C5] text-[10px] font-mono font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F4845F]" />
              <span>Relief Goods Pass</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
              {isExpired ? "Expired" : "Active"}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-black text-base text-stone-900 leading-tight">
              {evacueeName || "Family Emergency Pass"}
            </h3>
            <p className="text-xs text-stone-600 font-mono truncate">
              📍 {shelterName || "District Emergency Safe Haven"}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/70">
            <span className="font-mono font-bold text-[#F4845F] tracking-wider text-sm">
              {code || "••••••••"}
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              Exp: <strong className={isExpired ? "text-red-600" : "text-amber-600"}>{timeLeft || "Active"}</strong>
            </span>
          </div>
        </div>
      </TearTicket>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-white/90 hover:bg-white border border-stone-200/90 text-xs font-bold font-display text-stone-800 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
        >
          {copied ? (
            <span className="text-[#52B788]">✓ Code Copied to Clipboard</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-[#F4845F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Voucher Code</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={pdfGenerating || !code}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F4845F] hover:bg-[#E76F51] text-white text-xs font-bold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
        >
          {pdfGenerating ? (
            <>
              <Spinner size="sm" />
              <span>Generating PDF…</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download PDF Pass</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
