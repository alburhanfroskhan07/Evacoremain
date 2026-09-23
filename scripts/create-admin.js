/**
 * Admin Account Creation Script (Master PRD Section 4 & 8.6)
 *
 * The ONLY way an admin account is created is via this script using the Firebase Admin SDK.
 * It creates the user in Firebase Authentication and records `users/{uid}` with `role: "admin"`.
 *
 * Usage:
 *   node scripts/create-admin.js <email> <password>
 *
 * Example:
 *   node scripts/create-admin.js admin@relief.gov AdminPassword123!
 */

const fs = require("fs");
const path = require("path");

// Load .env.local if present
try {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || "").trim();
      }
    }
  }
} catch (e) {
  // ignore
}

const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

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

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  if (!email || !password) {
    console.error("\n❌ Usage: node scripts/create-admin.js <email> <password>");
    console.error("Example: node scripts/create-admin.js admin@relief.gov Password123!\n");
    process.exit(1);
  }

  const app = initAdmin();
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`\n⚙️ Creating/Updating Admin user: ${email}...`);

  let userRecord;
  try {
    // Check if user already exists
    userRecord = await auth.getUserByEmail(email);
    console.log(`ℹ️ Existing Firebase Auth user found with UID: ${userRecord.uid}`);
    // Update password
    await auth.updateUser(userRecord.uid, { password });
    console.log(`✓ Password updated successfully.`);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      userRecord = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });
      console.log(`✓ Created new Firebase Auth user with UID: ${userRecord.uid}`);
    } else {
      console.error("❌ Auth Error:", err.message);
      process.exit(1);
    }
  }

  const uid = userRecord.uid;

  // Set users/{uid} with role: "admin"
  await db.collection("users").doc(uid).set(
    {
      email,
      role: "admin",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`✓ Successfully updated 'users/${uid}' with role: "admin"`);
  console.log(`\n Admin account is ready! Log in at /login with:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}\n`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
