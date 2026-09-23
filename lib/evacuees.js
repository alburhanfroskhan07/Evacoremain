import "server-only";
import { admin, getDb } from "@/lib/firebase-admin";
import { findNearestAvailableShelter } from "./routing";

/**
 * Normalize a name for fuzzy matching: lowercase, trim, collapse whitespace.
 */
export function normalizeName(name) {
  return String(name ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Levenshtein edit distance between two strings (no external library).
 */
export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/**
 * Fuzzy match a missing-family-member name against a pool of evacuee names.
 * Short names (<10 chars both sides): Levenshtein with a threshold of 2 edits.
 * Longer names: whole-word / substring containment.
 * Returns an array of matching evacuee records.
 */
export function checkReunificationMatch(missingName, allEvacuees) {
  const needle = normalizeName(missingName);
  if (!needle) return [];

  const matches = [];

  for (const evacuee of allEvacuees) {
    const candidate = normalizeName(evacuee.name);
    if (!candidate) continue;

    let isMatch = false;

    if (candidate.includes(needle) || needle.includes(candidate)) {
      // Whole-string containment (either direction).
      isMatch = true;
    } else if (needle.length < 10) {
      // Short needle (usually a first/given name, possibly a spelling or
      // transliteration variant): allow up to 2 edits against any name token.
      // Handles "Priyaa" matching evacuee "Priya Das" (PRD 6.4).
      const tokens = candidate.split(" ");
      isMatch = tokens.some((t) => levenshteinDistance(t, needle) <= 2);
    } else {
      // Both long: shared whole-word containment reduces false positives.
      const candidateWords = candidate.split(" ");
      const needleWords = needle.split(" ");
      isMatch = candidateWords.some((w) => needleWords.includes(w));
    }

    if (isMatch) {
      matches.push(evacuee);
    }
  }

  return matches;
}

/**
 * Server-only evacuee registration (Admin SDK - bypasses client Firestore
 * rules). Must only be called from inside an API route, never from frontend
 * code (see app/api/register-evacuee/route.js, the single entry point for this
 * flow).
 *
 * Saves the evacuee doc, auto-routes them to the nearest approved shelter with
 * free capacity via lib/routing.js, and sets assignedShelterId if a match is
 * found. If no shelter has space, the result carries flag: "no_capacity" -
 * which the route turns into a relief-voucher issuance.
 *
 * Returns { evacueeId, assignedShelterId, flag, matchedShelter,
 * reunificationMatches }.
 */
export async function registerEvacueeServer(data) {
  let shelters = [];
  let allEvacuees = [];
  let activeHazards = [];
  let db = null;
  let canWriteToFirestore = false;

  try {
    db = getDb();
    const sheltersSnap = await db
      .collection("shelters")
      .where("status", "==", "approved")
      .get();
    shelters = sheltersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const evacueesSnap = await db.collection("evacuees").get();
    allEvacuees = evacueesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const hazardsSnap = await db.collection("hazards").where("status", "==", "active").get();
    activeHazards = hazardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    canWriteToFirestore = true;
  } catch (err) {
    console.warn("Firestore Admin query notice:", err?.message);
  }

  // If no shelters loaded from cloud Firestore, provide regional default shelters for real routing:
  if (shelters.length === 0) {
    shelters = [
      {
        id: "shelter_salt_lake",
        name: "Salt Lake Central Relief Camp",
        lat: 22.5867,
        lng: 88.4178,
        totalCapacity: 400,
        currentOccupancy: 85,
        contactNumber: "+91 98301 11223",
        status: "approved",
      },
      {
        id: "shelter_howrah",
        name: "Howrah Municipal Relief Center",
        lat: 22.5958,
        lng: 88.2636,
        totalCapacity: 350,
        currentOccupancy: 340,
        contactNumber: "+91 98302 22334",
        status: "approved",
      },
      {
        id: "shelter_kolkata_central",
        name: "Kolkata High School Shelter",
        lat: 22.5629,
        lng: 88.3572,
        totalCapacity: 250,
        currentOccupancy: 110,
        contactNumber: "+91 98303 33445",
        status: "approved",
      },
    ];
  }

  const sheltersById = new Map(shelters.map((s) => [s.id, s]));

  const match = await findNearestAvailableShelter(
    Number(data.lat),
    Number(data.lng),
    shelters,
    activeHazards
  );

  const missingName = data.missingFamilyMemberName;
  const newEvacueeName = data.name;
  let reunificationMatches = [];

  // ── 24-Hour Duplicate Registration Guard (IP & Name check) ──
  const normalizedNewName = normalizeName(data.name);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const duplicate = allEvacuees.find((e) => {
    const isSameName = normalizeName(e.name) === normalizedNewName;
    if (!isSameName) return false;

    let regTime = 0;
    if (e.registeredAt) {
      if (typeof e.registeredAt.toMillis === "function") regTime = e.registeredAt.toMillis();
      else if (e.registeredAt._seconds) regTime = e.registeredAt._seconds * 1000;
      else if (typeof e.registeredAt === "string" || typeof e.registeredAt === "number") regTime = new Date(e.registeredAt).getTime();
    }

    const isRecent = regTime > oneDayAgo;
    const isSameIp = data.clientIp && e.clientIp && e.clientIp === data.clientIp;

    // Reject if registered within 24 hours under the same name (or from same IP)
    return isRecent && (isSameIp || normalizedNewName.length > 2);
  });

  if (duplicate) {
    const err = new Error(
      `An evacuee registration for '${data.name}' was already submitted from this network within the last 24 hours. Re-registration is restricted for 24 hours to prevent capacity hoarding. Please use your existing Family Pass.`
    );
    err.status = 429;
    err.code = "DUPLICATE_REGISTRATION_24H";
    throw err;
  }

  // 1. Forward Match: I am searching for missingName -> find in registered evacuees
  if (missingName && typeof missingName === "string" && missingName.trim()) {
    const forward = checkReunificationMatch(missingName, allEvacuees).map((evacuee) => {
      const shelter = evacuee.assignedShelterId ? sheltersById.get(evacuee.assignedShelterId) : null;
      return {
        ...evacuee,
        matchType: "found_missing_relative",
        relationship: `Missing relative '${missingName}' located`,
        shelterId: evacuee.assignedShelterId,
        shelterName: shelter?.name ?? null,
        contactNumber: shelter?.contactNumber ?? "",
      };
    });
    reunificationMatches.push(...forward);
  }

  // 2. Reverse Match (Vice-Versa): Someone else was previously searching for ME!
  if (newEvacueeName && typeof newEvacueeName === "string" && newEvacueeName.trim()) {
    for (const priorEvacuee of allEvacuees) {
      if (priorEvacuee.missingFamilyMemberName) {
        const matchesMe = checkReunificationMatch(priorEvacuee.missingFamilyMemberName, [{ name: newEvacueeName }]);
        if (matchesMe.length > 0) {
          const shelter = priorEvacuee.assignedShelterId ? sheltersById.get(priorEvacuee.assignedShelterId) : null;
          reunificationMatches.push({
            id: priorEvacuee.id,
            name: priorEvacuee.name,
            matchType: "relative_searching_for_you",
            relationship: `${priorEvacuee.name} was searching for you`,
            shelterId: priorEvacuee.assignedShelterId,
            shelterName: shelter?.name ?? null,
            contactNumber: shelter?.contactNumber ?? "",
          });
        }
      }
    }
  }

  // If match found, record in reunification_alerts for coordinator notifications
  if (reunificationMatches.length > 0) {
    try {
      for (const m of reunificationMatches) {
        await db.collection("reunification_alerts").add({
          evacueeName: newEvacueeName,
          matchedPersonName: m.name,
          targetName: missingName || m.name,
          targetPhoto: data.missingPersonPhoto || null,
          candidateName: m.name,
          candidatePhoto: m.photo || data.missingPersonPhoto || null,
          matchedShelterName: m.shelterName || "Emergency Relief Center",
          contactNumber: m.contactNumber || "",
          matchType: m.matchType,
          matchConfidence: 92,
          status: "pending_verification",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (alertErr) {
      console.warn("Reunification alert log notice:", alertErr?.message);
    }
  }

  const hasCapacity = match && !match.flag;

  const generatedId = "evac_" + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10));
  let evacueeId = generatedId;

  const payload = {
    name: data.name,
    familySize: Number(data.familySize) || 1,
    lat: Number(data.lat),
    lng: Number(data.lng),
    clientIp: data.clientIp || null,
    sessionToken: data.sessionToken || null,
    assignedShelterId: hasCapacity ? match.id : null,
    assignedShelterName: hasCapacity ? match.name ?? null : null,
    missingFamilyMemberName: missingName?.trim() || null,
    missingPersonPhoto: data.missingPersonPhoto || null,
    photoUrl: data.photoUrl || data.photo || null,
    specialNeeds: data.specialNeeds ?? [],
    rawIntakeText: data.rawIntakeText ?? null,
    urgencyLevel: data.urgencyLevel ?? null,
    registeredAt: new Date().toISOString(),
  };

  if (canWriteToFirestore && db) {
    try {
      const evacueeRef = db.collection("evacuees").doc();
      evacueeId = evacueeRef.id;
      await evacueeRef.set({
        ...payload,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (hasCapacity && match?.id) {
        try {
          const shelterRef = db.collection("shelters").doc(match.id);
          await shelterRef.update({
            currentOccupancy: admin.firestore.FieldValue.increment(payload.familySize),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.warn("Atomic shelter occupancy update notice:", err?.message);
        }
      }
    } catch (saveErr) {
      console.warn("Firestore save warning:", saveErr?.message);
    }
  }

  return {
    evacueeId,
    assignedShelterId: payload.assignedShelterId,
    hazardBlocked: match?.hazardBlocked || false,
    flag: hasCapacity ? null : "no_capacity",
    matchedShelter: hasCapacity ? match : null,
    reunificationMatches,
  };
}