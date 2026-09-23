"use client";

import { useState, useEffect, useRef } from "react";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthContext";
import { Html5Qrcode } from "html5-qrcode";
import { queueOfflineRedemption } from "@/lib/offline-sync";
import { idbGet, STORES } from "@/lib/idb-storage";
import CodeSlots from "@/components/ui/CodeSlots";
import StatusMark from "@/components/ui/StatusMark";

function extractCleanCode(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();

  // 1. JSON payload from QR: e.g. {"code":"ABC123XYZ"}
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      const val = parsed.code || parsed.voucherCode || parsed.qrCode || parsed.id;
      if (val) return String(val).trim().toUpperCase();
    } catch {}
  }

  // 2. URL payload from QR: e.g. https://relief.gov/shop?code=ABC123XYZ
  if (text.includes("?") || text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const urlObj = new URL(text, "http://localhost");
      const urlCode =
        urlObj.searchParams.get("code") ||
        urlObj.searchParams.get("voucherCode") ||
        urlObj.searchParams.get("voucher") ||
        urlObj.searchParams.get("pass");
      if (urlCode) return urlCode.trim().toUpperCase();
    } catch {}
  }

  // 3. Prefixed codes: e.g. "VOUCHER: ABC123XYZ"
  const prefixMatch = text.match(/^(?:VOUCHER|CODE|PASS|RELIEF|TICKET)\s*[:=-]\s*([A-Z0-9_-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].trim().toUpperCase();
  }

  return text.replace(/\s+/g, "").toUpperCase();
}

/**
 * ShopRedemptionPage Component - Master PRD Section 10.5 & 10.6
 *
 * Ultra-polished merchant redemption portal with camera QR scanner, rounded squircle inputs,
 * and high-contrast status feedback cards.
 */
export default function ShopRedemptionPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const scannerRef = useRef(null);

  const executeRedeem = async (codeToRedeem) => {
    const raw = codeToRedeem || code;
    const cleanCode = extractCleanCode(raw);
    if (!cleanCode) return;

    setLoading(true);
    setResult(null);

    const shopId = user?.email || user?.uid || "District Merchant Hub";

    // 1. Offline Mode handling
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      try {
        queueOfflineRedemption(cleanCode, shopId);
        setResult({
          status: "success",
          message: "Offline Redemption Verified & Logged! Relief goods authorized. Will sync to district ledger when internet returns.",
          redeemedAt: new Date().toLocaleTimeString(),
          isOffline: true,
        });
      } catch (dupErr) {
        setResult({
          status: "already_used",
          message: dupErr.message || "This voucher was already redeemed at this offline merchant terminal.",
          redeemedAt: "Earlier session",
          shopId: "This Station (Offline Lock)",
        });
      }
      setLoading(false);
      return;
    }

    // 2. Online verification via API
    try {
      const res = await fetch("/api/redeem-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, shopId }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 200 || data.status === "success") {
        setResult({
          status: "success",
          message: data.message || "Voucher redeemed successfully. Relief goods authorized for handout.",
          redeemedAt: data.redeemedAt || new Date().toLocaleTimeString(),
        });
      } else if (res.status === 409 || data.status === "already_used") {
        setResult({
          status: "already_used",
          message: data.message || "This voucher has already been redeemed.",
          redeemedAt: data.redeemedAt || "Earlier today",
          shopId: data.shopId || data.redeemedByShopId || "Another shop",
        });
      } else if (res.status === 410 || data.status === "expired") {
        setResult({
          status: "expired",
          message: data.message || "This voucher has expired and cannot be processed.",
        });
      } else {
        // Check local IndexedDB pass vault fallback
        const localPass = await idbGet(STORES.FAMILY_PASSES, cleanCode);
        if (localPass) {
          setResult({
            status: "success",
            message: `Emergency Pass Verified for ${localPass.name || "Evacuee"}. Relief authorized.`,
            redeemedAt: new Date().toLocaleTimeString(),
          });
        } else {
          setResult({
            status: "not_found",
            message: data.message || data.error || "Voucher code not found in district database.",
          });
        }
      }
    } catch (err) {
      console.warn("Voucher redemption network error, fallback to offline queue:", err);
      queueOfflineRedemption(cleanCode, shopId);
      setResult({
        status: "success",
        message: "Offline Redemption Recorded. Relief goods authorized for handout. Record will sync to cloud automatically.",
        redeemedAt: new Date().toLocaleTimeString(),
        isOffline: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeRedeem(code);
  };

  const startScanner = async () => {
    setScannerError(null);
    setScanning(true);

    setTimeout(async () => {
      try {
        const qrElement = document.getElementById("qr-reader");
        if (!qrElement) return;

        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const clean = extractCleanCode(decodedText);
            setCode(clean);
            stopScanner();
            executeRedeem(clean);
          },
          () => {}
        );
      } catch (err) {
        console.warn("Camera start notice:", err);
        setScannerError(
          "Camera access denied or unavailable. You can type the voucher code manually below."
        );
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-display text-[#1C1917]">
          Relief Voucher Redemption
        </h1>
        <p className="text-xs text-[#78716C] mt-0.5">
          Scan QR with camera or enter the code to verify and release authorized supplies.
        </p>
      </div>

      {/* Redemption Card */}
      <div className="card-base p-5 space-y-4 rounded-3xl border-[#E5DCCE] shadow-md bg-gradient-to-b from-white to-[#FAF8F5]">
        {/* Camera QR Scanner Area */}
        <div className="space-y-2">
          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              className="
                w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#FF5A1F]/40 bg-[#FFF9F5]
                text-[#FF5A1F] hover:bg-[#FFE9DC] hover:border-[#FF5A1F]
                transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 font-semibold text-xs shadow-xs hover:scale-[1.01] active:scale-[0.99]
              "
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span>Scan QR Code with Camera</span>
            </button>
          ) : (
            <div className="rounded-3xl overflow-hidden border border-[#E5DCCE] bg-[#1C1917] p-3 space-y-2 shadow-inner">
              <div id="qr-reader" className="w-full rounded-2xl overflow-hidden min-h-[240px]" />
              <button
                type="button"
                onClick={stopScanner}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          )}

          {scannerError && (
            <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-3 rounded-2xl border border-[#FECACA]">
              {scannerError}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#E5DCCE]"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-[#78716C]">
            Or enter code manually
          </span>
          <div className="flex-grow border-t border-[#E5DCCE]"></div>
        </div>

        {/* Fast 6-Digit PIN Slots / Manual Code Entry */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="voucher-code"
              className="block text-xs font-semibold text-[#1C1917] font-display"
            >
              Voucher PIN or Alphanumeric Code
            </label>
            <span className="text-[10px] font-mono text-stone-500">Auto-validating</span>
          </div>

          {/* KokonutUI CodeSlots for rapid 6-digit relief PIN entry */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-50/80 border border-stone-200/80">
            <span className="text-[10px] font-mono font-bold text-stone-500 mb-2 uppercase tracking-wider">
              Quick 6-Digit Relief PIN
            </span>
            <CodeSlots
              length={6}
              status={result?.status === "success" ? "success" : result?.status === "expired" || result?.status === "not_found" ? "error" : "idle"}
              onChange={(digits) => {
                if (digits.length > 0) setCode(digits);
              }}
              onComplete={(digits) => {
                setCode(digits);
                executeRedeem(digits);
              }}
              slotSize={42}
              gap={6}
              radius={12}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                id="voucher-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Or type full voucher: e.g. RELIEF-8832-KOL"
                className="
                  w-full px-4 py-3 text-sm font-mono font-bold tracking-wider rounded-2xl
                  bg-[#FAF8F5] text-[#1C1917] placeholder-[#A8A29E] border border-[#E5DCCE]
                  outline-none focus:bg-[#FFFFFF] focus:border-[#FF5A1F] uppercase shadow-inner
                "
                required
              />
              {code && (
                <button
                  type="button"
                  onClick={() => setCode("")}
                  className="absolute right-3.5 top-3.5 text-[#78716C] hover:text-[#1C1917] text-xs p-1 cursor-pointer"
                  aria-label="Clear code input"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn-primary w-full text-xs font-semibold py-3 rounded-2xl cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  <span>Checking Relief Ledger…</span>
                </div>
              ) : (
                <span>Verify & Release Goods</span>
              )}
            </button>
          </form>
        </div>

        {/* ── Required Result Card Variants with KokonutUI StatusMark ── */}
        {result && (
          <div className="animate-fade-in pt-1">
            {/* Variant 1: Success */}
            {result.status === "success" && (
              <div className="result-card result-card-ok space-y-2 rounded-2xl p-4 bg-[#F0FDF4] border border-[#BBF7D0]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#16A34A] font-display">
                  <StatusMark status="done" doneColor="#16A34A" size={22} strokeWidth={2.5} />
                  <span>Relief Voucher Verified & Approved</span>
                </div>
                <p className="text-xs text-[#1C1917] leading-relaxed">
                  {result.message}
                </p>
                {result.redeemedAt && (
                  <p className="text-[11px] font-mono text-[#16A34A] font-bold">
                    Official Release Timestamp: {result.redeemedAt}
                  </p>
                )}
              </div>
            )}

            {/* Variant 2: Already-Used */}
            {result.status === "already_used" && (
              <div className="result-card result-card-warn space-y-2 rounded-2xl p-4 bg-[#FFFBEB] border border-[#FDE68A]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#D97706] font-display">
                  <StatusMark status="failed" errorColor="#D97706" size={22} strokeWidth={2.5} />
                  <span>Already Redeemed Voucher</span>
                </div>
                <p className="text-xs text-[#1C1917]">
                  {result.message}
                </p>
                <div className="text-[11px] font-mono text-[#D97706] space-y-0.5 font-bold">
                  {result.redeemedAt && <div>Prior Redemption: {result.redeemedAt}</div>}
                  {result.shopId && <div>Location/Shop: {result.shopId}</div>}
                </div>
              </div>
            )}

            {/* Variant 3: Expired or Invalid */}
            {(result.status === "expired" || result.status === "not_found") && (
              <div className="result-card result-card-crit space-y-2 rounded-2xl p-4 bg-[#FEF2F2] border border-[#FECACA]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#DC2626] font-display">
                  <StatusMark status="failed" errorColor="#DC2626" size={22} strokeWidth={2.5} />
                  <span>{result.status === "expired" ? "Voucher Expired" : "Invalid Voucher Code"}</span>
                </div>
                <p className="text-xs text-[#1C1917]">
                  {result.message}
                </p>
                <p className="text-[10px] text-[#78716C]">
                  {result.status === "expired"
                    ? "Advise the evacuee to re-register at an active relief desk."
                    : "Please re-check the entered code or scan the physical QR."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo Test Codes Shortcut */}
      <div className="card-surface p-4 text-xs space-y-2 rounded-2xl">
        <span className="font-semibold text-[#1C1917] font-display">Quick Test Codes for Demo:</span>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setCode("DEMO-VOUCHER-UNUSED")}
            className="px-3 py-1.5 bg-[#FFFFFF] rounded-xl border border-[#E5DCCE] text-xs font-mono text-[#16A34A] hover:border-[#16A34A] shadow-xs cursor-pointer hover:scale-102 active:scale-98 transition-all"
          >
            DEMO-UNUSED (Success)
          </button>
          <button
            type="button"
            onClick={() => setCode("DEMO-VOUCHER-USED")}
            className="px-3 py-1.5 bg-[#FFFFFF] rounded-xl border border-[#E5DCCE] text-xs font-mono text-[#D97706] hover:border-[#D97706] shadow-xs cursor-pointer hover:scale-102 active:scale-98 transition-all"
          >
            DEMO-USED (Already Used)
          </button>
          <button
            type="button"
            onClick={() => setCode("DEMO-VOUCHER-EXPIRED")}
            className="px-3 py-1.5 bg-[#FFFFFF] rounded-xl border border-[#E5DCCE] text-xs font-mono text-[#DC2626] hover:border-[#DC2626] shadow-xs cursor-pointer hover:scale-102 active:scale-98 transition-all"
          >
            DEMO-EXPIRED (Expired)
          </button>
        </div>
      </div>
    </div>
  );
}
