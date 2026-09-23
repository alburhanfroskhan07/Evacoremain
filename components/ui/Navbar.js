"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import LanguageToggle from "./LanguageToggle";
import ProfileDropdown from "./ProfileDropdown";
import { getSavedFamilyPasses } from "@/lib/family-passes";

/**
 * Navbar - Clean Master Disaster Top Bar
 *
 * Left: Brand identity (EVACORE + Live Disaster Grid status).
 * Right: Language selector + Official ProfileDropdown OR Evacuee Logout OR Login.
 * All unnecessary buttons (Map, Camps, Evacuee, Voice) are completely removed from the top bar.
 */
export default function Navbar() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const pathname = usePathname() || "";
  const [hasEvacueePasses, setHasEvacueePasses] = useState(false);

  const getCleanPath = (path) => {
    const parts = (path || "").split("/").filter(Boolean);
    if (["en", "hi", "bn"].includes(parts[0])) {
      return "/" + parts.slice(1).join("/");
    }
    return path || "/";
  };
  const cleanPath = getCleanPath(pathname);
  const isLoginPage = cleanPath === "/login";

  // Check if current user is an evacuee with passes saved in local vault
  useEffect(() => {
    const checkEvacuee = () => {
      try {
        const passes = getSavedFamilyPasses();
        setHasEvacueePasses(Array.isArray(passes) && passes.length > 0);
      } catch {
        setHasEvacueePasses(false);
      }
    };
    checkEvacuee();
    window.addEventListener("storage", checkEvacuee);
    window.addEventListener("evacuee-registered", checkEvacuee);
    return () => {
      window.removeEventListener("storage", checkEvacuee);
      window.removeEventListener("evacuee-registered", checkEvacuee);
    };
  }, [pathname]);

  const isOfficial = Boolean(user && role && role !== "evacuee");
  const isEvacuee = role === "evacuee" || (!isOfficial && hasEvacueePasses);

  const handleEvacueeLogout = async () => {
    if (typeof window !== "undefined") {
      if (window.confirm("Are you sure you want to sign out and clear your active evacuee session?")) {
        try {
          localStorage.removeItem("RELIEF_FAMILY_PASSES_VAULT_V1");
          localStorage.removeItem("evacore_auth_user");
        } catch {}
        setHasEvacueePasses(false);
        try {
          await signOut?.();
        } catch {}
        window.location.href = "/";
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full px-2 sm:px-3 pt-2 pb-1.5 bg-gradient-to-b from-white via-white/95 to-transparent backdrop-blur-md">
      <div className="w-full glass-taskbar rounded-2xl px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2">
        
        {/* ── Brand Logo & Live Status ── */}
        <Link
          href="/"
          prefetch={true}
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab: "home" } }));
              window.dispatchEvent(new CustomEvent("close-map-modal"));
            }
          }}
          className="flex items-center gap-1.5 sm:gap-2.5 group select-none no-underline shrink-0"
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-stone-200/90 group-hover:scale-105 group-hover:border-[#FF5A36]/50 transition-all duration-300 shrink-0">
            <Image
              src="/logo-emblem.png"
              alt="Evacore Logo"
              width={32}
              height={32}
              priority
              className="w-full h-full object-contain"
            />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>

          <div className="flex flex-col shrink-0 leading-none">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[14px] sm:text-[16px] font-black font-display tracking-tight leading-none group-hover:opacity-90 transition-opacity">
                <span className="text-[#FF5A36]">Eva</span>
                <span className="text-[#1B638A]">corE</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black font-mono uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 leading-none">
                LIVE
              </span>
            </div>
            <div className="hidden xs:flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span className="text-[8px] sm:text-[9.5px] font-mono text-stone-400 font-semibold tracking-wider uppercase leading-none">
                DISASTER GRID
              </span>
            </div>
          </div>
        </Link>

        {/* ── Right Controls: Language Selector + Auth Menu/Button ONLY ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Multilingual Selector */}
          <LanguageToggle variant="dropdown" />

          {/* 1. Official Persona Profile Dropdown */}
          {isOfficial ? (
            <div className="flex items-center pl-1 sm:pl-1.5 border-l border-stone-200/80 shrink-0">
              <ProfileDropdown />
            </div>
          ) : isEvacuee ? (
            /* 2. Evacuee Logout Button (for evacuees who do not have official profile dropdown) */
            <button
              type="button"
              onClick={handleEvacueeLogout}
              title="Sign out of Evacuee session"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer shadow-2xs select-none"
            >
              <svg className="w-3.5 h-3.5 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span>Logout</span>
            </button>
          ) : !isLoginPage ? (
            /* 3. Public User Login Link */
            <Link
              href="/login"
              className="
                px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl
                bg-gradient-to-r from-[#FF5A36] to-[#E04825] hover:from-[#E04825] hover:to-[#C7420F]
                text-white shadow-[0_2px_8px_rgba(255,90,54,0.32)] border border-[#FF5A36] transition-all no-underline
                flex items-center gap-1.5 active:scale-95 shrink-0 select-none
              "
            >
              <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span>Login</span>
            </Link>
          ) : null}
        </div>

      </div>
    </header>
  );
}