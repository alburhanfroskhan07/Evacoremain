import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { findNearestHospital } from "@/lib/routing";
import { fetchNearbyHospitals } from "@/lib/hospitals";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radiusKm")) || 15;
  const preferEmergency = searchParams.get("preferEmergency") === "true";

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Valid lat and lng numbers are required." }, { status: 400 });
  }

  return handleNearestHospital({ lat, lng, preferEmergency, radiusKm });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { lat, lng, targetLat, targetLng, preferEmergency = false, radiusKm = 15 } = body || {};

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "Valid lat and lng numbers are required." },
      { status: 400 }
    );
  }

  // Direct route request to a specific hospital coordinate
  if (typeof targetLat === "number" && typeof targetLng === "number" && Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
    return handleDirectHospitalRoute({ lat, lng, targetLat, targetLng });
  }

  return handleNearestHospital({ lat, lng, preferEmergency, radiusKm });
}

async function handleDirectHospitalRoute({ lat, lng, targetLat, targetLng }) {
  const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
  const url = `${OSRM_BASE_URL}/route/v1/driving/${lng},${lat};${targetLng},${targetLat}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords = route.geometry?.coordinates || [];
        // Convert [lon, lat] from OSRM to [lat, lon] for Leaflet
        const routeGeometry = rawCoords.map(([lon, lat]) => [lat, lon]);

        return NextResponse.json({
          hospital: { lat: targetLat, lng: targetLng },
          routeGeometry,
          distanceKm: typeof route.distance === "number" ? Math.round(route.distance / 10) / 100 : null,
          durationSeconds: typeof route.duration === "number" ? Math.round(route.duration) : null,
          hazardBlocked: false,
        });
      }
    }
  } catch (err) {
    console.warn("Direct OSRM route timed out or failed, using straight-line corridor:", err.message);
  }

  // Instant fallback straight-line corridor
  const distKm = Math.round(haversine(lat, lng, targetLat, targetLng) * 10) / 10;
  return NextResponse.json({
    hospital: { lat: targetLat, lng: targetLng },
    routeGeometry: [[lat, lng], [targetLat, targetLng]],
    distanceKm: distKm,
    durationSeconds: Math.round((distKm / 35) * 3600),
    hazardBlocked: false,
    isFallback: true,
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function handleNearestHospital({ lat, lng, preferEmergency = false, radiusKm = 15 }) {
  try {
    // 1. Fetch nearby hospitals from Overpass API (or cache)
    const hospitals = await fetchNearbyHospitals(lat, lng, radiusKm);

    if (!hospitals || hospitals.length === 0) {
      return NextResponse.json({
        hospital: null,
        hospitals: [],
        message: "No hospitals found within search radius.",
      });
    }

    // 2. Fetch active road hazards to avoid blocked paths
    let activeHazards = [];
    try {
      const hazardsSnap = await getDb()
        .collection("hazards")
        .where("status", "==", "active")
        .get();
      activeHazards = hazardsSnap.docs.map((d) => ({
        id: d.id,
        lat: d.data().lat,
        lng: d.data().lng,
      }));
    } catch (e) {
      console.warn("Could not fetch hazards for hospital routing:", e.message);
    }

    // 3. Find nearest hospital with OSRM routing
    const nearest = await findNearestHospital(
      lat,
      lng,
      hospitals,
      preferEmergency,
      activeHazards
    );

    return NextResponse.json({
      hospital: nearest,
      hospitals,
      routeGeometry: nearest?.route?.geometry || null,
      distanceKm: nearest?.route?.distanceKm || nearest?.distanceKm || null,
      durationSeconds: nearest?.route?.durationSeconds || null,
      hazardBlocked: nearest?.hazardBlocked || false,
    });
  } catch (err) {
    console.error("Nearest hospital API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to find nearest hospital." },
      { status: 500 }
    );
  }
}
