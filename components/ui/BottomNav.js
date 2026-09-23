"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTranslations } from "@/lib/i18n/LanguageContext";

/**
 * BottomNav - MeterMate premium floating dock
 *
 * On the home page dispatches "switch-tab" events to the MeterMate taskbar
 * for seamless Home ↔ Camps ↔ Map switching without page navigation.
 * On other pages, navigates normally.
 */
export default function BottomNav() {
  const pathname = usePathname() || "";
  const { user, role, signOut } = useAuth();
  const t = useTranslations("nav");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const handleOpenMap = () => setIsMapModalOpen(true);
    const handleCloseMap = () => setIsMapModalOpen(false);
    const handleSwitchTab = (e) => {
      const tab = e.detail?.tab;
      if (tab) {
        setActiveTab(tab);
        if (tab !== "map") {
          setIsMapModalOpen(false);
        }
      }
    };
    window.addEventListener("open-map-modal", handleOpenMap);
    window.addEventListener("close-map-modal", handleCloseMap);
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => {
      window.removeEventListener("open-map-modal", handleOpenMap);
      window.removeEventListener("close-map-modal", handleCloseMap);
      window.removeEventListener("switch-tab", handleSwitchTab);
    };
  }, []);

  const getCleanPath = (path) => {
    const parts = path.split("/").filter(Boolean);
    if (["en", "hi", "bn"].includes(parts[0])) {
      return "/" + parts.slice(1).join("/");
    }
    return path || "/";
  };

  const currentPath = getCleanPath(pathname);
  const isHomePage = currentPath === "/" || currentPath === "";

  if (currentPath === "/login" || currentPath === "/signup") {
    return null;
  }

  const dispatchTab = (tab) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab } }));
    }
  };

  // ─── Admin ────────────────────────────────────────────────
  let tabs = [];

  if (role === "admin") {
    tabs = [
      {
        href: "/?tab=map",
        label: "Live Map",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
      },
      {
        href: "/admin",
        label: "Admin HQ",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        href: "/register-evacuee",
        label: "Register",
        isMiddleHero: true,
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        href: "/coordinator",
        label: "Camps",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: "/volunteer",
        label: "Volunteers",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ),
      },
    ];

  } else if (role === "coordinator") {
    tabs = [
      {
        href: "/coordinator",
        label: "Logistics",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: "/register-shelter",
        label: "Add Camp",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        href: "/register-evacuee",
        label: "Register",
        isMiddleHero: true,
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        href: "/?tab=map",
        label: "Live Map",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
      },
    ];

  } else if (role === "volunteer") {
    tabs = [
      {
        href: "/volunteer",
        label: "Rescue",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: "/register-evacuee",
        label: "Register",
        isMiddleHero: true,
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        href: "/?tab=map",
        label: "Live Map",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
      },
    ];

  } else if (role === "shop") {
    tabs = [
      {
        href: "/shop",
        label: "Redeem",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.614A2.993 2.993 0 009 9.35c.783-.57 1.834-.57 2.618 0 .784-.57 1.834-.57 2.618 0 .784-.57 1.834-.57 2.618 0a3.001 3.001 0 003.75.614M3.75 9.35l.84-4.619A1.5 1.5 0 016.064 3.5h11.872a1.5 1.5 0 011.474 1.231l.84 4.619" />
          </svg>
        ),
      },
      {
        href: "/register-evacuee",
        label: "Register",
        isMiddleHero: true,
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        href: "/?tab=map",
        label: "Live Map",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
      },
    ];

  } else {
    // ─── Public / Evacuee (Default) ───────────────────────────
    tabs = [
      {
        id: "home",
        href: "/",
        label: "Home",
        exact: true,
        onHomeTab: "home",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        ),
      },
      {
        id: "camps",
        href: "/",
        label: "Camps",
        onHomeTab: "camps",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M3 20l9-16 9 16M12 4v16M8.5 20l3.5-7 3.5 7" />
          </svg>
        ),
      },
      {
        href: "/register-evacuee",
        label: "Register",
        isMiddleHero: true,
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
      {
        id: "map",
        href: "/",
        label: "Live Map",
        onHomeTab: "map",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
      },
    ];

    if (!user) {
      tabs.push({
        id: "login",
        href: "/login",
        label: "Login",
        icon: (active) => (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "2" : "1.75"}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        ),
      });
    }
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="
        fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.25rem)] max-w-lg
        backdrop-blur-3xl bg-white/85 dark:bg-stone-900/85
        border border-white/80 dark:border-stone-800/80
        rounded-3xl
        shadow-[0_16px_36px_-6px_rgba(15,23,42,0.22),0_0_0_1px_rgba(255,255,255,0.7)]
        z-[100002] px-2 py-1 flex items-center justify-around select-none
      "
      style={{
        paddingBottom: "calc(0.35rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {tabs.map((tab, idx) => {
        const isActive = isHomePage
          ? tab.onHomeTab
            ? activeTab === tab.onHomeTab
            : isMapModalOpen
            ? tab.onHomeTab === "map"
            : false
          : tab.exact
          ? currentPath === tab.href
          : tab.href !== "/" && currentPath.startsWith(tab.href);

        if (tab.isMiddleHero) {
          return (
            <Link
              key={tab.href + idx}
              href={tab.href}
              prefetch={true}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("close-map-modal"));
                }
              }}
              className="
                group relative -top-3.5 flex flex-col items-center justify-center select-none no-underline
                transition-transform active:scale-95 shrink-0 px-2
              "
            >
              <div
                className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-white
                  shadow-[0_6px_22px_rgba(255,90,54,0.45)] border-2 border-white
                  transition-all duration-200 group-hover:scale-105
                  bg-gradient-to-tr from-[#E04825] to-[#FF5A36]
                  group-hover:shadow-[0_8px_28px_rgba(255,90,54,0.6)]
                `}
              >
                {tab.icon(false)}
              </div>
              <span className="text-[10px] mt-0.5 font-bold font-display text-[#FF5A36] tracking-tight">
                {tab.label}
              </span>
            </Link>
          );
        }

        // Home-tab tabs: dispatch taskbar switch event if on home page; or custom onClick action
        const handleClick = tab.onClick
          ? tab.onClick
          : tab.onHomeTab
          ? (e) => {
              if (isHomePage) {
                e.preventDefault();
                setActiveTab(tab.onHomeTab);
                dispatchTab(tab.onHomeTab);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("close-map-modal"));
                }
              }
            }
          : undefined;

        return (
          <Link
            key={(tab.href || "") + (tab.id || idx)}
            href={tab.href || "#"}
            onClick={handleClick}
            prefetch={true}
            className={`
              group flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl
              transition-all duration-200 relative flex-1 select-none no-underline
              ${isActive
                ? "text-[#FF5A36] bg-[#FF5A36]/10 font-bold shadow-xs"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-100/60"
              }
            `}
          >
            <div className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
              {tab.icon(isActive)}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-display font-semibold truncate w-full text-center">
              {tab.label}
            </span>
            {/* Active dot indicator */}
            {isActive && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#FF5A36]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
