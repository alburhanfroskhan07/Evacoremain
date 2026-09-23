/**
 * Part A–F verification checklist runner.
 *
 * Runs against the Firebase emulators (Firestore + Auth) started via
 * `firebase-tools emulators:exec`. API route handlers are imported in-process
 * (the alias loader resolves `@/` and neutralizes `server-only`); Firestore
 * rules enforcement is exercised through @firebase/rules-unit-testing.
 *
 * Usage (from repo root):
 *   GOOGLE_APPLICATION_CREDENTIALS=$PWD/<sa>.json \
 *     npx firebase-tools emulators:exec --only firestore,auth \
 *       --project demo-hackathon-24d36 \
 *       "node --import ./scripts/register-loader.mjs scripts/verify-checklist.mjs"
 */

import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

const ROOT = process.cwd();
const PROJECT = "demo-hackathon-24d36";

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(ROOT, "hackathon-24d36-firebase-adminsdk-fbsvc-1d22399d5b.json");
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = PROJECT;

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  - ${detail}` : ""}`);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ── Mock OSRM server ───────────────────────────────────────────────────── */
let osrmFail = false;
function startOsrmMock() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (osrmFail) {
        res.writeHead(500).end("mock down");
        return;
      }
      const url = new URL(req.url, "http://x");
      const seg = url.pathname.split("/route/v1/driving/")[1];
      const [o, d] = seg.split(";").map((c) => {
        const [lng, lat] = c.split(",").map(Number);
        return { lng, lat };
      });
      const mid = { lng: (o.lng + d.lng) / 2, lat: (o.lat + d.lat) / 2 };
      const distanceM = haversineKm(o.lat, o.lng, d.lat, d.lng) * 1000 + 300;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: Math.round(distanceM),
              duration: Math.round(distanceM / 8.33),
              geometry: {
                type: "LineString",
                coordinates: [
                  [o.lng, o.lat],
                  [mid.lng, mid.lat],
                  [d.lng, d.lat],
                ],
              },
            },
          ],
        })
      );
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/* ── Emulator Admin SDK (same project namespace as rules tests) ─────────── */
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];
  return admin.initializeApp({
    projectId: PROJECT,
    credential: admin.credential.applicationDefault(),
  });
}

const app = initAdmin();
const db = getFirestore(app);

/* ── Client Auth SDK for minting real ID tokens against the Auth emulator ── */
import { initializeApp as initClientApp } from "firebase/app";
import {
  initializeAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  inMemoryPersistence,
} from "firebase/auth";

const clientApp = initClientApp({ apiKey: "fake-key", projectId: PROJECT });
const clientAuth = initializeAuth(clientApp, { persistence: inMemoryPersistence });
connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
  disableWarnings: true,
});

async function mintToken(uid, email, password) {
  try {
    await admin.auth().createUser({ uid, email, password });
  } catch (err) {
    if (!String(err.code).includes("already-exists")) throw err;
  }
  const cred = await signInWithEmailAndPassword(clientAuth, email, password);
  return await cred.user.getIdToken();
}

/* ── Rules-test environment ─────────────────────────────────────────────── */
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const rulesSrc = readFileSync(join(ROOT, "firestore.rules"), "utf8");
const testEnv = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: rulesSrc,
  },
});

const uid = (user) => testEnv.authenticatedContext(user.uid, user.claims ?? {}).firestore();
const deny = (fn) =>
  fn().then(
    () => null,
    (err) => (String(err.code).includes("permission-denied") ? "denied" : null)
  );

async function call(handler, body, { token, clientIp } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (clientIp) headers["x-forwarded-for"] = clientIp;
  const req = new Request("http://localhost/api", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const res = await handler(req);
  return { status: res.status, data: await res.json().catch(() => null) };
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════ */
const osrmMock = await startOsrmMock();
process.env.OSRM_BASE_URL = `http://127.0.0.1:${osrmMock.address().port}`;
process.env.OPENWEATHER_API_KEY = "dummy-key";

const UIDS = {
  admin: "u-admin",
  coordA: "u-coord-a",
  coordB: "u-coord-b",
  vol1: "u-vol-1",
  vol2: "u-vol-2",
  bystander: "u-bystander",
};
const EMAIL = (u) => `${u}@example.com`;
const PASSWORD = "password123";

async function seedUsers() {
  const batch = db.batch();
  for (const [k, uid] of Object.entries(UIDS)) {
    const role = k === "admin" ? "admin" : "coordinator";
    batch.set(db.collection("users").doc(uid), {
      role: k === "vol1" || k === "vol2" ? "volunteer" : role,
      name: k,
      email: EMAIL(uid),
    });
  }
  await batch.commit();
}

async function main() {
  console.log("── Setup: seed users/shelters/volunteers/sos ──");
  await seedUsers();

  // pending shelter (used by checks 1–3, 6)
  const shelterARef = db.collection("shelters").doc("shelter-a");
  await shelterARef.set({
    name: "Test Shelter Alpha",
    status: "pending",
    coordinatorUid: UIDS.coordA,
    totalCapacity: 100,
    currentOccupancy: 10,
    lat: 22.58,
    lng: 88.41,
  });
  // approved shelter with capacity (used by checks 4, 9, 10)
  const shelterBRef = db.collection("shelters").doc("shelter-b");
  await shelterBRef.set({
    name: "Approved Test Shelter",
    status: "approved",
    coordinatorUid: UIDS.coordA,
    totalCapacity: 200,
    currentOccupancy: 50,
    lat: 22.585,
    lng: 88.415,
  });
  // supplies for shelter-a (created via admin; rules still gate client updates)
  const supplyBatch = db.batch();
  for (const [itemId, itemName] of [
    ["drinking_water", "Drinking Water"],
    ["food", "Food"],
    ["baby_formula", "Baby Formula"],
    ["first_aid", "First Aid / Medicine"],
    ["blankets", "Blankets"],
    ["oxygen", "Oxygen"],
  ]) {
    supplyBatch.set(shelterARef.collection("supplies").doc(itemId), {
      itemName,
      status: "adequate",
      shelterName: "Test Shelter Alpha",
    });
  }
  await supplyBatch.commit();

  // verified + available volunteer (dispatch candidate, checks 5/7/11/12)
  await db.collection("volunteers").doc(UIDS.vol2).set({
    uid: UIDS.vol2,
    name: "Verified Volunteer",
    phone: "+91 90000 00000",
    resourceType: "boat",
    lat: 22.584,
    lng: 88.414,
    available: true,
    verified: true,
    verifiedId: "VOL-TEST-0001",
  });

  // open SOS alert (check 12)
  await db.collection("sos_alerts").doc("sos-1").set({
    lat: 22.582,
    lng: 88.412,
    message: "Test SOS",
    urgencyLevel: "high",
    status: "open",
  });

  // ── Check 8: old anonymous register-volunteer route fully removed ──
  {
    const routePath = join(ROOT, "app/api/register-volunteer/route.js");
    const exists = existsSync(routePath);
    record("Check 8: old /api/register-volunteer removed", !exists, exists ? "still present" : "gone");
  }

  const adminToken = await mintToken(UIDS.admin, EMAIL(UIDS.admin), PASSWORD);

  // ── Check 1: approve shelter → 6 supplies with shelterName ──
  {
    const approve = await import("../app/api/admin/approve-shelter/route.js");
    const res = await call(approve.POST, { shelterId: "shelter-a" }, { token: adminToken });
    const snap = await shelterARef.collection("supplies").get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const ok =
      res.status === 200 &&
      docs.length === 6 &&
      docs.every((d) => d.shelterName === "Test Shelter Alpha") &&
      res.data.supplies === 6;
    const detail = `status=${res.status}, supplies=${docs.length}, names=${[...new Set(docs.map((d) => d.shelterName))].join(",")}`;
    record("Check 1: approve → 6 supplies + shelterName denormalized", !!ok, detail);
  }

  // ── Check 2: non-owning coordinator supply update rejected ──
  {
    const coordB = uid({ uid: UIDS.coordB });
    const coordA = uid({ uid: UIDS.coordA });
    const target = { status: "low", updatedBy: "x" };
    const denied = await deny(() =>
      coordB.doc("shelters/shelter-a/supplies/drinking_water").update(target)
    );
    const allowed = await coordA
      .doc("shelters/shelter-a/supplies/drinking_water")
      .update({ status: "low", updatedBy: UIDS.coordA })
      .then(() => true, () => false);
    record(
      "Check 2: non-owning coordinator supply update rejected",
      denied === "denied" && allowed,
      denied === "denied" ? "coord-b denied; coord-a(owner) allowed" : "NOT denied"
    );
  }

  // ── Check 3: 4th hazard report from same IP blocked ──
  {
    const reportHazard = await import("../app/api/report-hazard/route.js");
    const ip = "203.0.113.7";
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const r = await call(reportHazard.POST, { type: "waterlogged", lat: 22.58, lng: 88.41 }, { clientIp: ip });
      statuses.push(r.status);
    }
    record(
      "Check 3: 4th hazard report from same IP blocked",
      statuses[0] === 200 && statuses[1] === 200 && statuses[2] === 200 && statuses[3] === 429,
      statuses.join(",")
    );
  }

  // ── Check 4: hazard on route → hazardBlocked: true ──
  {
    await db.collection("hazards").add({
      lat: 22.5825,
      lng: 88.4125,
      status: "active",
      type: "waterlogged",
      reportedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const routeDistance = await import("../app/api/route-distance/route.js");
    const res = await call(routeDistance.POST, {
      evacueeLat: 22.58,
      evacueeLng: 88.41,
      shelterCandidates: [{ id: "shelter-b", lat: 22.585, lng: 88.415 }],
    });
    const blocked = res.data?.results?.[0]?.hazardBlocked === true;
    record("Check 4: hazard on route → hazardBlocked true", blocked, JSON.stringify(res.data?.results?.[0]));
  }

  // ── Check 5: volunteer signup → verified:false, not a dispatch candidate ──
  {
    const vol1 = uid({ uid: UIDS.vol1 });
    const created = await vol1
      .doc(`volunteers/${UIDS.vol1}`)
      .set({
        uid: UIDS.vol1,
        name: "New Volunteer",
        phone: "+91 91111 11111",
        resourceType: "medical",
        lat: 22.581,
        lng: 88.411,
        available: true,
        verified: false,
        verifiedId: null,
      })
      .then(() => true, () => false);
    const adminCtx = uid({ uid: UIDS.admin });
    const q = await adminCtx
      .collection("volunteers")
      .where("verified", "==", true)
      .where("available", "==", true)
      .get();
    const ids = q.docs.map((d) => d.id);
    const excluded = !ids.includes(UIDS.vol1);
    record(
      "Check 5: volunteer created verified:false, absent from dispatch candidates",
      created && excluded,
      `created=${created}, candidates=[${ids.join(",")}]`
    );
  }

  // ── Check 6: client-write verified:true on own doc rejected ──
  {
    const vol1 = uid({ uid: UIDS.vol1 });
    const denied = await deny(() =>
      vol1.doc(`volunteers/${UIDS.vol1}`).update({ verified: true, verifiedId: "VOL-X1X1-2Y2Y" })
    );
    const ownEdit = await vol1
      .doc(`volunteers/${UIDS.vol1}`)
      .update({ name: "New Volunteer (edited)" })
      .then(() => true, () => false);
    record(
      "Check 6: client-write verified:true rejected",
      denied === "denied" && ownEdit,
      denied === "denied" ? "verified flip denied; own name edit allowed" : "NOT denied"
    );
  }

  // ── Check 7: admin verify → VOL-XXXX-XXXX, now a dispatch candidate ──
  {
    const verifyVolunteer = await import("../app/api/verify-volunteer/route.js");
    const res = await call(verifyVolunteer.POST, { volunteerUid: UIDS.vol1 }, { token: adminToken });
    const code = res.data?.verifiedId || "";
    const okCode = /^VOL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
    const adminCtx = uid({ uid: UIDS.admin });
    const q = await adminCtx
      .collection("volunteers")
      .where("verified", "==", true)
      .where("available", "==", true)
      .get();
    const ids = q.docs.map((d) => d.id);
    record(
      "Check 7: admin verify issues VOL code + appears as candidate",
      res.status === 200 && okCode && ids.includes(UIDS.vol1),
      `status=${res.status}, code=${code || "none"}, candidates=[${ids.join(",")}]`
    );
  }

  // ── Check 9: register evacuee → routeGeometry present + valid ──
  {
    const registerEvacuee = await import("../app/api/register-evacuee/route.js");
    const res = await call(
      registerEvacuee.POST,
      { name: "Geometry Test Evacuee", familySize: 2, lat: 22.58, lng: 88.41 },
      { clientIp: "198.51.100.1" }
    );
    const g = res.data?.routeGeometry;
    const valid =
      res.status === 200 &&
      Array.isArray(g) &&
      g.length >= 2 &&
      g.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
    record(
      "Check 9: routeGeometry present and valid",
      !!valid,
      `status=${res.status}, type=${Array.isArray(g) ? "array(" + g.length + ")" : typeof g}`
    );
  }

  // ── Check 10: OSRM unreachable → routeGeometry null, no error ──
  {
    osrmFail = true;
    const registerEvacuee = await import("../app/api/register-evacuee/route.js");
    const res = await call(
      registerEvacuee.POST,
      { name: "Fallback Test Evacuee", familySize: 1, lat: 22.581, lng: 88.411 },
      { clientIp: "198.51.100.2" }
    );
    record(
      "Check 10: OSRM failure → routeGeometry null gracefully",
      res.status === 200 && res.data?.routeGeometry === null,
      `status=${res.status}, routeGeometry=${res.data?.routeGeometry}`
    );
    osrmFail = false;
  }

  // ── Check 11: non-admin, non-owner volunteer read denied ──
  {
    const bystander = uid({ uid: UIDS.bystander });
    const get = await deny(() => bystander.doc(`volunteers/${UIDS.vol2}`).get());
    const list = await deny(() => bystander.collection("volunteers").get());
    const vol2 = uid({ uid: UIDS.vol2 });
    const selfRead = await vol2
      .doc(`volunteers/${UIDS.vol2}`)
      .get()
      .then(() => true, () => false);
    record(
      "Check 11: volunteers read denied for non-admin non-owner",
      get === "denied" && list === "denied" && selfRead,
      `doc=${get}, list=${list}, selfRead=${selfRead}`
    );
  }

  // ── Check 12: dispatch updates both docs; rolls back together on error ──
  {
    const dispatch = await import("../app/api/dispatch-volunteer/route.js");
    const okRes = await call(dispatch.POST, { volunteerId: UIDS.vol2, sosAlertId: "sos-1" }, { token: adminToken });
    const vol2Snap = await db.collection("volunteers").doc(UIDS.vol2).get();
    const sosSnap = await db.collection("sos_alerts").doc("sos-1").get();
    const both =
      okRes.status === 200 &&
      vol2Snap.data().available === false &&
      vol2Snap.data().dispatchedToSosId === "sos-1" &&
      sosSnap.data().dispatchedVolunteerId === UIDS.vol2;

    // rollback: dispatch a fresh (verified, available) volunteer to a missing SOS → 404, nothing written
    await db.collection("volunteers").doc(UIDS.vol1).update({ available: true });
    const badRes = await call(dispatch.POST, { volunteerId: UIDS.vol1, sosAlertId: "sos-missing" }, { token: adminToken });
    const vol1After = await db.collection("volunteers").doc(UIDS.vol1).get();
    const rolledBack = badRes.status === 404 && vol1After.data().available === true && !vol1After.data().dispatchedToSosId;

    record(
      "Check 12: dispatch atomic + rollback",
      both && rolledBack,
      `ok=${okRes.status}, vol2.available=${vol2Snap.data().available}, sos.disp=${sosSnap.data().dispatchedVolunteerId}; rollback=${badRes.status}, vol1.available=${vol1After.data().available}`
    );
  }

  // ── Check 13: refresh-weather-alert as non-admin → 403 ──
  {
    const coordBToken = await mintToken(UIDS.coordB, EMAIL(UIDS.coordB), PASSWORD);
    const refresh = await import("../app/api/ai/refresh-weather-alert/route.js");
    const res = await call(refresh.POST, {}, { token: coordBToken });
    record("Check 13: refresh-weather-alert non-admin → 403", res.status === 403, `status=${res.status}`);
  }

  // ── Summary ──
  const failed = results.filter((r) => !r.ok);
  console.log("\n══════════════════════════════════════");
  console.log(`Result: ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((r) => console.log(`  ✗ ${r.name}`));
  }
  await testEnv.cleanup();
  osrmMock.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\nHarness crashed:", err);
  try { await testEnv.cleanup(); } catch {}
  process.exit(1);
});