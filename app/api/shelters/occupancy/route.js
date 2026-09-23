import { NextResponse } from "next/server";
import { admin, getDb } from "@/lib/firebase-admin";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const shelterId = searchParams.get("shelterId");
  if (!shelterId) {
    return NextResponse.json({ error: "shelterId is required." }, { status: 400 });
  }
  const db = getDb();
  try {
    const snap = await db.collection("shelters").doc(shelterId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Shelter not found." }, { status: 404 });
    }
    const data = snap.data();
    return NextResponse.json({
      shelterId,
      currentOccupancy: data.currentOccupancy ?? 0,
      totalCapacity: data.totalCapacity ?? 0,
      occupancyHistory: data.occupancyHistory ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH & POST /api/shelters/occupancy
 *
 * Free-tier transaction-based delta merge handler for shelter occupancy.
 * Clamps result strictly to [0, capacity] without requiring Cloud Functions.
 */
export async function PATCH(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { shelterId, delta, occupancy, newOccupancy, deviceId, queuedAt } = body || {};
  const hasDelta = typeof delta === "number";
  const hasAbsolute = typeof occupancy === "number" || typeof newOccupancy === "number";

  if (!shelterId || (!hasDelta && !hasAbsolute)) {
    return NextResponse.json(
      { error: "shelterId and either numeric delta or occupancy are required." },
      { status: 400 }
    );
  }

  const db = getDb();
  const shelterRef = db.collection("shelters").doc(shelterId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(shelterRef);
      if (!snap.exists) {
        const initialCapacity = 500;
        const initialOccupancy = Math.max(0, Math.min(initialCapacity, hasDelta ? delta : (typeof occupancy === "number" ? occupancy : (newOccupancy || 0))));
        tx.set(shelterRef, {
          name: shelterId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          currentOccupancy: initialOccupancy,
          totalCapacity: initialCapacity,
          status: "open",
          occupancyHistory: [{
            value: initialOccupancy,
            delta: initialOccupancy,
            deviceId: deviceId || "sync_init",
            timestamp: admin.firestore.Timestamp.now(),
          }],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
          success: true,
          previousOccupancy: 0,
          currentOccupancy: initialOccupancy,
          wasClamped: false,
        };
      }

      const data = snap.data();
      const current = typeof data.currentOccupancy === "number" ? data.currentOccupancy : 0;
      const totalCapacity = typeof data.totalCapacity === "number" && data.totalCapacity > 0 ? data.totalCapacity : null;

      // Calculate candidate occupancy
      let candidate;
      if (hasAbsolute) {
        candidate = typeof occupancy === "number" ? occupancy : newOccupancy;
      } else {
        candidate = current + delta;
      }

      let clamped = candidate;

      if (clamped < 0) {
        clamped = 0;
      } else if (totalCapacity !== null && clamped > totalCapacity) {
        clamped = totalCapacity;
      }

      const history = Array.isArray(data.occupancyHistory) ? data.occupancyHistory : [];
      const updatedHistory = [
        ...history,
        {
          value: clamped,
          delta: hasDelta ? delta : clamped - current,
          deviceId: deviceId || "direct_client",
          timestamp: admin.firestore.Timestamp.now(),
        },
      ].slice(-25);

      tx.update(shelterRef, {
        currentOccupancy: clamped,
        occupancyHistory: updatedHistory,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        previousOccupancy: current,
        currentOccupancy: clamped,
        wasClamped: clamped !== candidate,
      };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "Shelter not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Shelter occupancy delta transaction error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update occupancy." },
      { status: 500 }
    );
  }
}

export const POST = PATCH;
