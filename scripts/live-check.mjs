import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.env.BASE_URL || "https://sihhackathon-seven.vercel.app";
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(process.cwd(), "hackathon-24d36-firebase-adminsdk-fbsvc-1d22399d5b.json");
const SA = existsSync(credPath) ? JSON.parse(readFileSync(credPath, "utf8")) : null;
const envPath = join(process.cwd(), ".env.local");
const envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const API_KEY = envContent
  .split("\n")
  .find((l) => l.startsWith("NEXT_PUBLIC_FIREBASE_API_KEY="))
  ?.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim() || "AIzaSyAQ2KVrJ6zJ3USTN5UMEWTCdKLjw9tezjk";

if (SA && !admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(SA) });
} else if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

async function adminToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@relief.gov",
        password: process.env.ADMIN_PW,
        returnSecureToken: true,
      }),
    }
  );
  const j = await res.json();
  if (!j.idToken) throw new Error("admin sign-in failed: " + JSON.stringify(j));
  return j.idToken;
}

function hav(a1, o1, a2, o2) {
  const R = 6371;
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLng = ((o2 - o1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const HAZARDS = [
  { lat: 22.5816, lng: 88.4106 },
  { lat: 22.5809, lng: 88.4142 },
];

function minHazardDistKm(geometry) {
  if (!Array.isArray(geometry) || geometry.length === 0) return null;
  let min = Infinity;
  for (const [lng, lat] of geometry) {
    for (const h of HAZARDS) min = Math.min(min, hav(lat, lng, h.lat, h.lng));
  }
  return Math.round(min * 1000);
}

const created = []; // { evacueeId, assignedShelterId, familySize, voucherCode }

async function cleanup() {
  for (const c of created) {
    try {
      await db.collection("evacuees").doc(c.evacueeId).delete();
      const vs = await db.collection("vouchers").where("code", "==", c.voucherCode).get();
      vs.docs.forEach((d) => d.ref.delete());
      if (c.assignedShelterId) {
        await db
          .collection("shelters")
          .doc(c.assignedShelterId)
          .update({ currentOccupancy: admin.firestore.FieldValue.increment(-c.familySize) });
      }
    } catch (e) {
      console.log("cleanup warn:", c.evacueeId, e.message);
    }
  }
  created.length = 0;
}

const results = [];
const rec = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
};

async function main() {
  const token = await adminToken();

  // 1) Live evacuee registration through seeded hazards
  console.log("── Live evacuee registration (route through seeded hazards) ──");
  const coords = [
    ["A", 22.578, 88.409],
    ["B", 22.579, 88.4105],
    ["C", 22.5815, 88.409],
    ["D", 22.5775, 88.4115],
    ["E", 22.5792, 88.4128],
  ];
  let foundBlocked = false;
  let sawGeo = false;
  for (const [tag, lat, lng] of coords) {
    const res = await fetch(`${BASE}/api/register-evacuee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Live Route Test ${tag}`,
        familySize: 1,
        lat,
        lng,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.evacueeId) {
      created.push({
        evacueeId: data.evacueeId,
        assignedShelterId: data.assignedShelterId,
        familySize: 1,
        voucherCode: data.voucherCode,
      });
    }
    const hasGeo = Array.isArray(data.routeGeometry) && data.routeGeometry.length >= 2;
    if (hasGeo) sawGeo = true;
    const minDist = hasGeo ? minHazardDistKm(data.routeGeometry) : null;
    const blocked = data.hazardBlocked === true || (minDist !== null && minDist <= 150);
    if (blocked) foundBlocked = true;
    console.log(
      `  [${tag}] ${lat},${lng} → shelter=${data.assignedShelterId || data.assignedShelterName || "?"} ` +
        `status=${res.status} geo=${hasGeo ? `array(${data.routeGeometry.length})` : "none"} ` +
        `hazardBlocked=${data.hazardBlocked} minDistToHazard=${minDist === null ? "n/a" : minDist + "m"}`
    );
  }
  rec("Live register-evacuee: routeGeometry present", sawGeo, sawGeo ? "seen on at least one coord" : "none returned");
  rec("Live register-evacuee: a blocked/hazard-near route found", foundBlocked, foundBlocked ? "found" : "none near seeded hazards at these coords");

  // 2) verify-volunteer auth chain (bad uid → 404 proves token+role OK)
  const bad = await fetch(`${BASE}/api/verify-volunteer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ volunteerUid: "does-not-exist-xyz" }),
  });
  rec("Live verify-volunteer: admin auth+role OK (404 on missing uid)", bad.status === 404, `status=${bad.status}`);

  // 3) dispatch seed verified volunteer to seed SOS
  const sos = await db.collection("sos_alerts").where("isSeedData", "==", true).get();
  const sosId = sos.docs[1]?.id || sos.docs[0]?.id;
  const disp = await fetch(`${BASE}/api/dispatch-volunteer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ volunteerId: "seed-volunteer-verified", sosAlertId: sosId }),
  });
  const dispJson = await disp.json();
  let dispVerified = disp.status === 200;
  if (dispVerified) {
    const v = await db.collection("volunteers").doc("seed-volunteer-verified").get();
    const s = await db.collection("sos_alerts").doc(sosId).get();
    dispVerified =
      v.data().available === false &&
      v.data().dispatchedToSosId === sosId &&
      s.data().dispatchedVolunteerId === "seed-volunteer-verified";
  }
  rec("Live dispatch-volunteer: both docs update atomically", dispVerified, `status=${disp.status} ${JSON.stringify(dispJson).slice(0, 80)}`);

  // 4) Gemini live (triage-sos with a real message)
  const triage = await fetch(`${BASE}/api/ai/triage-sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alertId: sosId,
      message: "Old man having a heart attack on the third floor, water rising fast, needs immediate rescue",
    }),
  });
  const triageJson = await triage.json();
  rec(
    "Live AI triage-sos: Gemini functional (non-default classification)",
    triage.status === 200 && triageJson.category === "medical" && triageJson.urgencyLevel === "high",
    `status=${triage.status} category=${triageJson.category} urgency=${triageJson.urgencyLevel}`
  );

  // 5) OpenWeather live
  const weather = await fetch(`${BASE}/api/ai/refresh-weather-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const weatherJson = await weather.json();
  rec(
    "Live refresh-weather-alert: OpenWeather functional",
    weather.status === 200 && weatherJson.success === true,
    `status=${weather.status} severity=${weatherJson.severity || "?"}`
  );

  await cleanup();

  const failed = results.filter((r) => !r.ok);
  console.log(`\nLive checks: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("live-check crashed:", e);
  process.exit(1);
});