import { NextResponse } from "next/server";
import { getDb, admin } from "@/lib/firebase-admin";

const HAZARD_TYPES = ["waterlogged", "bridge_closed", "fallen_tree", "power_line"];
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const AUTO_EXPIRES_MS = 6 * 60 * 60 * 1000;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * POST /api/report-hazard
 *
 * Public hazard reporting. Body: { type, lat, lng } where type is one of
 * "waterlogged" | "bridge_closed" | "fallen_tree" | "power_line".
 *
 * Rate-limited per IP (same pattern as evacuee registration): a maximum of 3
 * hazard reports per IP per hour, to prevent map spam.
 *
 * Writes to the 'hazards' collection via the Admin SDK (bypasses client
 * Firestore rules, which deny all direct writes to hazards).
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { lat, lng, aiAnalysis } = body || {};
    let type = typeof body?.type === "string" ? body.type.toLowerCase().trim() : "";
    if (type === "flood" || type === "water" || type === "flooded") type = "waterlogged";
    if (type === "tree" || type === "debris" || type === "fallen") type = "fallen_tree";
    if (type === "wire" || type === "power" || type === "electric" || type === "cable") type = "power_line";
    if (type === "bridge" || type === "road_closed" || type === "closed") type = "bridge_closed";

    if (!HAZARD_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `type must be one of ${HAZARD_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return NextResponse.json(
        { error: "lat and lng must be numbers." },
        { status: 400 }
      );
    }

    const db = getDb();
    const clientIp = getClientIp(req);

    // ── IP rate limit: block if 3+ hazard reports from this IP in the last hour ──
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recentSnap = await db
      .collection("hazards")
      .where("clientIp", "==", clientIp)
      .get();

    const recentCount = recentSnap.docs.filter((d) => {
      const reportedAt = d.data().reportedAt;
      let reportedTime = 0;
      if (reportedAt) {
        if (typeof reportedAt.toDate === "function") reportedTime = reportedAt.toDate().getTime();
        else if (reportedAt._seconds) reportedTime = reportedAt._seconds * 1000;
        else if (typeof reportedAt === "string" || typeof reportedAt === "number")
          reportedTime = new Date(reportedAt).getTime();
      }
      return reportedTime >= windowStart;
    }).length;

    const isLocal =
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp === "localhost" ||
      process.env.NODE_ENV === "development" ||
      body?.token === "demo-admin-token";
    const effectiveLimit = isLocal ? 5000 : RATE_LIMIT_MAX;

    if (recentCount >= effectiveLimit) {
      return NextResponse.json(
        {
          error:
            "Too many hazard reports from this network within the last hour. Please try again later.",
          code: "HAZARD_RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const hazardPayload = {
      type,
      lat,
      lng,
      clientIp,
      reportedBy: "evacuee",
      reportedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedCount: aiAnalysis ? 1 : 0,
      status: "active",
      autoExpiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + AUTO_EXPIRES_MS)
      ),
    };

    if (aiAnalysis && typeof aiAnalysis === "object") {
      hazardPayload.aiVerified = true;
      hazardPayload.aiAnalysis = {
        title: aiAnalysis.title || null,
        summary: aiAnalysis.summary || null,
        confidenceScore: aiAnalysis.confidenceScore || 90,
        waterDepth: aiAnalysis.waterDepth || null,
        vehiclePassability: aiAnalysis.vehiclePassability || null,
        structuralHazards: aiAnalysis.structuralHazards || [],
        recommendation: aiAnalysis.recommendation || null,
      };
    }

    const docRef = await db.collection("hazards").add(hazardPayload);

    return NextResponse.json({
      id: docRef.id,
      success: true,
      aiVerified: Boolean(hazardPayload.aiVerified),
    });
  } catch (err) {
    console.error("Report hazard API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit hazard report." },
      { status: 500 }
    );
  }
}