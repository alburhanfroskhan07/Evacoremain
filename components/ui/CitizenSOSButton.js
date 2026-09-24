"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import SOSButton from "./SOSButton";

/**
 * CitizenSOSButton
 *
 * Dedicated gatekeeper component ensuring that the circular floating SOS Button
 * with Live Location Tracking is strictly displayed ONLY on the Citizen / Evacuee Portal.
 *
 * It is completely hidden for:
 * - Official roles: admin, coordinator, volunteer, shopkeeper
 * - Operational routes: /admin, /coordinator, /volunteer, /shop, /login
 * - Initial landing screen (PersonaGateway) before entering the Citizen Portal
 */
export default function CitizenSOSButton() {
  const pathname = usePathname() || "";
  const { user, role } = useAuth();
  const [isCitizenPortalActive, setIsCitizenPortalActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Normalize path without locale prefix (e.g. /en/admin -> /admin)
  const getCleanPath = (path) => {
    const parts = (path || "").split("/").filter(Boolean);
    if (["en", "hi", "bn"].includes(parts[0])) {
      return "/" + parts.slice(1).join("/");
    }
    return path || "/";
  };

  const cleanPath = getCleanPath(pathname);

  useEffect(() => {
    setMounted(true);

    const checkCitizenAccess = () => {
      try {
        const persona = localStorage.getItem("evacore_persona");
        const hasFamilyPasses = Boolean(localStorage.getItem("RELIEF_FAMILY_PASSES_VAULT_V1"));

        // If user has chosen evacuee persona, has registered passes, or has role "evacuee"
        const isEvacueeRole = role === "evacuee" || persona === "evacuee" || hasFamilyPasses;

        // If on the registration or guide pages, it is part of the citizen portal
        const isCitizenRoute = cleanPath === "/register-evacuee" || cleanPath.startsWith("/guide");

        // On home page (/), citizen portal is active if user has entered citizen mode or has passes
        const isHomeCitizen = (cleanPath === "/" || cleanPath === "") && isEvacueeRole;

        setIsCitizenPortalActive(isEvacueeRole || isCitizenRoute || isHomeCitizen);
      } catch {
        setIsCitizenPortalActive(role === "evacuee");
      }
    };

    checkCitizenAccess();

    window.addEventListener("evacuee-registered", checkCitizenAccess);
    window.addEventListener("storage", checkCitizenAccess);

    return () => {
      window.removeEventListener("evacuee-registered", checkCitizenAccess);
      window.removeEventListener("storage", checkCitizenAccess);
    };
  }, [cleanPath, role]);

  if (!mounted) return null;

  // 1. Strictly hide for official operational roles
  if (role && ["admin", "coordinator", "volunteer", "shop"].includes(role)) {
    return null;
  }

  // 2. Strictly hide on department operational consoles & auth pages
  if (
    cleanPath.startsWith("/admin") ||
    cleanPath.startsWith("/coordinator") ||
    cleanPath.startsWith("/volunteer") ||
    cleanPath.startsWith("/shop") ||
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/signup")
  ) {
    return null;
  }

  // 3. Only render if the citizen portal is active
  if (!isCitizenPortalActive) {
    return null;
  }

  return <SOSButton />;
}
