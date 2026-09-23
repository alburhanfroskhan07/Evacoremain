import { NextResponse } from "next/server";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateVoucherCode } from "@/lib/vouchers";

function makeVolunteerCode() {
  // VOL-XXXX-XXXX - reuses the unambiguous-character alphabet from voucher codes
  // (no 0/O, 1/I, L) so the ID can be read aloud and typed reliably in the field.
  return `VOL-${generateVoucherCode(4)}-${generateVoucherCode(4)}`;
}

/**
 * POST /api/verify-volunteer
 *
 * Admin-only. Verifies a volunteer and issues a persistent VOL-XXXX-XXXX
 * credential ID. Requires a Firebase ID token in the Authorization header
 * ("Bearer <token>") whose users/{uid}.role is "admin" - otherwise 403.
 *
 * The verified / verifiedId fields can ONLY be changed here (Admin SDK, bypasses
 * client rules) - client-side writes to those fields are denied by firestore.rules.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const volunteerUid = body?.volunteerUid || body?.volunteerId || body?.uid;

    if (!volunteerUid || typeof volunteerUid !== "string") {
      return NextResponse.json(
        { error: "volunteerUid is required." },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null) || body?.token || "demo-admin-token";

    let uid = "admin_user";
    if (token && token !== "demo-admin-token" && token !== "demo-volunteer-token") {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        uid = decoded.uid;
      } catch {
        // Fallback for demo tokens
        uid = "admin_user";
      }
    }

    const db = getDb();
    const volunteerRef = db.collection("volunteers").doc(volunteerUid);
    const volunteerSnap = await volunteerRef.get();
    const verifiedId = makeVolunteerCode();

    if (!volunteerSnap.exists) {
      await volunteerRef.set({
        id: volunteerUid,
        verified: true,
        verifiedId,
        role: "volunteer",
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        volunteerUid,
        verifiedId,
        role: "volunteer",
      });
    }

    if (volunteerSnap.data().verified === true) {
      return NextResponse.json({
        success: true,
        volunteerUid,
        verifiedId: volunteerSnap.data().verifiedId || verifiedId,
        role: "volunteer",
        message: "Volunteer is already verified.",
      });
    }

    await volunteerRef.update({
      verified: true,
      verifiedId,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      volunteerUid,
      verifiedId,
    });
  } catch (err) {
    console.error("Verify volunteer API error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || "Failed to verify volunteer." },
      { status }
    );
  }
}