import { NextResponse } from "next/server";
import { getDb, admin } from "@/lib/firebase-admin";

/**
 * GET /api/volunteers
 * Returns district volunteers list. Supports ?status=pending or ?status=verified or ?status=all.
 * Used by Admin panel for immediate, guaranteed volunteer list sync without client rule delays.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status"); // "pending" | "verified" | "all"

    const db = getDb();
    const snap = await db.collection("volunteers").get();

    const all = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        uid: data.uid || d.id,
        ...data,
      };
    });

    // Sort by createdAt / registeredAt desc (newest first)
    all.sort((a, b) => {
      const timeA = a.createdAt?._seconds || a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?._seconds || b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    const pending = all.filter((v) => v.verified === false || v.status === "pending_verification");
    const verified = all.filter((v) => v.verified === true || v.status === "verified");

    let result = all;
    if (statusParam === "pending") {
      result = pending;
    } else if (statusParam === "verified") {
      result = verified;
    }

    return NextResponse.json({
      success: true,
      volunteers: result,
      pending,
      verified,
      totalCount: all.length,
      pendingCount: pending.length,
      verifiedCount: verified.length,
    });
  } catch (err) {
    console.error("GET /api/volunteers error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch volunteers." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/volunteers
 * Registers a new volunteer or updates an existing volunteer profile.
 * Saves via Admin SDK directly, guaranteeing storage in Firestore/mockDb even if client SDK fails.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const uid = body?.uid || body?.id;

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { error: "A valid volunteer uid is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const docRef = db.collection("volunteers").doc(uid);
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? existingSnap.data() : {};

    const payload = {
      uid,
      name: body.name ? String(body.name).trim() : (existing.name || "Community Volunteer"),
      phone: body.phone ? String(body.phone).trim() : (existing.phone || ""),
      email: body.email ? String(body.email).trim().toLowerCase() : (existing.email || ""),
      resourceType: body.resourceType || existing.resourceType || "other",
      lat: typeof body.lat === "number" ? body.lat : (typeof existing.lat === "number" ? existing.lat : 22.5726),
      lng: typeof body.lng === "number" ? body.lng : (typeof existing.lng === "number" ? existing.lng : 88.3639),
      available: typeof body.available === "boolean" ? body.available : (typeof existing.available === "boolean" ? existing.available : true),
      verified: existing.verified === true ? true : false,
      verifiedId: existing.verifiedId || null,
      dispatchedToSosId: existing.dispatchedToSosId || null,
      status: existing.verified === true ? "verified" : (existing.status || "pending_verification"),
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
    };

    if (!existingSnap.exists) {
      payload.createdAt = admin?.firestore?.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
      payload.registeredAt = payload.createdAt;
    }

    await docRef.set(payload, { merge: true });

    // Also ensure users/{uid} has role = "volunteer" if email was provided
    if (payload.email) {
      try {
        await db.collection("users").doc(uid).set({
          email: payload.email,
          role: "volunteer",
          updatedAt: payload.updatedAt,
        }, { merge: true });
      } catch (userErr) {
        console.warn("Could not sync users/{uid} for volunteer:", userErr);
      }
    }

    return NextResponse.json({
      success: true,
      volunteer: { id: uid, ...payload },
      message: "Volunteer profile registered successfully and submitted for admin verification.",
    });
  } catch (err) {
    console.error("POST /api/volunteers error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register volunteer profile." },
      { status: 500 }
    );
  }
}
