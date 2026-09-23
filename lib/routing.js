import "server-only";
import { haversineDistance } from "./geo";

export { haversineDistance } from "./geo";

const ROUTE_CANDIDATE_LIMIT = 5;
// Overridable so tests/dev can point at a local OSRM mock.
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
const OSRM_TIMEOUT_MS = 8000;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Driving route from the evacuee to a candidate shelter via the public OSRM
 * demo server. OSRM expects coordinates as longitude,latitude. Requests the
 * full route geometry (overview=full) so hazard-blocking can inspect the path.
 */
async function osrmRouteDistance(evacueeLat, evacueeLng, lat, lng) {
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${lng},${lat};${evacueeLng},${evacueeLat}` +
    `?overview=full&geometries=geojson&steps=false&annotations=false`;

  const res = await Promise.race([
    fetch(url, { cache: "no-store" }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OSRM request timed out")), OSRM_TIMEOUT_MS)
    ),
  ]);

  if (!res.ok) {
    throw new Error(`OSRM responded with status ${res.status}.`);
  }

  const data = await res.json();
  if (
    data.code !== "Ok" ||
    !Array.isArray(data.routes) ||
    data.routes.length === 0
  ) {
    throw new Error(`OSRM returned code ${data.code ?? "unknown"}.`);
  }

  const route = data.routes[0];
  const coordinates = Array.isArray(route.geometry?.coordinates)
    ? route.geometry.coordinates
    : Array.isArray(route.geometry)
    ? route.geometry
    : null;

  return {
    distanceKm:
      typeof route.distance === "number" ? Math.round(route.distance / 10) / 100 : null,
    durationSeconds: typeof route.duration === "number" ? route.duration : null,
    geometry: coordinates,
  };
}

const HAZARD_PROXIMITY_KM = 0.15; // 150 meters

/**
 * Distance from a point to a segment, in km, computed in a local
 * equirectangular plane (accurate for the sub-100 km distances here). Checking
 * hazards against the whole segment (not just the sampled vertices) catches a
 * hazard that sits between consecutive OSRM geometry points - point-sampling
 * alone misses those, which breaks hazard-blocked routing in production.
 */
export function pointToSegmentDistanceKm(aLat, aLng, bLat, bLng, pLat, pLng) {
  const R = 6371;
  const cosLat = Math.cos((pLat * Math.PI) / 180);
  const toX = (lng) => ((lng * Math.PI) / 180) * R * cosLat;
  const toY = (lat) => ((lat * Math.PI) / 180) * R;

  const ax = toX(aLng);
  const ay = toY(aLat);
  const bx = toX(bLng);
  const by = toY(bLat);
  const px = toX(pLng);
  const py = toY(pLat);

  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / lenSq;
  const tt = Math.max(0, Math.min(1, t));

  const cx = ax + tt * abx;
  const cy = ay + tt * aby;
  return Math.hypot(px - cx, py - cy);
}

/**
 * True if any segment of the route geometry passes within 150m of an active
 * hazard. Route coordinates come from OSRM as [lng, lat] pairs; hazards are
 * { lat, lng }.
 */
export function isRouteHazardBlocked(routeCoordinates, activeHazards) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
    return false;
  }
  if (!Array.isArray(activeHazards) || activeHazards.length === 0) {
    return false;
  }

  for (const hazard of activeHazards) {
    if (!isFiniteNumber(hazard?.lat) || !isFiniteNumber(hazard?.lng)) continue;
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const [lng1, lat1] = routeCoordinates[i];
      const [lng2, lat2] = routeCoordinates[i + 1];
      if (
        !isFiniteNumber(lng1) ||
        !isFiniteNumber(lat1) ||
        !isFiniteNumber(lng2) ||
        !isFiniteNumber(lat2)
      ) {
        continue;
      }
      if (
        pointToSegmentDistanceKm(lat1, lng1, lat2, lng2, hazard.lat, hazard.lng) <=
        HAZARD_PROXIMITY_KM
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Compute real driving distances from an evacuee to each candidate shelter via
 * OSRM. Any candidate whose OSRM call fails falls back to its straight-line
 * (Haversine) distance, marked routeUsed: false. Returns the candidates sorted
 * by driving distance (Haversine for failed candidates), with hazard-blocked
 * candidates pushed to the bottom (hazardBlocked: true).
 *
 * Server-side only - candidates are expected to be already shortlisted by
 * Haversine distance.
 */
export async function computeRouteDistances(
  evacueeLat,
  evacueeLng,
  shelterCandidates,
  activeHazards = []
) {
  const results = await Promise.all(
    shelterCandidates.map(async (candidate) => {
      const haversineKm = haversineDistance(
        evacueeLat,
        evacueeLng,
        candidate.lat,
        candidate.lng
      );

      let distanceKm = haversineKm;
      let durationSeconds = null;
      let routeUsed = false;
      let hazardBlocked = false;
      let geometry = null;

      try {
        const route = await osrmRouteDistance(
          evacueeLat,
          evacueeLng,
          candidate.lat,
          candidate.lng
        );
        if (route.distanceKm !== null) {
          distanceKm = route.distanceKm;
          durationSeconds = route.durationSeconds;
          routeUsed = true;
          hazardBlocked = isRouteHazardBlocked(route.geometry, activeHazards);
          geometry = route.geometry;
        }
      } catch {
        // OSRM unavailable for this candidate - fall back to Haversine order.
      }

      return {
        id: candidate.id,
        haversineKm,
        distanceKm,
        durationSeconds,
        routeUsed,
        hazardBlocked,
        geometry,
      };
    })
  );

  // Hazard-blocked candidates sink to the bottom; safe candidates keep the
  // closest-first order. A blocked shelter is only assigned if every candidate
  // is blocked (i.e. results[0] is itself hazardBlocked).
  results.sort(
    (a, b) =>
      Number(a.hazardBlocked) - Number(b.hazardBlocked) ||
      a.distanceKm - b.distanceKm
  );

  return results;
}

/**
 * Returns the nearest shelter with free capacity (currentOccupancy <
 * totalCapacity), or { flag: "no_capacity" } if none have space.
 *
 * First narrows to the top N candidates by straight-line (Haversine) distance,
 * then refines with real road routing (OSRM, via computeRouteDistances). Any
 * candidate whose OSRM route passes within 150m of an active hazard is
 * deprioritized (hazardBlocked: true) - a hazard-blocked shelter is only
 * assigned if every candidate is blocked.
 */
export async function findNearestAvailableShelter(evacueeLat, evacueeLng, shelters, hazards = []) {
  const available = shelters
    .filter(
      (s) =>
        typeof s.currentOccupancy === "number" &&
        typeof s.totalCapacity === "number" &&
        s.currentOccupancy < s.totalCapacity
    )
    .map((s) => ({
      ...s,
      distanceKm: haversineDistance(evacueeLat, evacueeLng, s.lat, s.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (available.length === 0) {
    return { flag: "no_capacity" };
  }

  const topCandidates = available.slice(0, ROUTE_CANDIDATE_LIMIT);

  try {
    const results = await computeRouteDistances(
      evacueeLat,
      evacueeLng,
      topCandidates.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })),
      hazards
    );

    if (Array.isArray(results) && results.length > 0) {
      const routeByShelterId = new Map(results.map((r) => [r.id, r]));
      const best = [...topCandidates].sort((a, b) => {
        const routeA = routeByShelterId.get(a.id) ?? {};
        const routeB = routeByShelterId.get(b.id) ?? {};
        return (
          Number(routeA.hazardBlocked) - Number(routeB.hazardBlocked) ||
          (routeA.distanceKm ?? a.distanceKm) - (routeB.distanceKm ?? b.distanceKm)
        );
      })[0];

      return {
        ...best,
        route: routeByShelterId.get(best.id) ?? null,
        hazardBlocked: routeByShelterId.get(best.id)?.hazardBlocked ?? false,
      };
    }
  } catch {
    // Routing unavailable - fall back to Haversine order.
  }

  return topCandidates[0];
}

/**
 * Returns the nearest hospital to a given coordinate, with optional ER capability prioritization.
 * Reuses OSRM road routing and Haversine fallback from shelter routing.
 *
 * @param {number} userLat - Evacuee / Patient Latitude
 * @param {number} userLng - Evacuee / Patient Longitude
 * @param {Array} hospitals - Array of hospital objects { id, name, lat, lng, emergency, phone }
 * @param {boolean} preferEmergency - If true, prioritizes ER-tagged hospitals within 15km
 * @param {Array} hazards - Active road hazards to avoid
 * @returns {Promise<Object|null>} Nearest hospital object with route details, or null
 */
export async function findNearestHospital(
  userLat,
  userLng,
  hospitals = [],
  preferEmergency = false,
  hazards = []
) {
  if (!Array.isArray(hospitals) || hospitals.length === 0) return null;

  // 1. Calculate Haversine distance for all hospitals
  const scored = hospitals
    .filter((h) => isFiniteNumber(h.lat) && isFiniteNumber(h.lng))
    .map((h) => ({
      ...h,
      distanceKm: haversineDistance(userLat, userLng, h.lat, h.lng),
    }));

  if (scored.length === 0) return null;

  // 2. ER Prioritization: If preferEmergency is true, prioritize emergency=true within 15km
  let pool = scored;
  if (preferEmergency) {
    const erHospitals = scored.filter((h) => h.emergency === true && h.distanceKm <= 15);
    if (erHospitals.length > 0) {
      pool = erHospitals;
    }
  }

  pool.sort((a, b) => a.distanceKm - b.distanceKm);
  const topCandidates = pool.slice(0, ROUTE_CANDIDATE_LIMIT);

  // 3. Compute real road routing via OSRM
  try {
    const results = await computeRouteDistances(
      userLat,
      userLng,
      topCandidates.map((h) => ({ id: h.id, lat: h.lat, lng: h.lng })),
      hazards
    );

    if (Array.isArray(results) && results.length > 0) {
      const routeByHospId = new Map(results.map((r) => [r.id, r]));
      const best = [...topCandidates].sort((a, b) => {
        const routeA = routeByHospId.get(a.id) ?? {};
        const routeB = routeByHospId.get(b.id) ?? {};
        return (
          Number(routeA.hazardBlocked) - Number(routeB.hazardBlocked) ||
          (routeA.distanceKm ?? a.distanceKm) - (routeB.distanceKm ?? b.distanceKm)
        );
      })[0];

      return {
        ...best,
        route: routeByHospId.get(best.id) ?? null,
        hazardBlocked: routeByHospId.get(best.id)?.hazardBlocked ?? false,
      };
    }
  } catch {
    // Fall back to Haversine order
  }

  return {
    ...topCandidates[0],
    route: null,
    hazardBlocked: false,
  };
}