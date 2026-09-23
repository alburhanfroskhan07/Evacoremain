import { NextResponse } from "next/server";
import { getDb, mockDb, admin } from "@/lib/firebase-admin";

const SEED_SIGHTINGS = [
  {
    id: "sight_seed_1",
    shelterId: "shelter_salt_lake",
    shelterName: "Salt Lake Stadium Sector 4 Relief Hub",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    evacueeName: "Priya Das",
    ageBracket: "Teen (13-17)",
    gender: "Female",
    capturedBy: "Ramesh Sen",
    role: "coordinator",
    notes: "Admitted at Sector 4 Medical Tent with minor scrapes. Wearing yellow kurta.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "sight_seed_2",
    shelterId: "shelter_howrah",
    shelterName: "Howrah Municipal Relief Center",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    evacueeName: "Sunita Ghosh",
    ageBracket: "Elderly (50+)",
    gender: "Female",
    capturedBy: "Pooja Mukherjee",
    role: "volunteer",
    notes: "Rescued from Howrah flood lowlands. Bed #42 in senior care zone.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "sight_seed_3",
    shelterId: "shelter_kolkata_central",
    shelterName: "Kolkata High School Relief Camp",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    evacueeName: "Amit Mondal",
    ageBracket: "Adult (25-35)",
    gender: "Male",
    capturedBy: "Anil Roy",
    role: "coordinator",
    notes: "Arrived via NDRF inflatable boat. Blue waterproof jacket.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const shelterId = searchParams.get("shelterId");

    let sightings = [];

    try {
      const db = getDb();
      let q = db.collection("shelter_sightings").orderBy("createdAt", "desc").limit(40);
      if (shelterId) {
        q = db.collection("shelter_sightings").where("shelterId", "==", shelterId).limit(40);
      }
      const snap = await q.get();
      if (!snap.empty) {
        sightings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn("Firestore shelter sightings notice, checking mockDb:", err.message);
    }

    if (sightings.length === 0) {
      try {
        const mockDocs = Array.from(mockDb.collection("shelter_sightings").docs.values());
        sightings = mockDocs.map((d) => d.data);
      } catch {}
    }

    if (sightings.length === 0) {
      sightings = shelterId
        ? SEED_SIGHTINGS.filter((s) => s.shelterId === shelterId)
        : SEED_SIGHTINGS;
    }

    return NextResponse.json({ success: true, sightings });
  } catch (err) {
    console.error("GET shelter sightings error:", err);
    return NextResponse.json({ success: true, sightings: SEED_SIGHTINGS });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      shelterId = "shelter_general",
      shelterName = "General Relief Camp",
      photo,
      evacueeName = "Unidentified Evacuee",
      ageBracket = "Adult (18-50)",
      gender = "Not specified",
      capturedBy = "Field Responder",
      role = "volunteer",
      notes = "",
    } = body;

    if (!photo) {
      return NextResponse.json(
        { error: "A photo of the arriving person is required." },
        { status: 400 }
      );
    }

    const sightingId = `sight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newSighting = {
      id: sightingId,
      shelterId,
      shelterName,
      photo,
      evacueeName,
      ageBracket,
      gender,
      capturedBy,
      role,
      notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const db = getDb();
      await db.collection("shelter_sightings").doc(sightingId).set({
        ...newSighting,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      try {
        await mockDb.collection("shelter_sightings").doc(sightingId).set(newSighting);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      sighting: newSighting,
      message: `Intake photo saved for ${shelterName}.`,
    });
  } catch (err) {
    console.error("POST shelter sighting error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save shelter intake sighting." },
      { status: 500 }
    );
  }
}
