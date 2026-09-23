"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import TideGauge from "@/components/ui/TideGauge";
import { fetchNearbyHospitals } from "@/lib/hospitals";
import { haversineDistance } from "@/lib/geo";

function createPinpointIcon({ color, iconSvg, badgeText, isPulse = false }) {
  if (typeof window === "undefined" || !L?.divIcon) return undefined;
  return L.divIcon({
    className: "teardrop-pinpoint",
    html: `
      <div class="teardrop-wrapper">
        <div class="teardrop-head" style="background-color: ${color};">
          <div class="teardrop-content">
            ${iconSvg}
          </div>
        </div>
        <div class="teardrop-ground-pulse ${isPulse ? "animate-ping" : ""}"></div>
        ${badgeText ? `<span style="position: absolute; top: -7px; right: -6px; background: #FFFFFF; color: ${color}; font-size: 8.5px; font-weight: 800; font-family: monospace; border-radius: 9999px; padding: 1px 4.5px; box-shadow: 0 1px 4px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.06); line-height: 1.1;">${badgeText}</span>` : ""}
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

function MapEventsHandler({ onMapClick, onMapMove }) {
  useMapEvents({
    click(e) {
      if (onMapClick && e?.latlng) {
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          onMapClick({
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            isManual: true,
          });
        }
      }
    },
    move(e) {
      if (onMapMove && e?.target) {
        const center = e.target.getCenter();
        const zoom = e.target.getZoom();
        if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
          onMapMove({
            lat: Number(center.lat.toFixed(5)),
            lng: Number(center.lng.toFixed(5)),
            zoom: Number.isFinite(zoom) ? zoom : 13,
          });
        }
      }
    },
    zoomend(e) {
      if (onMapMove && e?.target) {
        const center = e.target.getCenter();
        const zoom = e.target.getZoom();
        if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
          onMapMove({
            lat: Number(center.lat.toFixed(5)),
            lng: Number(center.lng.toFixed(5)),
            zoom: Number.isFinite(zoom) ? zoom : 13,
          });
        }
      }
    },
  });
  return null;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getOccupancyPct(shelter) {
  const cap = Number(shelter.totalCapacity ?? shelter.capacity ?? 0);
  const occ = Number(shelter.currentOccupancy ?? shelter.occupancy ?? 0);
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((occ / cap) * 100));
}

function getTier(pct) {
  if (pct >= 95) return "red";
  if (pct >= 70) return "yellow";
  return "green";
}

const TIER_COLORS = {
  green:  { fill: "#52B788", stroke: "#40916C" },
  yellow: { fill: "#E0A96D", stroke: "#C68E54" },
  red:    { fill: "#E26D5C", stroke: "#CA5746" },
};

const TIER_LABELS = {
  green:  "Available",
  yellow: "Filling Up",
  red:    "At Capacity",
};

/* ──────────────────────────────────────────────
   Map Instance Capture & Bounds Helper
   ────────────────────────────────────────────── */

function MapController({ onMapReady, shelters, routePositions, userLocation, center, zoom }) {
  const map = useMap();
  const hasFittedInitialBounds = useRef(false);
  const prevRouteLengthRef = useRef(0);

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  // If external center/zoom prop changes, fly/pan map to it
  useEffect(() => {
    if (
      center &&
      Array.isArray(center) &&
      typeof center[0] === "number" &&
      typeof center[1] === "number" &&
      Number.isFinite(center[0]) &&
      Number.isFinite(center[1])
    ) {
      try {
        map.setView(center, Number.isFinite(zoom) ? zoom : map.getZoom(), { animate: true });
      } catch {}
    }
  }, [map, center, zoom]);

  // Fit bounds when route geometry changes or once upon initial shelter loading
  useEffect(() => {
    if (!map || center) return;

    // 1. If an active route is present and changed, fit to route
    if (Array.isArray(routePositions) && routePositions.length >= 2) {
      const validRoutePoints = routePositions.filter(
        (pt) =>
          Array.isArray(pt) &&
          typeof pt[0] === "number" &&
          typeof pt[1] === "number" &&
          Number.isFinite(pt[0]) &&
          Number.isFinite(pt[1])
      );
      if (validRoutePoints.length >= 2 && validRoutePoints.length !== prevRouteLengthRef.current) {
        prevRouteLengthRef.current = validRoutePoints.length;
        try {
          map.fitBounds(validRoutePoints, { padding: [45, 45], maxZoom: 15 });
        } catch {}
      }
      return;
    }

    // 2. Initial bounds fitting across shelters (only once on load)
    if (!hasFittedInitialBounds.current && Array.isArray(shelters) && shelters.length > 0) {
      const validShelterPoints = [];
      shelters.forEach((s) => {
        const sLat = Number(s.lat ?? s.latitude);
        const sLng = Number(s.lng ?? s.longitude);
        if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
          validShelterPoints.push([sLat, sLng]);
        }
      });

      if (validShelterPoints.length >= 2) {
        hasFittedInitialBounds.current = true;
        try {
          map.fitBounds(validShelterPoints, { padding: [45, 45], maxZoom: 14 });
        } catch {}
      } else if (validShelterPoints.length === 1) {
        hasFittedInitialBounds.current = true;
        try {
          map.setView(validShelterPoints[0], Number.isFinite(zoom) ? zoom : 13);
        } catch {}
      }
    }
  }, [map, shelters, routePositions, center, zoom]);

  return null;
}

/**
 * ShelterMap Component
 */
export default function ShelterMapInner({
  shelters = [],
  hazards = [],
  hospitals: initialHospitals = [],
  routeGeometry = null,
  fallbackRouteCoords = null,
  hazardBlocked = false,
  trackUserLocation = true,
  className = "",
  center = null,
  zoom = null,
  onLocationSelect = null,
  onSelectHospital = null,
  onReportHazard = null,
  userCoords = null,
  isActive = true,
}) {
  const defaultCenter = (Array.isArray(center) && Number.isFinite(center[0]) && Number.isFinite(center[1]))
    ? center
    : [22.5726, 88.3639];
  const defaultZoom = Number.isFinite(zoom) ? zoom : 13;

  const [userLocation, setUserLocation] = useState(
    userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)
      ? { lat: Number(userCoords.lat.toFixed(5)), lng: Number(userCoords.lng.toFixed(5)), isManual: true }
      : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationErrorMsg, setLocationErrorMsg] = useState(null);
  const [mapFocus, setMapFocus] = useState("all"); // 'home' | 'camp' | 'all'
  const [liveMapCenter, setLiveMapCenter] = useState({
    lat: defaultCenter[0],
    lng: defaultCenter[1],
    zoom: defaultZoom,
  });

  useEffect(() => {
    if (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)) {
      setUserLocation({
        lat: Number(userCoords.lat.toFixed(5)),
        lng: Number(userCoords.lng.toFixed(5)),
        isManual: true,
      });
    }
  }, [userCoords]);
  
  // Hospital Layer States
  const [showHospitals, setShowHospitals] = useState(false);
  const [hospitalsList, setHospitalsList] = useState(initialHospitals);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [activeHospitalRoute, setActiveHospitalRoute] = useState(null);

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);

  // Invalidate map size when tab or view becomes active
  useEffect(() => {
    if (isActive && mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.invalidateSize({ animate: false });
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleMapReady = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    if (mapInstance) {
      const c = mapInstance.getCenter();
      if (c) {
        setLiveMapCenter({
          lat: Number(c.lat.toFixed(5)),
          lng: Number(c.lng.toFixed(5)),
          zoom: mapInstance.getZoom(),
        });
      }
    }
  }, []);

  const handleMapMove = useCallback((pos) => {
    setLiveMapCenter(pos);
  }, []);

  const handleLocationSelect = useCallback((loc) => {
    setUserLocation(loc);
    setLocationErrorMsg(null);
    if (onLocationSelect) {
      onLocationSelect(loc);
    }
  }, [onLocationSelect]);

  /* ── Multi-Tier Live GPS Location Acquisition ── */
  const acquireLocation = useCallback((shouldFlyTo = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationErrorMsg("Geolocation is not supported by your device.");
      return;
    }

    setIsLocating(true);
    setLocationErrorMsg(null);

    const onLocationSuccess = (pos) => {
      setIsLocating(false);
      const loc = {
        lat: Number(pos.coords.latitude.toFixed(5)),
        lng: Number(pos.coords.longitude.toFixed(5)),
        accuracy: Math.round(pos.coords.accuracy || 0),
        isManual: false,
        timestamp: pos.timestamp || Date.now(),
      };
      setUserLocation(loc);
      handleLocationSelect(loc);
      setLocationErrorMsg(null);

      if (shouldFlyTo && mapRef.current) {
        try {
          mapRef.current.flyTo([loc.lat, loc.lng], 15, { animate: true, duration: 1.2 });
        } catch {
          mapRef.current.setView([loc.lat, loc.lng], 15);
        }
      }
    };

    const onLocationFallback = (err) => {
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        (finalErr) => {
          setIsLocating(false);
          if (finalErr?.code === 1) {
            setLocationErrorMsg("Location permission denied. Please allow location access in your browser.");
          } else {
            setLocationErrorMsg(null); // Clean silent fallback so map remains pristine
          }
        },
        { enableHighAccuracy: false, timeout: 3500, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationFallback,
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
    );
  }, [handleLocationSelect]);

  /* Auto-acquire location on initial mount */
  useEffect(() => {
    if (trackUserLocation && typeof window !== "undefined") {
      acquireLocation(false);
    }
  }, [trackUserLocation, acquireLocation]);

  /* Live Continuous Real-Time High-Accuracy GPS Watch */
  useEffect(() => {
    if (!trackUserLocation || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const liveLoc = {
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
            accuracy: Math.round(pos.coords.accuracy || 0),
            isManual: false,
            timestamp: pos.timestamp || Date.now(),
          };
          setUserLocation(liveLoc);
          setLocationErrorMsg(null);
        },
        (err) => {
          console.warn("Continuous GPS telemetry notice:", err?.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } catch (e) {
      console.warn("watchPosition setup notice:", e);
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trackUserLocation]);

  /* ── Smooth Camera FlyTo Home (User Location) ── */
  const flyToHome = useCallback(() => {
    setMapFocus("home");
    const lat = Number(userLocation?.lat ?? userCoords?.lat);
    const lng = Number(userLocation?.lng ?? userCoords?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && mapRef.current) {
      try {
        mapRef.current.flyTo([lat, lng], 15, {
          animate: true,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      } catch {
        mapRef.current.setView([lat, lng], 15);
      }
    } else {
      acquireLocation(true);
    }
  }, [userLocation, userCoords, acquireLocation]);

  /* ── Smooth Camera FlyTo Camps (Nearest or Group) ── */
  const flyToCamps = useCallback((targetShelter = null) => {
    setMapFocus("camp");
    if (!mapRef.current) return;

    if (targetShelter) {
      const tLat = Number(targetShelter.lat ?? targetShelter.latitude);
      const tLng = Number(targetShelter.lng ?? targetShelter.longitude);
      if (Number.isFinite(tLat) && Number.isFinite(tLng)) {
        try {
          mapRef.current.flyTo([tLat, tLng], 15, {
            animate: true,
            duration: 1.2,
            easeLinearity: 0.25,
          });
        } catch {
          mapRef.current.setView([tLat, tLng], 15);
        }
        return;
      }
    }

    const validShelters = (shelters || []).filter((s) => {
      const sLat = Number(s.lat ?? s.latitude);
      const sLng = Number(s.lng ?? s.longitude);
      return Number.isFinite(sLat) && Number.isFinite(sLng);
    });

    if (validShelters.length === 0) return;

    const uLat = Number(userLocation?.lat ?? userCoords?.lat);
    const uLng = Number(userLocation?.lng ?? userCoords?.lng);

    if (Number.isFinite(uLat) && Number.isFinite(uLng)) {
      let nearest = validShelters[0];
      let minDist = Infinity;
      for (const sh of validShelters) {
        const sLat = Number(sh.lat ?? sh.latitude);
        const sLng = Number(sh.lng ?? sh.longitude);
        const d = haversineDistance(uLat, uLng, sLat, sLng);
        if (d < minDist) {
          minDist = d;
          nearest = sh;
        }
      }
      const nLat = Number(nearest.lat ?? nearest.latitude);
      const nLng = Number(nearest.lng ?? nearest.longitude);
      try {
        mapRef.current.flyTo([nLat, nLng], 14, {
          animate: true,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      } catch {
        mapRef.current.setView([nLat, nLng], 14);
      }
    } else {
      const points = validShelters.map((s) => [
        Number(s.lat ?? s.latitude),
        Number(s.lng ?? s.longitude),
      ]);
      try {
        mapRef.current.fitBounds(points, {
          padding: [50, 50],
          maxZoom: 14,
          animate: true,
          duration: 1.2,
        });
      } catch {}
    }
  }, [shelters, userLocation, userCoords]);

  /* Listen for global focus-map events */
  useEffect(() => {
    const handleFocusMap = (e) => {
      const target = e.detail?.target;
      if (target === "home") {
        flyToHome();
      } else if (target === "camp") {
        flyToCamps(e.detail?.shelter);
      }
    };
    window.addEventListener("focus-map", handleFocusMap);
    return () => window.removeEventListener("focus-map", handleFocusMap);
  }, [flyToHome, flyToCamps]);

  /* ── Route to Specific Hospital ── */
  const handleRouteToHospital = useCallback(async (hosp) => {
    if (!hosp || !Number.isFinite(hosp.lat) || !Number.isFinite(hosp.lng)) return;
    const fromLat = Number.isFinite(userLocation?.lat) ? userLocation.lat : 22.5726;
    const fromLng = Number.isFinite(userLocation?.lng) ? userLocation.lng : 88.3639;

    setShowHospitals(true);
    try {
      const res = await fetch("/api/hospitals/nearest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: fromLat,
          lng: fromLng,
          targetLat: hosp.lat,
          targetLng: hosp.lng,
          preferEmergency: hosp.emergency,
          radiusKm: 15,
        }),
      });
      const data = await res.json();
      let validRoute = null;
      if (Array.isArray(data?.routeGeometry) && data.routeGeometry.length >= 2) {
        const mapped = data.routeGeometry
          .map((pt) => {
            if (!Array.isArray(pt) || pt.length < 2) return null;
            const [first, second] = pt;
            const lat = first > 50 ? second : first;
            const lng = first > 50 ? first : second;
            return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
          })
          .filter(Boolean);
        if (mapped.length >= 2) validRoute = mapped;
      }

      if (!validRoute) {
        validRoute = [[fromLat, fromLng], [hosp.lat, hosp.lng]];
      }

      setActiveHospitalRoute(validRoute);

      if (mapRef.current) {
        try {
          mapRef.current.flyTo([hosp.lat, hosp.lng], 15, { animate: true, duration: 1.2 });
        } catch {
          mapRef.current.setView([hosp.lat, hosp.lng], 15);
        }
      }

      if (onSelectHospital) {
        onSelectHospital(hosp);
      }
    } catch (err) {
      console.warn("Hospital route fetch notice, using direct corridor:", err);
      setActiveHospitalRoute([[fromLat, fromLng], [hosp.lat, hosp.lng]]);
    }
  }, [userLocation, onSelectHospital]);

  /* ── Hospital Layer Auto-Fetch ── */
  const toggleHospitalLayer = useCallback(async (targetHospital = null) => {
    const lat = Number.isFinite(userLocation?.lat)
      ? userLocation.lat
      : (Array.isArray(center) && Number.isFinite(center[0]))
      ? center[0]
      : 22.5726;
    const lng = Number.isFinite(userLocation?.lng)
      ? userLocation.lng
      : (Array.isArray(center) && Number.isFinite(center[1]))
      ? center[1]
      : 88.3639;

    const isValidHospital =
      targetHospital &&
      typeof targetHospital === "object" &&
      !(targetHospital instanceof Event) &&
      Number.isFinite(targetHospital.lat) &&
      Number.isFinite(targetHospital.lng);

    if (!showHospitals || isValidHospital) {
      setShowHospitals(true);
      setLoadingHospitals(true);
      try {
        const data = await fetchNearbyHospitals(lat, lng, 15);
        setHospitalsList(Array.isArray(data) ? data : []);
        if (isValidHospital) {
          handleRouteToHospital(targetHospital);
        }
      } catch (err) {
        console.warn("Hospital layer load notice:", err);
      } finally {
        setLoadingHospitals(false);
      }
    } else {
      setShowHospitals(false);
      setActiveHospitalRoute(null);
    }
  }, [showHospitals, userLocation, center, handleRouteToHospital]);

  /* Listen for global open-hospital-layer events */
  useEffect(() => {
    const handleOpenHospital = (e) => {
      const targetHospital = e?.detail?.hospital;
      if (
        targetHospital &&
        typeof targetHospital === "object" &&
        Number.isFinite(targetHospital.lat) &&
        Number.isFinite(targetHospital.lng)
      ) {
        toggleHospitalLayer(targetHospital);
      } else {
        toggleHospitalLayer();
      }
    };

    window.addEventListener("open-hospital-layer", handleOpenHospital);
    return () => window.removeEventListener("open-hospital-layer", handleOpenHospital);
  }, [toggleHospitalLayer]);

  /* Format shelter route geometry */
  let formattedRoutePositions = null;
  let isFallback = false;

  if (activeHospitalRoute && activeHospitalRoute.length > 0) {
    formattedRoutePositions = activeHospitalRoute;
  } else if (routeGeometry && Array.isArray(routeGeometry) && routeGeometry.length > 0) {
    formattedRoutePositions = routeGeometry.map((pt) => {
      if (Array.isArray(pt)) {
        const [first, second] = pt;
        return first > 50 ? [second, first] : [first, second];
      }
      return [pt.lat, pt.lng];
    });
  } else if (fallbackRouteCoords) {
    if (fallbackRouteCoords.from && fallbackRouteCoords.to) {
      formattedRoutePositions = [
        [fallbackRouteCoords.from.lat, fallbackRouteCoords.from.lng],
        [fallbackRouteCoords.to.lat, fallbackRouteCoords.to.lng],
      ];
      isFallback = true;
    } else if (Array.isArray(fallbackRouteCoords) && fallbackRouteCoords.length >= 2) {
      formattedRoutePositions = fallbackRouteCoords.map((pt) => {
        if (Array.isArray(pt)) return [pt[0], pt[1]];
        return [pt.lat, pt.lng];
      });
      isFallback = true;
    }
  }

  // Strictly filter out any NaN or undefined points before rendering to Leaflet
  const sanitizedRoutePositions = Array.isArray(formattedRoutePositions)
    ? formattedRoutePositions.filter(
        (pt) => Array.isArray(pt) && pt.length >= 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
      )
    : null;

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-inner ${className}`} style={{ minHeight: "360px" }}>
      {/* ── Vertical Left Controls: Circular Camps Focus Button (Below Zoom +/-) ── */}
      <div className="absolute top-[82px] sm:top-[86px] left-2.5 sm:left-3 z-[1000] pointer-events-auto flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => flyToCamps()}
          aria-label="View & Focus Relief Camps"
          title={`Focus Relief Camps (${shelters.length})`}
          className={`
            w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 select-none relative
            ${mapFocus === "camp"
              ? "bg-[#FF5A1F] text-white shadow-[#FF5A1F]/40 ring-2 ring-[#FF5A1F]/30"
              : "bg-white/95 backdrop-blur-md text-stone-700 hover:text-[#FF5A1F] hover:bg-white border border-[#E5DCCE]"
            }
          `}
        >
          <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15m-15 0l7.5-15 7.5 15m-15 0l4.5-9m6 9l-4.5-9" />
          </svg>
          {shelters.length > 0 && (
            <span className={`absolute -top-1 -right-1 text-[8.5px] font-mono font-bold px-1 rounded-full border shadow-2xs ${mapFocus === "camp" ? "bg-white text-[#FF5A1F] border-orange-200" : "bg-[#FF5A1F] text-white border-white"}`}>
              {shelters.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Active Hospital Route Floating Strip (allows clearing) ── */}
      {activeHospitalRoute && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto bg-[#1C1917]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-2 text-xs font-display">
          <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />
          <span className="font-bold">Medical Route Active</span>
          <button
            type="button"
            onClick={() => setActiveHospitalRoute(null)}
            className="ml-1 text-white/70 hover:text-white font-mono text-[11px] underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Top Floating Toolbar (Hospital + Hazard + My Location) ── */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center justify-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Toggle Hospitals Layer */}
        <button
          type="button"
          onClick={() => toggleHospitalLayer()}
          aria-label="Toggle Hospitals Layer"
          title={showHospitals ? `Hide Hospitals (${hospitalsList.length})` : "Show Medical Facilities"}
          className={`
            flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold font-display transition-all cursor-pointer select-none active:scale-95 shadow-md whitespace-nowrap
            ${showHospitals
              ? "bg-[#E11D48] text-white shadow-rose-600/30 border border-[#E11D48]"
              : "bg-white/95 backdrop-blur-md text-[#44403C] hover:text-[#E11D48] hover:bg-white border border-[#E5DCCE]"
            }
          `}
        >
          {loadingHospitals ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
          <span>Hospital</span>
          {hospitalsList.length > 0 && (
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-tight ${showHospitals ? "bg-white/30 text-white" : "bg-rose-100 text-[#E11D48]"}`}>
              {hospitalsList.length}
            </span>
          )}
        </button>

        {/* Report Hazard Action (if handler provided) */}
        {onReportHazard && (
          <button
            type="button"
            onClick={onReportHazard}
            aria-label="Report Hazard"
            className="
              flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl
              bg-white/95 backdrop-blur-md border border-[#DC2626]/35 text-[#DC2626]
              font-bold font-display text-[11px] sm:text-xs shadow-md hover:bg-white hover:border-[#DC2626]
              transition-all active:scale-95 cursor-pointer whitespace-nowrap
            "
          >
            <svg className="w-3.5 h-3.5 text-[#DC2626] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>Hazard</span>
          </button>
        )}

        {/* Locate Me Button */}
        <button
          type="button"
          onClick={() => acquireLocation(true)}
          disabled={isLocating}
          aria-label="Find my live GPS location"
          className="
            flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl
            bg-white/95 backdrop-blur-md border border-[#E5DCCE] text-[#1C1917]
            font-bold font-display text-[11px] sm:text-xs shadow-md hover:bg-white hover:border-[#D6C8B2]
            transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap
          "
        >
          {isLocating ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
              <span>Locating…</span>
            </>
          ) : (
            <>
              <svg className={`w-3.5 h-3.5 ${userLocation ? "text-[#16A34A]" : "text-[#FF5A1F]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
              <span>{userLocation ? "My Location" : "Locate"}</span>
            </>
          )}
        </button>
      </div>

      {/* ── Real-Time Live Coordinates HUD (Center + Live GPS) - Placed at Lower Edge ── */}
      <div className="absolute bottom-2 left-2 z-[1000] flex flex-col gap-1 pointer-events-auto max-w-[calc(100%-16px)] select-none">
        {/* Real-time Map Center Coordinates */}
        <div className="bg-[#1C1917]/92 backdrop-blur-md text-white text-[9.5px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-md border border-white/15 flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse shrink-0" />
          <span className="text-white/70 text-[9px] sm:text-[9.5px] font-bold tracking-wider uppercase shrink-0">Live View:</span>
          <span className="font-semibold text-[#38BDF8] tracking-tight">
            {Number(liveMapCenter?.lat ?? defaultCenter[0]).toFixed(5)}, {Number(liveMapCenter?.lng ?? defaultCenter[1]).toFixed(5)}
          </span>
          <span className="text-white/40 text-[9px] hidden sm:inline">z{liveMapCenter?.zoom || defaultZoom}</span>
        </div>

        {/* Real-Time Live Device GPS or Pinned Coordinates */}
        {userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng) && (
          <div className="bg-[#1C1917]/92 backdrop-blur-md text-white text-[9.5px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-md border border-white/15 flex items-center gap-1.5 w-fit">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${userLocation.isManual ? "bg-[#F59E0B]" : "bg-[#22C55E] animate-ping"}`} />
            <span className="text-white/70 text-[9px] sm:text-[9.5px] font-bold tracking-wider uppercase shrink-0">
              {userLocation.isManual ? "Pinned:" : "Live GPS:"}
            </span>
            <span className={userLocation.isManual ? "text-[#FDE047] font-semibold tracking-tight" : "text-[#4ADE80] font-semibold tracking-tight"}>
              {Number(userLocation.lat).toFixed(5)}, {Number(userLocation.lng).toFixed(5)}
            </span>
            {userLocation.accuracy ? (
              <span className="text-white/40 text-[8.5px] sm:text-[9px]">±{Math.round(userLocation.accuracy)}m</span>
            ) : null}
          </div>
        )}

        {/* 10-Day Air-Gapped / Offline Grid Mode indicator */}
        {typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine && (
          <div className="bg-[#DC2626]/90 backdrop-blur-md text-white text-[9px] sm:text-[9.5px] font-mono px-2 py-0.5 rounded-lg shadow-md border border-white/20 flex items-center gap-1.5 select-none w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            <span className="font-bold uppercase tracking-wider text-white">Offline Grid:</span>
            <span className="text-white/90">Cached Shelters Active</span>
          </div>
        )}
      </div>

      {/* ── Location Error Notice Bar (if permission blocked) ── */}
      {locationErrorMsg && (
        <div className="absolute top-3 left-3 right-36 z-[1000] bg-[#FEF2F2]/95 backdrop-blur-md border border-[#FECACA] text-[#991B1B] text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-md flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <svg className="w-3.5 h-3.5 text-[#DC2626] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="truncate">{locationErrorMsg}</span>
          </div>
          <button
            onClick={() => setLocationErrorMsg(null)}
            className="text-[#991B1B] hover:text-[#1C1917] font-bold text-xs p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full relative z-0"
        style={{ height: "100%", minHeight: "360px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventsHandler onMapClick={handleLocationSelect} onMapMove={handleMapMove} />

        <MapController
          onMapReady={handleMapReady}
          shelters={shelters}
          routePositions={sanitizedRoutePositions}
          userLocation={userLocation}
          center={center}
          zoom={zoom}
        />

        {/* ── Best-Route Line to Assigned Shelter or Hospital ── */}
        {sanitizedRoutePositions && sanitizedRoutePositions.length > 1 && (
          <Polyline
            positions={sanitizedRoutePositions}
            pathOptions={{
              color: activeHospitalRoute ? "#E11D48" : hazardBlocked ? "#D97706" : "#FF5A1F",
              weight: isFallback ? 3.5 : 4.5,
              opacity: 0.9,
              dashArray: hazardBlocked || isFallback ? "6, 8" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* ── "You Are Here" Live Device GPS Teardrop Pinpoint ── */}
        {userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng) && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createPinpointIcon({
              color: userLocation.isManual ? "#E0A96D" : "#F4845F",
              iconSvg: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>`,
              badgeText: userLocation.isManual ? "PIN" : "YOU",
              isPulse: !userLocation.isManual,
            })}
          >
            <Popup>
              <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "4px" }}>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1C1917]">
                  <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse" />
                  <span>{userLocation.isManual ? "Manual Pinned Position" : "Your Live GPS Position"}</span>
                </div>
                <div className="text-[10px] text-[#7A7268] font-mono mt-1">
                  Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}
                </div>
                {userLocation.accuracy && (
                  <div className="text-[9.5px] text-[#52B788] font-mono mt-0.5">
                    Accuracy: ±{Math.round(userLocation.accuracy)}m
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Hospital Teardrop Pinpoint Markers ── */}
        {showHospitals &&
          hospitalsList.map((hosp) => {
            if (typeof hosp.lat !== "number" || typeof hosp.lng !== "number") return null;

            return (
              <Marker
                key={hosp.id || `hosp-${hosp.lat}-${hosp.lng}`}
                position={[hosp.lat, hosp.lng]}
                icon={createPinpointIcon({
                  color: hosp.emergency ? "#E26D5C" : "#6C8DF6",
                  iconSvg: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`,
                  badgeText: hosp.emergency ? "ER" : undefined,
                })}
              >
                <Popup>
                  <HospitalPopup
                    hospital={hosp}
                    userLocation={userLocation}
                    onRouteToHospital={handleRouteToHospital}
                  />
                </Popup>
              </Marker>
            );
          })}

        {/* ── Shelter Teardrop Pinpoint Markers ── */}
        {shelters.map((shelter) => {
          const lat = Number(shelter.lat ?? shelter.latitude);
          const lng = Number(shelter.lng ?? shelter.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const pct = getOccupancyPct(shelter);
          const tier = getTier(pct);
          const colors = TIER_COLORS[tier];

          return (
            <Marker
              key={shelter.id || `shelter-${lat}-${lng}`}
              position={[lat, lng]}
              icon={createPinpointIcon({
                color: colors.fill,
                iconSvg: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
                badgeText: `${pct}%`,
              })}
            >
              <Popup>
                <ShelterPopup shelter={{ ...shelter, lat, lng }} pct={pct} tier={tier} />
              </Popup>
            </Marker>
          );
        })}

        {/* ── Hazard Teardrop Pinpoint Markers ── */}
        {hazards.map((hazard) => {
          if (typeof hazard.lat !== "number" || typeof hazard.lng !== "number") return null;

          return (
            <Marker
              key={hazard.id || `haz-${hazard.lat}-${hazard.lng}`}
              position={[hazard.lat, hazard.lng]}
              icon={createPinpointIcon({
                color: "#E26D5C",
                iconSvg: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`,
                badgeText: "!",
              })}
            >
              <Popup>
                <HazardPopup hazard={hazard} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hospital Popup Component
   ────────────────────────────────────────────── */

function HospitalPopup({ hospital, userLocation, onRouteToHospital }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const distKm =
    userLocation && typeof userLocation.lat === "number"
      ? haversineDistance(userLocation.lat, userLocation.lng, hospital.lat, hospital.lng).toFixed(1)
      : null;

  if (isMinimized) {
    return (
      <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "2px 4px" }} className="flex items-center justify-between gap-2.5 min-w-[200px] select-none">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0" />
          <span className="font-bold text-xs text-[#1C1917] truncate max-w-[125px]" title={hospital.name}>
            {hospital.name}
          </span>
          {distKm && (
            <span className="text-[10px] text-[#0284C7] font-mono font-bold shrink-0">
              {distKm}km
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expand Details"
          className="shrink-0 px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E5DCCE] hover:bg-stone-100 text-stone-700 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          <svg className="w-3 h-3 text-[#E11D48]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <span>Expand</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif", minWidth: 220, padding: "4px" }} className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1 text-[10px] text-[#0284C7] font-semibold uppercase tracking-wider font-mono">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Medical Facility</span>
          </div>
          <h3 className="font-bold text-sm text-[#1C1917] font-display m-0 leading-tight">
            {hospital.name}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0 mr-5">
          {hospital.emergency ? (
            <span className="px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#BE123C] border border-[#FDA4AF] text-[9.5px] font-bold font-mono uppercase">
              24/7 ER
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD] text-[9.5px] font-bold font-mono uppercase">
              General
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize Card"
            aria-label="Minimize Card"
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5DCCE] text-xs space-y-1">
        {distKm && (
          <div className="flex justify-between items-center text-[#1C1917]">
            <span className="text-[#78716C]">Distance:</span>
            <span className="font-bold font-mono text-[#0284C7]">{distKm} km</span>
          </div>
        )}

        {hospital.address && (
          <div className="text-[10.5px] text-[#78716C] truncate">
            {hospital.address}
          </div>
        )}

        {hospital.phone && (
          <div className="flex justify-between items-center pt-1 border-t border-[#E5DCCE]">
            <span className="text-[#78716C]">Phone:</span>
            <a
              href={`tel:${hospital.phone}`}
              className="text-[#16A34A] font-bold font-mono hover:underline"
            >
              {hospital.phone}
            </a>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRouteToHospital(hospital)}
        className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#BE123C] text-white text-xs font-bold shadow-xs hover:from-[#BE123C] hover:to-[#9F1239] transition-all cursor-pointer flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.314c-.317-.159-.69-.159-1.006 0L3.622 5.75c-.381.19-.622.58-.622 1.006v11.832c0 .836.88 1.38 1.628 1.006l4.875-2.437" />
        </svg>
        <span>Plot Driving Route</span>
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Shelter Popup Content with TideGauge
   ────────────────────────────────────────────── */

function ShelterPopup({ shelter, pct, tier }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const tierBg = {
    green: "bg-[#E7F6EC] text-[#16A34A]",
    yellow: "bg-[#FDF1DE] text-[#D97706]",
    red: "bg-[#FBE7E5] text-[#DC2626]",
  }[tier];

  if (isMinimized) {
    return (
      <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "2px 4px" }} className="flex items-center justify-between gap-2.5 min-w-[200px] select-none">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-bold text-xs text-[#1C1917] truncate max-w-[125px]" title={shelter.name}>
            {shelter.name}
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-600 shrink-0">{pct}%</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expand Details"
          className="shrink-0 px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E5DCCE] hover:bg-stone-100 text-stone-700 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <span>Expand</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif", minWidth: 210, padding: "4px" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-sm text-[#1C1917] font-display m-0 leading-tight pr-1">
          {shelter.name}
        </h3>
        <div className="flex items-center gap-1 shrink-0 mr-5">
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase ${tierBg}`}>
            {TIER_LABELS[tier]}
          </span>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize Card"
            aria-label="Minimize Card"
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 my-2.5 p-2 rounded-lg bg-[#F7F4EF] border border-[#E4DCCC]">
        <TideGauge
          occupancy={Number(shelter.currentOccupancy ?? 0)}
          capacity={Number(shelter.totalCapacity ?? 0)}
          height={56}
          width={13}
        />

        <div className="flex-1 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#7A7268]">Occupancy:</span>
            <span className="font-bold text-[#1C1917] font-mono">
              {Number(shelter.currentOccupancy ?? 0)} / {Number(shelter.totalCapacity ?? 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7A7268]">Available:</span>
            <span className="font-bold text-[#16A34A] font-mono">
              {Math.max(0, Number(shelter.totalCapacity ?? 0) - Number(shelter.currentOccupancy ?? 0))} space
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7A7268]">Level:</span>
            <span className="font-bold font-mono text-[#1C1917]">{pct}%</span>
          </div>
        </div>
      </div>

      {shelter.contactNumber && (
        <div className="text-[11px] text-[#7A7268] pt-1.5 border-t border-[#E4DCCC] flex items-center justify-between">
          <span>Contact Camp:</span>
          <a
            href={`tel:${shelter.contactNumber}`}
            className="text-[#FF5A1F] font-semibold font-mono hover:underline"
          >
            {shelter.contactNumber}
          </a>
        </div>
      )}
    </div>
  );
}

function HazardPopup({ hazard }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const typeLabels = {
    waterlogged: "Waterlogged Road",
    bridge_closed: "Bridge Closed",
    fallen_tree: "Fallen Tree / Debris",
    power_line: "Power Line Down",
  };

  const label = typeLabels[hazard.type] || hazard.type || "Road Hazard";
  const ai = hazard.aiAnalysis;
  const isAiVerified = Boolean(hazard.aiVerified || ai);

  if (isMinimized) {
    return (
      <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "2px 4px" }} className="flex items-center justify-between gap-2.5 min-w-[200px] select-none">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0 animate-pulse" />
          <span className="font-bold text-xs text-[#1C1917] truncate max-w-[125px]" title={ai?.title || label}>
            {ai?.title || label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expand Details"
          className="shrink-0 px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E5DCCE] hover:bg-stone-100 text-stone-700 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          <svg className="w-3 h-3 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <span>Expand</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif", minWidth: 230, padding: "4px" }} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DC2626] truncate">
            Road Blockage
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 mr-5">
          {isAiVerified ? (
            <span className="px-1.5 py-0.5 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] text-[9px] font-mono font-bold uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              <span>AI Verified</span>
            </span>
          ) : (
            <span className="text-[9.5px] font-mono text-[#797167]">Crowd Report</span>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize Card"
            aria-label="Minimize Card"
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm text-[#1C1917] font-display m-0 leading-tight">
          {ai?.title || label}
        </h3>
        {ai?.summary && (
          <p className="text-[10.5px] text-[#57534E] mt-1 leading-snug">
            {ai.summary}
          </p>
        )}
      </div>

      {ai?.waterDepth && (
        <div className="p-1.5 rounded-lg bg-[#E0F2FE] border border-[#BAE6FD] text-[10.5px] font-mono font-bold text-[#0369A1] flex items-center justify-between">
          <span>Inundation Depth:</span>
          <span>{ai.waterDepth.estimatedCm} cm ({ai.waterDepth.category})</span>
        </div>
      )}

      {ai?.vehiclePassability && (
        <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DCCE] text-[9.5px] font-mono space-y-0.5">
          <div className="text-[#797167] font-bold uppercase">Passability Clearance:</div>
          <div className="flex items-center justify-between text-[#DC2626]">
            <span>Sedans & 2-Wheelers:</span>
            <span className="font-bold">{ai.vehiclePassability.bikesAndSedans}</span>
          </div>
          <div className="flex items-center justify-between text-[#16A34A]">
            <span>NDRF Rescue Boats:</span>
            <span className="font-bold">{ai.vehiclePassability.zodiacBoats}</span>
          </div>
        </div>
      )}

      {!ai && (
        <div className="p-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B] space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold uppercase">Active Blockage</span>
          </div>
          <div className="flex justify-between">
            <span>Verified:</span>
            <span className="font-mono text-[10px]">Crowd-Reported</span>
          </div>
        </div>
      )}
    </div>
  );
}
