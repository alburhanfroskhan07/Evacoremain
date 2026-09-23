import { NextResponse } from "next/server";
import { getDb, mockDb } from "@/lib/firebase-admin";

const DEFAULT_SEED_ALERTS = [
  {
    id: "reunif_seed_priya",
    targetName: "Priya Das",
    relationship: "Daughter (14 yrs)",
    targetPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    candidateName: "Priya (Admitted Evacuee #412)",
    candidatePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    matchedShelterName: "Salt Lake Stadium Sector 4 Relief Hub",
    shelterId: "shelter_salt_lake",
    contactNumber: "+91 98300 11223",
    matchConfidence: 94,
    status: "pending_verification",
    visualAnalysis: {
      facialSimilarity: "High (94%) - matching facial symmetry, cheekbone structure, and eye shape",
      clothingMatch: "Yellow/ochre traditional kurta with dark dupatta matches reported intake wardrobe",
      estimatedAge: "13-15 years (Consistent with 14 years reported)",
      distinctiveFeatures: "Small beauty mark on upper right cheek, braided shoulder-length hair",
      locationContext: "Spotted in Sector 4 Medical Triage tent during morning relief ration distribution",
    },
    reasoning: "AI Vision analysis confirms high facial structure correspondence (94% confidence). Wardrobe colors and adolescent age bracket align perfectly with the reported missing person intake profile.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "reunif_seed_sunita",
    targetName: "Sunita Ghosh",
    relationship: "Mother (52 yrs)",
    targetPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    candidateName: "Sunita G. (Senior Intake)",
    candidatePhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    matchedShelterName: "Howrah Municipal Relief Center",
    shelterId: "shelter_howrah",
    contactNumber: "+91 98302 22334",
    matchConfidence: 89,
    status: "pending_verification",
    visualAnalysis: {
      facialSimilarity: "Very Strong (89%) - identical nasal bridge and jawline geometry",
      clothingMatch: "Maroon cotton saree with floral printed border matching family report",
      estimatedAge: "50-55 years",
      distinctiveFeatures: "Silver spectacles, hair tied in high bun, silver wrist bangle",
      locationContext: "Registered at Howrah Elderly Shelter Zone, Bed #42",
    },
    reasoning: "High biometric concordance on facial landmarks and glasses. Clothing matches reported attire during flood evacuation from Howrah lowlands.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "reunif_seed_amit",
    targetName: "Amit Mondal",
    relationship: "Brother (28 yrs)",
    targetPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    candidateName: "Amit M. (Rescued Pedestrian)",
    candidatePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    matchedShelterName: "Kolkata High School Shelter",
    shelterId: "shelter_kolkata_central",
    contactNumber: "+91 98303 33445",
    matchConfidence: 91,
    status: "confirmed_found",
    reunited: true,
    verifiedBy: "Coordinator Mukherjee",
    visualAnalysis: {
      facialSimilarity: "Strong (91%) - matching brow line, beard pattern, and ear geometry",
      clothingMatch: "Navy blue rain jacket over grey t-shirt",
      estimatedAge: "26-30 years",
      distinctiveFeatures: "Trimmed stubble beard, athletic build",
      locationContext: "Evacuated by NDRF boat from flooded Sector 5 overpass",
    },
    reasoning: "Facial contour matching and rescue boat timestamp confirm strong identity match with registered missing relative query.",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function GET() {
  try {
    const db = getDb();
    let snap;
    try {
      snap = await db.collection("reunification_alerts").get();
    } catch (dbErr) {
      snap = await mockDb.collection("reunification_alerts").get();
    }

    if (snap && !snap.empty) {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt,
        updatedAt: d.data().updatedAt?.toDate ? d.data().updatedAt.toDate().toISOString() : d.data().updatedAt,
      }));

      // If less than 2 alerts in DB, merge seed alerts
      const existingIds = new Set(list.map((a) => a.id));
      const merged = [...list];
      for (const s of DEFAULT_SEED_ALERTS) {
        if (!existingIds.has(s.id)) merged.push(s);
      }

      return NextResponse.json({ alerts: merged });
    }

    return NextResponse.json({ alerts: DEFAULT_SEED_ALERTS });
  } catch (err) {
    return NextResponse.json({ alerts: DEFAULT_SEED_ALERTS });
  }
}
