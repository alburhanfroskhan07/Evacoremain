import { NextResponse } from "next/server";
import { getDb, admin } from "@/lib/firebase-admin";

const DEFAULT_SUPPLY_ITEMS = [
  { itemId: "drinking_water", itemName: "Drinking Water" },
  { itemId: "food", itemName: "Food" },
  { itemId: "baby_formula", itemName: "Baby Formula" },
  { itemId: "first_aid", itemName: "First Aid / Medicine" },
  { itemId: "blankets", itemName: "Blankets" },
  { itemId: "oxygen", itemName: "Oxygen" },
];

/**
 * GET /api/shelters
 * Returns all active and approved shelters.
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function GET() {
  try {
    const db = getDb();
    const snap = await db.collection("shelters").get();
    const shelters = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.status !== "rejected" && s.status !== "closed");

    return NextResponse.json({ shelters });
  } catch (err) {
    console.error("GET /api/shelters error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch shelters" }, { status: 500 });
  }
}

/**
 * POST /api/shelters
 * Registers a new shelter and auto-seeds default supply docs.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, lat, lng, totalCapacity, currentOccupancy, contactNumber, coordinatorUid } = body || {};

    if (!name || typeof lat !== "number" || typeof lng !== "number" || typeof totalCapacity !== "number") {
      return NextResponse.json(
        { error: "Name, lat, lng, and totalCapacity are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const shelterRef = db.collection("shelters").doc();

    const payload = {
      name: name.trim(),
      lat: Number(lat),
      lng: Number(lng),
      totalCapacity: Number(totalCapacity),
      currentOccupancy: Number(currentOccupancy || 0),
      contactNumber: contactNumber ? String(contactNumber).trim() : "",
      coordinatorUid: coordinatorUid || "coordinator_assigned",
      status: "approved", // Auto-approved on creation so it appears live across district grid
      occupancyHistory: [
        { value: Number(currentOccupancy || 0), timestamp: admin.firestore.Timestamp.now() },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    batch.set(shelterRef, payload);

    // Seed default supplies subcollection
    const suppliesRef = shelterRef.collection("supplies");
    for (const item of DEFAULT_SUPPLY_ITEMS) {
      batch.set(suppliesRef.doc(item.itemId), {
        itemName: item.itemName,
        status: "adequate",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        shelterName: name.trim(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      id: shelterRef.id,
      ...payload,
    });
  } catch (err) {
    console.error("POST /api/shelters error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register shelter." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shelters
 * Admin/Coordinator endpoint to update any camp's fields (name, capacity, occupancy, status, contact, amenities, etc.)
 */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { shelterId, ...updates } = body || {};

    if (!shelterId || typeof shelterId !== "string") {
      return NextResponse.json({ error: "shelterId is required." }, { status: 400 });
    }

    const db = getDb();
    const shelterRef = db.collection("shelters").doc(shelterId);
    const snap = await shelterRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Shelter not found." }, { status: 404 });
    }

    const payload = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updates.totalCapacity !== undefined) {
      payload.totalCapacity = Number(updates.totalCapacity) || 0;
    }

    if (updates.currentOccupancy !== undefined) {
      const occ = Number(updates.currentOccupancy) || 0;
      payload.currentOccupancy = occ;
      const existingHistory = Array.isArray(snap.data()?.occupancyHistory)
        ? snap.data().occupancyHistory
        : [];
      payload.occupancyHistory = [
        ...existingHistory,
        { value: occ, timestamp: admin.firestore.Timestamp.now() },
      ].slice(-20);
    }

    await shelterRef.update(payload);

    return NextResponse.json({
      success: true,
      shelter: { id: shelterId, ...payload },
    });
  } catch (err) {
    console.error("PATCH /api/shelters error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update shelter." },
      { status: 500 }
    );
  }
}
