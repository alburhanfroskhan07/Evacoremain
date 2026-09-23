import { NextResponse } from "next/server";
import { getDb, mockDb, admin } from "@/lib/firebase-admin";

/**
 * POST /api/reunification/[id]/decision
 *
 * Coordinator and Admin verification endpoint for AI Family Matches.
 * Records whether the missing person was actually found ("mila") or not ("nahi_mila").
 */
export async function POST(req, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Alert ID is required." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { decision, notes = "", verifiedBy = "Camp Coordinator", role = "coordinator" } = body;

    if (!decision || (decision !== "mila" && decision !== "nahi_mila")) {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'mila' (found) or 'nahi_mila' (not found)." },
        { status: 400 }
      );
    }

    const newStatus = decision === "mila" ? "confirmed_found" : "not_found";

    const updateData = {
      id,
      status: newStatus,
      decision,
      notes,
      verifiedBy,
      verifiedRole: role,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reunited: decision === "mila",
    };

    try {
      const db = getDb();
      const alertRef = db.collection("reunification_alerts").doc(id);
      const snap = await alertRef.get();
      if (!snap.exists) {
        await alertRef.set(updateData, { merge: true });
      } else {
        await alertRef.update(updateData);
      }
    } catch (dbErr) {
      // Graceful fallback to mockDb
      const mockDoc = mockDb.collection("reunification_alerts").doc(id);
      await mockDoc.set(updateData, { merge: true });
    }

    return NextResponse.json({
      success: true,
      id,
      status: newStatus,
      decision,
      verifiedBy,
      message: decision === "mila"
        ? "Family match confirmed as Reunited (Mila)!"
        : "Match marked as Not Found (Nahi Mila). Search continues.",
    });
  } catch (err) {
    console.error("Reunification decision API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record reunification decision." },
      { status: 500 }
    );
  }
}
