import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/evacuee/update-location - Step B22 / F21
 *
 * Opt-in live GPS beacon for rescue fleets to locate displaced citizens in distress.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { evacueeId, sessionToken, lat, lng } = body;

    if (!evacueeId || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Invalid location telemetry payload." },
        { status: 400 }
      );
    }

    const db = getDb();
    const evacueeRef = db.collection("evacuees").doc(evacueeId);
    const docSnap = await evacueeRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Evacuee record not found." },
        { status: 404 }
      );
    }

    await evacueeRef.update({
      liveLat: lat,
      liveLng: lng,
      isSharingLocation: true,
      lastLiveLocationUpdate: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        evacueeId,
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Live location update API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update evacuee location." },
      { status: 500 }
    );
  }
}