import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/sos/update-location
 *
 * Real-time GPS beacon update for active SOS distress alerts.
 * Updates the live coordinates of the alert so rescue fleets and district HQ
 * can track the moving location of citizens in distress.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { alertId, lat, lng, accuracy, speed, heading } = body || {};

    if (!alertId || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "alertId, lat, and lng are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const sosRef = db.collection("sos_alerts").doc(alertId);
    const docSnap = await sosRef.get();

    const timestamp =
      typeof FieldValue !== "undefined" && FieldValue.serverTimestamp
        ? FieldValue.serverTimestamp()
        : new Date().toISOString();

    const updateData = {
      lat,
      lng,
      liveLat: lat,
      liveLng: lng,
      accuracy: typeof accuracy === "number" ? accuracy : null,
      speed: typeof speed === "number" ? speed : null,
      heading: typeof heading === "number" ? heading : null,
      isLiveTracking: true,
      lastLiveLocationUpdate: timestamp,
      updatedAt: new Date().toISOString(),
    };

    if (docSnap && docSnap.exists) {
      await sosRef.update(updateData);
    } else {
      // If doc doesn't exist yet (e.g. initial raise in-flight or mock), create it
      await sosRef.set(
        {
          id: alertId,
          status: "open",
          raisedAt: timestamp,
          ...updateData,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      alertId,
      lat,
      lng,
      accuracy,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("SOS live location update API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update SOS live location." },
      { status: 500 }
    );
  }
}
