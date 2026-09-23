import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { computeRouteDistances } from "@/lib/routing";

const MAX_CANDIDATES = 20;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * POST /api/route-distance
 *
 * Body: { evacueeLat, evacueeLng, shelterCandidates: [{ id, lat, lng }] }
 * shelterCandidates are expected to already be pre-filtered/shortlisted by
 * Haversine distance (see lib/routing.js).
 *
 * Returns the candidates sorted by real driving distance. Any candidate whose
 * OSRM call fails falls back to its straight-line (Haversine) distance, marked
 * routeUsed: false.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { evacueeLat, evacueeLng, shelterCandidates } = body || {};

  if (!isFiniteNumber(evacueeLat) || !isFiniteNumber(evacueeLng)) {
    return NextResponse.json(
      { error: "evacueeLat and evacueeLng must be numbers." },
      { status: 400 }
    );
  }

  if (!Array.isArray(shelterCandidates) || shelterCandidates.length === 0) {
    return NextResponse.json(
      { error: "shelterCandidates must be a non-empty array." },
      { status: 400 }
    );
  }

  if (shelterCandidates.length > MAX_CANDIDATES) {
    return NextResponse.json(
      { error: `shelterCandidates is limited to ${MAX_CANDIDATES} entries.` },
      { status: 400 }
    );
  }

  const hasInvalid = shelterCandidates.some(
    (c) =>
      typeof c?.id !== "string" ||
      !isFiniteNumber(c?.lat) ||
      !isFiniteNumber(c?.lng)
  );
  if (hasInvalid) {
    return NextResponse.json(
      { error: "Each candidate must have id, lat and lng." },
      { status: 400 }
    );
  }

  // Active hazards affect routing: candidates whose OSRM route passes within
  // 150m of an active hazard are pushed to the bottom of the results.
  const hazardsSnap = await getDb()
    .collection("hazards")
    .where("status", "==", "active")
    .get();
  const activeHazards = hazardsSnap.docs.map((d) => ({
    id: d.id,
    lat: d.data().lat,
    lng: d.data().lng,
  }));

  const results = await computeRouteDistances(
    evacueeLat,
    evacueeLng,
    shelterCandidates,
    activeHazards
  );

  return NextResponse.json(
    { evacueeLat, evacueeLng, results, rankedCandidates: results },
    { status: 200 }
  );
}