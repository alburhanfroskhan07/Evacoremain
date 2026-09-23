import { NextResponse } from "next/server";
import { registerEvacueeServer } from "@/lib/evacuees";
import { generateVoucher } from "@/lib/vouchers";

/**
 * POST /api/register-evacuee
 *
 * Single entry point for evacuee registration + relief-voucher issuance. Uses
 * the Admin SDK exclusively - there is no client-side write path to the
 * 'evacuees' or 'vouchers' collections for this flow.
 *
 * Body: { name, familySize, lat, lng, missingFamilyMemberName, specialNeeds,
 *         rawIntakeText }
 *
 * Response: { evacueeId, assignedShelterId, ... } plus voucherCode and
 * expiresAt only when every nearby shelter was at full capacity
 * (flag: "no_capacity" from registerEvacueeServer).
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const name = body?.name || body?.fullName;
    const { lat, lng } = body || {};

    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required." },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Opt-in live-location sharing (Step B22): a random session token issued
    // ONLY to the registering evacuee's own device via this direct API response.
    // It is stored on the evacuee doc so the update-location endpoint can
    // authenticate the device. It is never surfaced in admin/coordinator-facing
    // reads or responses. The frontend must only share location when the user
    // explicitly opts in (off by default).
    const sessionToken = globalThis.crypto?.randomUUID?.() ?? null;

    const result = await registerEvacueeServer({ ...body, clientIp, sessionToken });

    // The OSRM route geometry ([lng, lat] pairs) for the assigned shelter lets
    // the frontend draw the actual best route. It is null when the shelter was
    // assigned purely by Haversine fallback (OSRM unavailable/timeout) - this
    // is a REAL degradation, not an edge case: the frontend must fall back to
    // drawing a straight line in that case. hazardBlocked mirrors Step B8's
    // flag so the frontend can warn if the final assignment passes a hazard.
    const route = result.matchedShelter?.route ?? null;
    const base = {
      evacueeId: result.evacueeId,
      assignedShelterId: result.assignedShelterId,
      assignedShelterName: result.matchedShelter?.name ?? null,
      assignedShelterLat: result.matchedShelter?.lat ?? null,
      assignedShelterLng: result.matchedShelter?.lng ?? null,
      assignedShelterContact: result.matchedShelter?.contactNumber ?? null,
      assignedShelterCapacity: result.matchedShelter?.totalCapacity ?? null,
      assignedShelterOccupancy: result.matchedShelter?.currentOccupancy ?? null,
      distanceKm: result.matchedShelter?.distanceKm ?? null,
      durationSeconds: route?.durationSeconds ?? null,
      routeGeometry: route?.geometry ?? null,
      hazardBlocked: result.matchedShelter?.hazardBlocked ?? false,
      reunificationMatches: result.reunificationMatches ?? [],
    };

    let voucherCode = null;
    let expiresAt = null;

    if (result.flag === "no_capacity") {
      const voucher = await generateVoucher(result.evacueeId);
      voucherCode = voucher.voucherCode;
      expiresAt = voucher.expiresAt;
    }

    return NextResponse.json({
      ...base,
      sessionToken,
      voucherCode,
      voucher: voucherCode ? { code: voucherCode, expiresAt } : null,
      expiresAt,
      flag: result.flag,
    });
  } catch (err) {
    console.error("Register evacuee API error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || "Failed to process evacuee registration.", code: err.code },
      { status }
    );
  }
}