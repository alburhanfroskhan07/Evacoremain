/**
 * Database Clear Script (Demo Reset)
 *
 * Purges all operational disaster documents from Firestore:
 * - shelters
 * - evacuees
 * - vouchers
 * - sos_alerts
 * - shelter_forecasts
 *
 * Preserves admin accounts in `users` so you remain logged in as admin.
 *
 * Usage:
 *   node scripts/clear-database.js
 */

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

function initAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  let serviceAccount = null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      console.warn("Could not parse FIREBASE_SERVICE_ACCOUNT JSON env var.");
    }
  }

  if (!serviceAccount) {
    const credPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(process.cwd(), "hackathon-24d36-firebase-adminsdk-fbsvc-1d22399d5b.json");
    if (fs.existsSync(credPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf8"));
      } catch (err) {
        console.warn("Error reading service account file:", err.message);
      }
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    serviceAccount?.project_id ||
    "hackathon-24d36";

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

async function deleteCollection(db, collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ✓ ${collectionName}: 0 documents found (already clean).`);
    return 0;
  }

  const batchSize = 400;
  let count = 0;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    await batch.commit();
  }

  console.log(`  ✓ ${collectionName}: deleted ${count} document(s).`);
  return count;
}

async function clearDatabase() {
  console.log("\n Resetting database for live judging demo...\n");

  const app = initAdmin();
  const db = getFirestore(app);

  const collectionsToClear = [
    "shelters",
    "evacuees",
    "vouchers",
    "sos_alerts",
    "shelter_forecasts",
  ];

  for (const col of collectionsToClear) {
    await deleteCollection(db, col);
  }

  // Clear non-admin users (preserve admin account)
  const usersSnap = await db.collection("users").where("role", "!=", "admin").get();
  if (!usersSnap.empty) {
    const batch = db.batch();
    usersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  ✓ users: deleted ${usersSnap.size} non-admin user profile(s) (Admin preserved).`);
  } else {
    console.log(`  ✓ users: Admin accounts preserved.`);
  }

  console.log("\n✨ Database is completely wiped and ready for your live presentation!");
  console.log("   Admin login remains active at /login (admin@relief.gov)\n");
  process.exit(0);
}

clearDatabase().catch((err) => {
  console.error("❌ Error clearing database:", err);
  process.exit(1);
});
