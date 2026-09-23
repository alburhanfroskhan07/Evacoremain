import { NextResponse } from "next/server";
import { getDb, admin } from "@/lib/firebase-admin";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Hazard ID is required." }, { status: 400 });
    }

    const db = getDb();
    const hazardRef = db.collection("hazards").doc(id);
    const snap = await hazardRef.get();

    if (!snap.exists) {
      await hazardRef.set(
        {
          id,
          type: "waterlogged",
          status: "active",
          verifiedCount: 2,
          reportedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({ success: true, verifiedCount: 2 });
    }

    const currentData = snap.data();
    const newCount = (currentData.verifiedCount || 0) + 1;

    const updates = {
      verifiedCount: admin.firestore.FieldValue.increment(1),
    };

    // Crowd-verification: once 3 people verify, extend the hazard's life by
    // another 6 hours from now.
    if (newCount >= 3) {
      updates.autoExpiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 6 * 60 * 60 * 1000)
      );
    }

    await hazardRef.update(updates);

    return NextResponse.json({ success: true, verifiedCount: newCount });
  } catch (err) {
    console.error("Verify hazard API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify hazard." },
      { status: 500 }
    );
  }
}
