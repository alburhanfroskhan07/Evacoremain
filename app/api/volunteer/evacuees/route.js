import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Shared in-memory fallback store for rescue status updates during mock/offline runs
if (!globalThis.__VOLUNTEER_EVACUEE_STORE__) {
  globalThis.__VOLUNTEER_EVACUEE_STORE__ = new Map();
}

const DEFAULT_MOCK_EVACUEES = [
  {
    id: "evac-101",
    name: "Ananya Roy & Family",
    phone: "+91 98301 22415",
    familySize: 4,
    lat: 22.5852,
    lng: 88.4215,
    liveLat: 22.5852,
    liveLng: 88.4215,
    specialNeeds: ["infant", "medical"],
    missingFamilyMemberName: null,
    assignedShelterName: "Salt Lake Sector V Relief Camp",
    assignedShelterId: "shelter-saltlake-1",
    isSOS: true,
    sosTag: "Trapped in Water",
    urgencyLevel: "critical",
    rescueStatus: "pending",
    notes: "Ground floor flooded, family on terrace with 6-month-old infant.",
    registeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "evac-102",
    name: "Subhash Mondal",
    phone: "+91 98312 99042",
    familySize: 2,
    lat: 22.5714,
    lng: 88.3980,
    liveLat: 22.5714,
    liveLng: 88.3980,
    specialNeeds: ["elderly", "medical"],
    missingFamilyMemberName: null,
    assignedShelterName: "Beliaghata Community Health Center",
    assignedShelterId: "shelter-beliaghata-2",
    isSOS: true,
    sosTag: "Medical / Injured",
    urgencyLevel: "high",
    rescueStatus: "en_route",
    dispatchedVolunteerName: "Siddhartha Sen (Rescue Boat #3)",
    notes: "Elderly diabetic patient urgently requiring insulin cold storage.",
    registeredAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "evac-103",
    name: "Priya Das",
    phone: "+91 94330 55120",
    familySize: 3,
    lat: 22.5920,
    lng: 88.4060,
    liveLat: 22.5920,
    liveLng: 88.4060,
    specialNeeds: ["disability"],
    missingFamilyMemberName: "Anita Das (Daughter, 12 yrs)",
    assignedShelterName: "Ultadanga Emergency Youth Hostel",
    assignedShelterId: "shelter-ultadanga-3",
    isSOS: false,
    sosTag: null,
    urgencyLevel: "medium",
    rescueStatus: "pending",
    notes: "Wheelchair required for transit. Seeking missing daughter.",
    registeredAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: "evac-104",
    name: "Rafiqul Islam & Group",
    phone: "+91 97480 11988",
    familySize: 6,
    lat: 22.5645,
    lng: 88.3750,
    liveLat: 22.5645,
    liveLng: 88.3750,
    specialNeeds: ["pregnant", "infant"],
    missingFamilyMemberName: null,
    assignedShelterName: "Park Circus Relief Hub",
    assignedShelterId: "shelter-parkcircus-4",
    isSOS: true,
    sosTag: "Trapped in Flood",
    urgencyLevel: "critical",
    rescueStatus: "pending",
    notes: "Expecting mother in labor pains. Heavy water flow outside residence.",
    registeredAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: "evac-105",
    name: "Manju Banerjee",
    phone: "+91 98365 44321",
    familySize: 1,
    lat: 22.5800,
    lng: 88.4350,
    liveLat: 22.5800,
    liveLng: 88.4350,
    specialNeeds: ["elderly"],
    missingFamilyMemberName: null,
    assignedShelterName: "New Town Action Area I Shelter",
    assignedShelterId: "shelter-newtown-5",
    isSOS: false,
    sosTag: null,
    urgencyLevel: "low",
    rescueStatus: "located",
    dispatchedVolunteerName: "Rahul Sharma (4x4 Fleet)",
    notes: "Senior citizen living alone. First floor secure.",
    registeredAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

/**
 * GET /api/volunteer/evacuees
 * Returns all active evacuees, SOS distress beacons, and their live coordinates for field tracking.
 */
export async function GET() {
  try {
    const db = getDb();
    let evacueesList = [];

    if (db) {
      try {
        const evacSnap = await db.collection("evacuees").get();
        if (!evacSnap.empty) {
          evacueesList = evacSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Evacuee",
              phone: data.phone || data.contactNumber || null,
              familySize: Number(data.familySize || 1),
              lat: typeof data.liveLat === "number" ? data.liveLat : (typeof data.lat === "number" ? data.lat : 22.5726),
              lng: typeof data.liveLng === "number" ? data.liveLng : (typeof data.lng === "number" ? data.lng : 88.3639),
              liveLat: typeof data.liveLat === "number" ? data.liveLat : data.lat,
              liveLng: typeof data.liveLng === "number" ? data.liveLng : data.lng,
              specialNeeds: Array.isArray(data.specialNeeds) ? data.specialNeeds : [],
              missingFamilyMemberName: data.missingFamilyMemberName || null,
              assignedShelterName: data.assignedShelterName || null,
              assignedShelterId: data.assignedShelterId || null,
              isSOS: Boolean(data.isSOS || data.status === "emergency"),
              sosTag: data.sosTag || (data.isSOS ? "Emergency Distress" : null),
              urgencyLevel: data.urgencyLevel || (data.isSOS ? "critical" : "medium"),
              rescueStatus: data.rescueStatus || "pending",
              dispatchedVolunteerId: data.dispatchedVolunteerId || null,
              dispatchedVolunteerName: data.dispatchedVolunteerName || null,
              notes: data.notes || data.rawIntakeText || null,
              registeredAt: data.registeredAt ? (data.registeredAt.toDate ? data.registeredAt.toDate().toISOString() : data.registeredAt) : new Date().toISOString(),
            };
          });
        }
      } catch (err) {
        console.warn("Firestore evacuees fetch notice:", err);
      }
    }

    // Combine with mock data / updates to guarantee field volunteers always have active targets
    const memoryStore = globalThis.__VOLUNTEER_EVACUEE_STORE__;
    const combined = [...DEFAULT_MOCK_EVACUEES];

    // Overlay database records
    evacueesList.forEach((e) => {
      const idx = combined.findIndex((c) => c.id === e.id);
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...e };
      } else {
        combined.unshift(e);
      }
    });

    // Apply any in-memory status overrides (e.g. volunteer clicked "En Route" or "Rescued")
    const finalRecords = combined.map((item) => {
      const memoryOverride = memoryStore.get(item.id);
      return memoryOverride ? { ...item, ...memoryOverride } : item;
    });

    return NextResponse.json({
      success: true,
      count: finalRecords.length,
      evacuees: finalRecords,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Volunteer evacuees API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch evacuees for tracking." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/volunteer/evacuees
 * Updates an evacuee's field rescue status (e.g., 'en_route', 'located', 'rescued', 'escorted')
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { evacueeId, rescueStatus, volunteerName, volunteerId, notes } = body;

    if (!evacueeId || !rescueStatus) {
      return NextResponse.json(
        { error: "evacueeId and rescueStatus are required." },
        { status: 400 }
      );
    }

    const updatePayload = {
      rescueStatus,
      dispatchedVolunteerId: volunteerId || null,
      dispatchedVolunteerName: volunteerName || "Field Volunteer",
      rescueNotes: notes || null,
      lastStatusUpdate: new Date().toISOString(),
    };

    // 1. Update in-memory store
    globalThis.__VOLUNTEER_EVACUEE_STORE__.set(evacueeId, updatePayload);

    // 2. Update Firestore if accessible
    const db = getDb();
    if (db) {
      try {
        const ref = db.collection("evacuees").doc(evacueeId);
        const snap = await ref.get();
        if (snap.exists) {
          await ref.update({
            ...updatePayload,
            lastStatusUpdate: FieldValue.serverTimestamp(),
          });
        }
      } catch (dbErr) {
        console.warn("Firestore status update notice:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      evacueeId,
      ...updatePayload,
    });
  } catch (err) {
    console.error("Update rescue status API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update evacuee rescue status." },
      { status: 500 }
    );
  }
}
