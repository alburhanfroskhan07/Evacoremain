"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { getOfflineCounts, syncAllOfflineData, clearAllOfflineData } from "@/lib/offline-sync";
import Spinner from "@/components/ui/Spinner";

/**
 * OfflineIndicator - Zero-Internet & Auto-Sync Bar (Master PRD Section 11)
 *
 * Appears when offline or when pending offline records exist,
 * automatically syncs with Firebase when network returns.
 */
export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ total: 0 });
  const t = useTranslations("common");

  const refreshCounts = useCallback(() => {
    setPendingCounts(getOfflineCounts());
  }, []);

  const handleClear = useCallback(() => {
    clearAllOfflineData();
    refreshCounts();
    setReconnected(true);
    setTimeout(() => setReconnected(false), 4000);
  }, [refreshCounts]);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await syncAllOfflineData();
      const count = res.synced ?? res.syncedCount ?? 0;
      if (count > 0 || res.success) {
        setIsOffline(false);
        setReconnected(true);
        setTimeout(() => setReconnected(false), 4000);
      }
    } catch (e) {
      console.warn("Sync error:", e);
    } finally {
      refreshCounts();
      setSyncing(false);
    }
  }, [refreshCounts]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Manage Service Worker: unregister in dev, register /sw.js in production for 10-day offline caching
      if ("serviceWorker" in navigator) {
        if (process.env.NODE_ENV === "development") {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          }).catch(() => {});
        } else {
          navigator.serviceWorker.register("/sw.js").catch((err) => {
            console.warn("ServiceWorker registration notice:", err);
          });
        }
      }

      setIsOffline(!window.navigator.onLine);
      refreshCounts();

      const handleOnline = () => {
        setIsOffline(false);
        triggerSync();
      };

      const handleOffline = () => {
        setIsOffline(true);
        setReconnected(false);
        refreshCounts();
      };

      const handleExternalSync = () => {
        triggerSync();
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("trigger-offline-sync", handleExternalSync);
      window.addEventListener("offline-sync-completed", refreshCounts);

      const interval = setInterval(refreshCounts, 3000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("trigger-offline-sync", handleExternalSync);
        window.removeEventListener("offline-sync-completed", refreshCounts);
        clearInterval(interval);
      };
    }
  }, [refreshCounts, triggerSync]);

  if (!isOffline && !reconnected && pendingCounts.total === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        w-full py-1.5 px-4 text-xs font-semibold flex items-center justify-between gap-2
        transition-all duration-300 select-none z-50 shadow-xs
        ${
          isOffline && pendingCounts.total === 0
            ? "bg-[#DC2626] text-white"
            : pendingCounts.total > 0
            ? "bg-[#D97706] text-white"
            : "bg-[#16A34A] text-white animate-fade-in"
        }
      `}
    >
      <div className="flex items-center gap-2">
        {pendingCounts.total > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>
              {pendingCounts.total} offline record{pendingCounts.total > 1 ? "s" : ""} queued locally
              {isOffline ? " (offline)" : " waiting to sync"}
            </span>
          </>
        ) : isOffline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Zero-Internet Mode Active (local database running)</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>Connection restored. All local records synced live.</span>
          </>
        )}
      </div>

      {pendingCounts.total > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={triggerSync}
            disabled={syncing}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="Force upload queued records to cloud"
          >
            {syncing ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Syncing…</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Sync Now</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-white/90 hover:text-white text-[10px] font-medium transition-all cursor-pointer"
            title="Clear queued local records"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

