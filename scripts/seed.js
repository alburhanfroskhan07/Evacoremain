/**
 * Demo seed script - one-off, run locally (never deployed).
 *
 * Seeds 6 shelters (2 green / 2 yellow / 2 red occupancy tiers), 10 evacuees
 * (2 with missingFamilyMemberName for reunification-matching tests), 3 vouchers
 * (1 unused / 1 used / 1 expired), and 2 SOS alerts.
 *
 * Idempotent: every doc is tagged `isSeedData: true`. Re-running first deletes
 * all previously-seeded docs, then writes a fresh set.
 *
 * Usage:
 *   node scripts/seed.js          # seed Firestore
 *   node scripts/seed.js --dry-run  # validate dataset without touching Firestore
 *
 * Requires either FIREBASE_SERVICE_ACCOUNT (single-line JSON string) or
 * GOOGLE_APPLICATION_CREDENTIALS (path to a service account key file).
 */

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const SEED_COORDINATOR_UID = "seed-coordinator-demo";
const SEED_TAG = true;

/* ──────────────────────────────────────────────
   Admin SDK init (mirrors lib/firebase-admin.js)
   ────────────────────────────────────────────── */

function initAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  let serviceAccount = null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      console.error(
        "\nFIREBASE_SERVICE_ACCOUNT is not valid JSON. It must be the contents of your service account key file as a single-line JSON string (escape private-key newlines as \\n)."
      );
      console.error(
        "Alternatively set GOOGLE_APPLICATION_CREDENTIALS to the path of a service account key file.\n"
      );
      process.exit(1);
    }
  }

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

/* ──────────────────────────────────────────────
   Data
   ────────────────────────────────────────────── */

function hoursAgo(hours) {
  return admin.firestore.Timestamp.fromMillis(Date.now() - hours * 60 * 60 * 1000);
}

// [value, hoursAgo] per entry, ending at the shelter's current occupancy.
const SHELTERS = [
  {
    name: "Salt Lake Community Hall",
    lat: 22.5806,
    lng: 88.411,
    totalCapacity: 200,
    currentOccupancy: 45,
    contactNumber: "+91 98765 43210",
    history: [
      [38, 24],
      [42, 6],
      [45, 1],
    ],
  },
  {
    name: "Kalyani Flood Relief Center",
    lat: 22.975,
    lng: 88.4345,
    totalCapacity: 300,
    currentOccupancy: 60,
    contactNumber: "+91 99887 76655",
    history: [
      [52, 30],
      [55, 12],
      [60, 2],
    ],
  },
  {
    name: "Rajarhat Relief Camp",
    lat: 22.5958,
    lng: 88.4695,
    totalCapacity: 150,
    currentOccupancy: 120,
    contactNumber: "+91 91234 56789",
    history: [
      [95, 24],
      [110, 8],
      [120, 2],
    ],
  },
  {
    name: "Howrah Railway Relief Camp",
    lat: 22.5855,
    lng: 88.3415,
    totalCapacity: 500,
    currentOccupancy: 380,
    contactNumber: "+91 98310 11223",
    history: [
      [300, 36],
      [350, 10],
      [380, 3],
    ],
  },
  {
    name: "Newtown Shelter Block-C",
    lat: 22.613,
    lng: 88.465,
    totalCapacity: 80,
    currentOccupancy: 78,
    contactNumber: "+91 87654 32100",
    history: [
      [70, 12],
      [75, 5],
      [78, 1],
    ],
  },
  {
    name: "Barasat Emergency Shelter",
    lat: 22.7225,
    lng: 88.481,
    totalCapacity: 120,
    currentOccupancy: 115,
    contactNumber: "+91 93456 78901",
    history: [
      [98, 18],
      [110, 6],
      [115, 2],
    ],
  },
];

// Mirror of lib/supplies.js DEFAULT_SUPPLY_ITEMS (kept local - lib/supplies.js
// pulls in the client SDK, which this server-side script must not).
const SEED_SUPPLY_ITEMS = [
  { itemId: "drinking_water", itemName: "Drinking Water" },
  { itemId: "food", itemName: "Food" },
  { itemId: "baby_formula", itemName: "Baby Formula" },
  { itemId: "first_aid", itemName: "First Aid / Medicine" },
  { itemId: "blankets", itemName: "Blankets" },
  { itemId: "oxygen", itemName: "Oxygen" },
];

// Per-shelter supply status overrides (itemId -> status) so the admin Resource
// Priority board is non-empty on demo day. Every other item is "adequate".
const SUPPLY_STATUS_OVERRIDES = {
  2: { drinking_water: "critical" }, // Rajarhat Relief Camp
  4: { food: "low" }, // Newtown Shelter Block-C
};

// Sample active hazards near seeded shelters so the hazard map and
// hazard-blocked routing have something to show. autoExpiresAt is set relative
// to seed time so the docs behave like real reports.
const SEED_HAZARDS = [
  {
    id: "seed-hazard-1",
    type: "waterlogged",
    lat: 22.5816,
    lng: 88.4106,
    clientIp: "203.0.113.10",
    reportedBy: "evacuee",
    verifiedCount: 2,
    status: "active",
    autoExpiresInHours: 5,
  },
  {
    id: "seed-hazard-2",
    type: "bridge_closed",
    lat: 22.5809,
    lng: 88.4142,
    clientIp: "203.0.113.11",
    reportedBy: "evacuee",
    verifiedCount: 3,
    status: "active",
    autoExpiresInHours: 3,
  },
];

// One verified (dispatch-ready) and one pending (admin verification queue)
// volunteer, so both states are visible on demo day.
const SEED_VOLUNTEERS = [
  {
    uid: "seed-volunteer-verified",
    name: "Demo Verified Volunteer",
    phone: "+91 90000 11111",
    resourceType: "boat",
    lat: 22.5795,
    lng: 88.4095,
    available: true,
    verified: true,
    verifiedId: "VOL-DEMO-7Q2M",
    status: "available",
  },
  {
    uid: "seed-volunteer-pending",
    name: "Demo Pending Volunteer",
    phone: "+91 90000 22222",
    resourceType: "medical",
    lat: 22.577,
    lng: 88.412,
    available: true,
    verified: false,
    verifiedId: null,
    status: "pending_verification",
  },
];

// Single district alert row (fixed id "current") so the weather banner renders
// without waiting on a live OpenWeatherMap call.
const SEED_DISTRICT_ALERT = {
  id: "current",
  severity: "orange",
  headline:
    "Weather alert: strong winds up to 43 km/h possible over the next 12 hours.",
  source: "Seed Data",
  weather: { condition: "thunderstorm", windKmh: 43, rainMM: 8 },
};

// shelterIdx references SHELTERS order (0..5).
const EVACUEES = [
  {
    name: "Priya Das",
    familySize: 4,
    lat: 22.5812,
    lng: 88.4121,
    shelterIdx: 0,
    specialNeeds: ["elderly"],
    urgencyLevel: "medium",
  },
  {
    name: "Rina Sen",
    familySize: 5,
    lat: 22.596,
    lng: 88.47,
    shelterIdx: 2,
    specialNeeds: ["infant"],
    urgencyLevel: "low",
  },
  {
    name: "Arun Das",
    familySize: 2,
    lat: 22.5799,
    lng: 88.4102,
    shelterIdx: 0,
    specialNeeds: null,
    urgencyLevel: "low",
  },
  {
    name: "Sunita Ghosh",
    familySize: 6,
    lat: 22.584,
    lng: 88.34,
    shelterIdx: 3,
    specialNeeds: ["pregnant", "medical"],
    urgencyLevel: "high",
  },
  {
    name: "Raju Mondal",
    familySize: 3,
    lat: 22.976,
    lng: 88.435,
    shelterIdx: 1,
    specialNeeds: null,
    urgencyLevel: "low",
  },
  {
    name: "Maya Banerjee",
    familySize: 8,
    lat: 22.723,
    lng: 88.482,
    shelterIdx: 5,
    specialNeeds: ["medical"],
    urgencyLevel: "high",
    missingFamilyMemberName: "Priyaa", // fuzzy-matches "Priya Das"
  },
  {
    name: "Farhan Sheikh",
    familySize: 4,
    lat: 22.612,
    lng: 88.464,
    shelterIdx: 2,
    specialNeeds: null,
    urgencyLevel: "medium",
    rawIntakeText:
      "Mera parivar 4 log hai, hum Newtown phase 3 ke paas hai, zyada ho gaya paani.",
  },
  {
    name: "Prakash Kumar",
    familySize: 2,
    lat: 22.594,
    lng: 88.468,
    shelterIdx: 2,
    specialNeeds: ["disability"],
    urgencyLevel: "medium",
  },
  {
    name: "Amit Malakar",
    familySize: 5,
    lat: 22.586,
    lng: 88.342,
    shelterIdx: 3,
    specialNeeds: null,
    urgencyLevel: "medium",
    missingFamilyMemberName: "Sunita", // matches "Sunita Ghosh"
  },
  {
    name: "Kamala Rani",
    familySize: 3,
    lat: 22.58,
    lng: 88.41,
    shelterIdx: 0,
    specialNeeds: ["medical"],
    urgencyLevel: "low",
  },
];

// evacueeIdx references EVACUEES order (0..9).
const VOUCHERS = [
  {
    code: "RELIEF-A1B2-C3D4",
    status: "unused",
    evacueeIdx: 9,
    expiresInHours: 72,
    redeemedAt: null,
    redeemedByShopId: null,
  },
  {
    code: "RELIEF-X7Y8-Z9W0",
    status: "used",
    evacueeIdx: 4,
    expiresInHours: 72,
    redeemedAt: hoursAgo(5),
    redeemedByShopId: "shop-saltlake-01",
  },
  {
    code: "RELIEF-K2L3-M4N5",
    status: "expired",
    evacueeIdx: 6,
    expiresInHours: -3,
    redeemedAt: null,
    redeemedByShopId: null,
  },
];

const SOS_ALERTS = [
  {
    lat: 22.581,
    lng: 88.412,
    message:
      "Water rising rapidly, 3 senior citizens trapped on balcony without insulin.",
    urgencyLevel: "high",
    category: "medical",
    status: "open",
    raisedAt: hoursAgo(0.5),
  },
  {
    lat: 22.614,
    lng: 88.462,
    message:
      "Roof damaged during storm, family of 4 needs immediate evacuation boat.",
    urgencyLevel: "medium",
    category: "trapped",
    status: "open",
    raisedAt: hoursAgo(1.5),
  },
];

/* ──────────────────────────────────────────────
   Seed logic
   ────────────────────────────────────────────── */

async function clearSeedData(db) {
  const collections = [
    "shelters",
    "evacuees",
    "vouchers",
    "sos_alerts",
    "volunteers",
    "hazards",
  ];
  let total = 0;
  for (const name of collections) {
    const snap = await db.collection(name).where("isSeedData", "==", true).get();
    if (snap.size === 0) continue;
    const batch = db.batch();
    if (name === "shelters") {
      // Deleting a parent doc does NOT cascade to its supplies subcollection,
      // so clear supplies explicitly before removing the shelter.
      for (const doc of snap.docs) {
        const suppliesSnap = await doc.ref.collection("supplies").get();
        suppliesSnap.docs.forEach((s) => batch.delete(s.ref));
      }
    }
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Cleared ${snap.size} seed doc(s) from "${name}".`);
    total += snap.size;
  }

  // district_alerts/current - fixed doc id, single row per district.
  const alertRef = db.collection("district_alerts").doc("current");
  const alertSnap = await alertRef.get();
  if (alertSnap.exists && alertSnap.data().isSeedData === true) {
    await alertRef.delete();
    console.log('Cleared 1 seed doc from "district_alerts".');
    total += 1;
  }

  if (total === 0) {
    console.log("No existing seed data to clear.");
  }
}

async function seedShelters(db) {
  console.log("\nSeeding shelters…");
  const shelterRefs = [];
  for (let i = 0; i < SHELTERS.length; i++) {
    const s = SHELTERS[i];
    const ref = db.collection("shelters").doc();
    await ref.set({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      totalCapacity: s.totalCapacity,
      currentOccupancy: s.currentOccupancy,
      contactNumber: s.contactNumber,
      coordinatorUid: SEED_COORDINATOR_UID,
      status: "approved",
      occupancyHistory: s.history.map(([value, ago]) => ({
        value,
        timestamp: hoursAgo(ago),
      })),
      isSeedData: SEED_TAG,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    shelterRefs.push(ref.id);
    const tier = tierOf(s);
    console.log(`  [${tier}] ${s.name} (${ref.id}) - ${s.currentOccupancy}/${s.totalCapacity}`);

    // Seed the shelter's 6 default supply items (Phase 2: resource priority).
    const overrides = SUPPLY_STATUS_OVERRIDES[i] || {};
    for (const item of SEED_SUPPLY_ITEMS) {
      await ref.collection("supplies").doc(item.itemId).set({
        itemName: item.itemName,
        status: overrides[item.itemId] || "adequate",
        updatedAt: FieldValue.serverTimestamp(),
        shelterName: s.name,
        isSeedData: SEED_TAG,
      });
    }
  }
  return shelterRefs;
}

async function seedEvacuees(db, shelterRefs) {
  console.log("\nSeeding evacuees…");
  const evacueeRefs = [];
  for (const e of EVACUEES) {
    const ref = db.collection("evacuees").doc();
    await ref.set({
      name: e.name,
      familySize: e.familySize,
      lat: e.lat,
      lng: e.lng,
      assignedShelterId: shelterRefs[e.shelterIdx],
      missingFamilyMemberName: e.missingFamilyMemberName ?? null,
      rawIntakeText: e.rawIntakeText ?? null,
      specialNeeds: e.specialNeeds ?? null,
      urgencyLevel: e.urgencyLevel ?? null,
      isSeedData: SEED_TAG,
      registeredAt: hoursAgo(6),
    });
    evacueeRefs.push(ref.id);
    const note = e.missingFamilyMemberName
      ? ` - missing: ${e.missingFamilyMemberName}`
      : "";
    console.log(`  ${e.name} (${ref.id})${note}`);
  }
  return evacueeRefs;
}

async function seedVouchers(db, evacueeRefs) {
  console.log("\nSeeding vouchers…");
  for (const v of VOUCHERS) {
    const ref = db.collection("vouchers").doc();
    await ref.set({
      code: v.code,
      evacueeId: evacueeRefs[v.evacueeIdx],
      status: v.status,
      issuedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + v.expiresInHours * 60 * 60 * 1000),
      redeemedAt: v.redeemedAt,
      redeemedByShopId: v.redeemedByShopId,
      isSeedData: SEED_TAG,
    });
    console.log(`  ${v.code} (${v.status}) - ${ref.id}`);
  }
}

async function seedSosAlerts(db) {
  console.log("\nSeeding SOS alerts…");
  for (const a of SOS_ALERTS) {
    const ref = db.collection("sos_alerts").doc();
    await ref.set({
      lat: a.lat,
      lng: a.lng,
      message: a.message,
      urgencyLevel: a.urgencyLevel,
      category: a.category,
      status: a.status,
      raisedAt: a.raisedAt,
      isSeedData: SEED_TAG,
    });
    console.log(`  [${a.urgencyLevel}] ${a.category} - ${ref.id}`);
  }
}

async function seedHazards(db) {
  console.log("\nSeeding hazards…");
  for (const h of SEED_HAZARDS) {
    await db.collection("hazards").doc(h.id).set({
      type: h.type,
      lat: h.lat,
      lng: h.lng,
      clientIp: h.clientIp,
      reportedBy: h.reportedBy,
      reportedAt: hoursAgo(0.5),
      verifiedCount: h.verifiedCount,
      status: h.status,
      autoExpiresAt: new Date(Date.now() + h.autoExpiresInHours * 60 * 60 * 1000),
      isSeedData: SEED_TAG,
    });
    console.log(`  [${h.type}] ${h.lat}, ${h.lng} - ${h.id}`);
  }
}

async function seedVolunteers(db) {
  console.log("\nSeeding volunteers…");
  for (const v of SEED_VOLUNTEERS) {
    const ref = db.collection("volunteers").doc(v.uid);
    await ref.set({
      uid: v.uid,
      name: v.name,
      phone: v.phone,
      resourceType: v.resourceType,
      lat: v.lat,
      lng: v.lng,
      available: v.available,
      verified: v.verified,
      verifiedId: v.verifiedId,
      dispatchedToSosId: null,
      status: v.status,
      registeredAt: hoursAgo(12),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isSeedData: SEED_TAG,
    });
    console.log(`  ${v.name} (${v.uid}) - verified: ${v.verified}`);
  }
}

async function seedDistrictAlert(db) {
  console.log("\nSeeding district alert…");
  const now = new Date();
  await db.collection("district_alerts").doc(SEED_DISTRICT_ALERT.id).set({
    severity: SEED_DISTRICT_ALERT.severity,
    headline: SEED_DISTRICT_ALERT.headline,
    windowStart: now,
    windowEnd: new Date(now.getTime() + 12 * 60 * 60 * 1000),
    source: SEED_DISTRICT_ALERT.source,
    lastUpdated: FieldValue.serverTimestamp(),
    weather: SEED_DISTRICT_ALERT.weather,
    isSeedData: SEED_TAG,
  });
  console.log(`  severity=${SEED_DISTRICT_ALERT.severity} (${SEED_DISTRICT_ALERT.id})`);
}

/* ──────────────────────────────────────────────
   Main
   ────────────────────────────────────────────── */

function tierOf(s) {
  const pct = s.currentOccupancy / s.totalCapacity;
  return pct > 0.95 ? "red" : pct > 0.7 ? "yellow" : "green";
}

/**
 * Local-only sanity check (--dry-run): validates the dataset without touching
 * Firestore, so it can run even when no credentials are configured.
 */
async function verifySeedData() {
  const tierCounts = { green: 0, yellow: 0, red: 0 };
  for (const s of SHELTERS) tierCounts[tierOf(s)] += 1;
  console.log("Shelter tiers:", tierCounts);

  const shelterCount = SHELTERS.length;
  const evacueeCount = EVACUEES.length;

  for (let i = 0; i < EVACUEES.length; i++) {
    const e = EVACUEES[i];
    if (e.shelterIdx < 0 || e.shelterIdx >= shelterCount) {
      throw new Error(`evacuee #${i} (${e.name}) has out-of-range shelterIdx ${e.shelterIdx}`);
    }
    for (const h of SHELTERS[e.shelterIdx].history) {
      if (h[1] < 0) throw new Error(`shelter history has a future timestamp (hoursAgo < 0)`);
    }
  }
  for (let i = 0; i < VOUCHERS.length; i++) {
    const v = VOUCHERS[i];
    if (v.evacueeIdx < 0 || v.evacueeIdx >= evacueeCount) {
      throw new Error(`voucher #${i} (${v.code}) has out-of-range evacueeIdx ${v.evacueeIdx}`);
    }
  }

  // Phase 2 data checks
  for (const [shelterIdx, overrides] of Object.entries(SUPPLY_STATUS_OVERRIDES)) {
    const idx = Number(shelterIdx);
    if (idx < 0 || idx >= shelterCount) {
      throw new Error(`SUPPLY_STATUS_OVERRIDES references out-of-range shelter ${idx}`);
    }
    for (const itemId of Object.keys(overrides)) {
      if (!SEED_SUPPLY_ITEMS.some((i) => i.itemId === itemId)) {
        throw new Error(`SUPPLY_STATUS_OVERRIDES references unknown itemId "${itemId}"`);
      }
    }
  }
  for (const h of SEED_HAZARDS) {
    if (typeof h.lat !== "number" || typeof h.lng !== "number") {
      throw new Error(`hazard ${h.id} must have numeric lat/lng`);
    }
  }
  for (const v of SEED_VOLUNTEERS) {
    if (!v.uid || typeof v.uid !== "string") {
      throw new Error(`volunteer entry missing uid`);
    }
    if (v.verified && !/^VOL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v.verifiedId)) {
      throw new Error(`volunteer ${v.uid} verified but verifiedId "${v.verifiedId}" is not VOL-XXXX-XXXX`);
    }
    if (!v.verified && v.verifiedId != null) {
      throw new Error(`volunteer ${v.uid} unverified but has verifiedId "${v.verifiedId}"`);
    }
  }
  if (!["red", "orange", "yellow", "none"].includes(SEED_DISTRICT_ALERT.severity)) {
    throw new Error(`SEED_DISTRICT_ALERT severity "${SEED_DISTRICT_ALERT.severity}" is invalid`);
  }

  const missingPairs = EVACUEES.filter((e) => e.missingFamilyMemberName).map((e) => ({
    from: e.name,
    missing: e.missingFamilyMemberName,
    // candidate: any other evacuee whose name contains the missing name or is within 2 edits of a token
    candidates: EVACUEES.filter((o) => o.name !== e.name)
      .filter((o) => {
        const a = String(o.name).toLowerCase();
        const b = String(e.missingFamilyMemberName).toLowerCase();
        if (a.includes(b) || b.includes(a)) return true;
        return o.name
          .split(" ")
          .some((tok) => levenshtein(tok.toLowerCase(), b) <= 2);
      })
      .map((o) => o.name),
  }));
  console.log("Reunification test pairs:");
  for (const p of missingPairs) {
    console.log(`  ${p.from} missing "${p.missing}" → candidates: ${p.candidates.join(", ") || "NONE (check!)"}`);
  }

  console.log("\nDry-run OK. Data is internally consistent.");
}

function levenshtein(a, b) {
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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    await verifySeedData();
    return;
  }

  initAdmin();
  const db = getFirestore();

  console.log("Clearing prior seed data…");
  await clearSeedData(db);

  const shelterRefs = await seedShelters(db);
  const evacueeRefs = await seedEvacuees(db, shelterRefs);
  await seedVouchers(db, evacueeRefs);
  await seedSosAlerts(db);
  await seedHazards(db);
  await seedVolunteers(db);
  await seedDistrictAlert(db);

  console.log("\nDone. Seed data ready for demo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nSeed failed:", err?.message ?? err);
    process.exit(1);
  });