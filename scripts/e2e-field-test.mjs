import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;
const results = [];

function record(testName, ok, details = "") {
  if (ok) passedCount++;
  else failedCount++;
  results.push({ testName, ok, details });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${testName}${details ? " -> " + details : ""}`);
}

async function api(path, method = "GET", body = null, headers = {}) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    opts.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runPass(passNumber) {
  const salt = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log("\n==========================================================================");
  console.log(`=== RUNNING PASS ${passNumber}: FULL FIELD WALKTHROUGH & FEATURE AUDIT ===`);
  console.log("==========================================================================\n");

  // 1. All Localized Viewport Pages
  const pages = [
    "/en",
    "/hi",
    "/bn",
    "/en/admin",
    "/en/coordinator",
    "/en/volunteer",
    "/en/shop",
    "/en/register-evacuee",
    "/en/register-shelter",
    "/en/guide",
    "/en/login",
  ];

  for (const page of pages) {
    const r = await api(page);
    record(`Page Render: ${page}`, r.status === 200, `HTTP ${r.status}`);
  }

  // 2. Shelters Listing
  const sheltersRes = await api("/api/shelters");
  const shelters = sheltersRes.data?.shelters || (Array.isArray(sheltersRes.data) ? sheltersRes.data : []);
  record("API: GET /api/shelters", sheltersRes.status === 200 && shelters.length > 0, `Count: ${shelters.length}`);

  const testShelterId = shelters[0]?.id || "shelter_salt_lake";

  // 3. Shelter Occupancy: GET and PATCH/POST
  const occGet = await api(`/api/shelters/occupancy?shelterId=${testShelterId}`);
  record("API: GET /api/shelters/occupancy", occGet.status === 200 && typeof occGet.data?.currentOccupancy === "number", `Occupancy: ${occGet.data?.currentOccupancy}/${occGet.data?.totalCapacity}`);

  const occPost = await api("/api/shelters/occupancy", "POST", {
    shelterId: testShelterId,
    delta: 2,
    deviceId: `audit_device_${salt}`,
    timestamp: Date.now(),
  });
  record("API: POST /api/shelters/occupancy (delta increment)", occPost.status === 200 && occPost.data?.success, `New Occupancy: ${occPost.data?.currentOccupancy}`);

  // 4. Safe Route Distance & Obstacle Avoidance
  const routeDist = await api("/api/route-distance", "POST", {
    evacueeLat: 22.58,
    evacueeLng: 88.41,
    shelterCandidates: [
      { id: "shelter_salt_lake", lat: 22.5867, lng: 88.4178 },
      { id: "shelter_howrah", lat: 22.5958, lng: 88.2636 },
    ],
  });
  const candidates = routeDist.data?.rankedCandidates || routeDist.data?.results || [];
  record("API: POST /api/route-distance", routeDist.status === 200 && candidates.length > 0, `Candidates ranked: ${candidates.length}`);

  // 5. Emergency Hospital Proximity Locator (both GET and POST)
  const hospGet = await api("/api/hospitals/nearest?lat=22.5867&lng=88.4178&radiusKm=10");
  record("API: GET /api/hospitals/nearest", hospGet.status === 200, `Hospital: ${hospGet.data?.hospital?.name || "Found"}`);

  const hospPost = await api("/api/hospitals/nearest", "POST", {
    lat: 22.5867,
    lng: 88.4178,
    radiusKm: 10,
  });
  record("API: POST /api/hospitals/nearest", hospPost.status === 200, `Hospital: ${hospPost.data?.hospital?.name || "Found"}`);

  // 6. Evacuee Registration (Offline & Online capable)
  const evacReg = await api("/api/register-evacuee", "POST", {
    name: `Field Evacuee ${salt}`,
    familySize: 3,
    phone: "+91 98301 55667",
    lat: 22.5805,
    lng: 88.4110,
    specialNeeds: ["medical", "infant"],
  });
  const createdEvacueeId = evacReg.data?.evacueeId;
  record("API: POST /api/register-evacuee", evacReg.status === 200 && Boolean(createdEvacueeId), `Evacuee: ${createdEvacueeId}, Camp: ${evacReg.data?.assignedShelterName || "Assigned"}`);

  // 7. Update Evacuee Live Rescue Location
  if (createdEvacueeId) {
    const updateLoc = await api("/api/evacuee/update-location", "POST", {
      evacueeId: createdEvacueeId,
      lat: 22.5815,
      lng: 88.4118,
    });
    record("API: POST /api/evacuee/update-location", updateLoc.status === 200, `Telemetry updated`);
  }

  // 8. Voucher Issuance & Anti-Double-Spend Protection
  const issuedVoucher = evacReg.data?.voucher?.code || evacReg.data?.voucherCode || `EVAC-VOUCH-${salt}`;
  const red1 = await api("/api/redeem-voucher", "POST", {
    voucherCode: issuedVoucher,
    shopId: `Shop_${salt}`,
    shopName: "Central Relief Ration Hub",
  });
  record("API: POST /api/redeem-voucher (valid redemption)", red1.status === 200 || red1.data?.status === "success", `Redeemed status: ${red1.data?.status || "Verified"}`);

  const red2 = await api("/api/redeem-voucher", "POST", {
    voucherCode: issuedVoucher,
    shopId: `Shop_Other_${salt}`,
    shopName: "Unauthorized Second Shop",
  });
  record("API: POST /api/redeem-voucher (anti-double-spend blocked)", red2.status === 409 || red2.status === 400 || red2.data?.status === "already_used" || red2.data?.error?.includes("already") || red2.data?.message?.includes("already"), `Blocked duplicate: ${red2.data?.message || red2.data?.error || "Rejected (409 Conflict)"}`);

  // 9. Hazard Reporting (with automatic synonym mapping: 'flood' -> 'waterlogged')
  const hazReport = await api("/api/report-hazard", "POST", {
    lat: 22.5825,
    lng: 88.4135,
    severity: "severe",
    type: "flood", // Tests synonym normalization
    description: "Submerged roadway 50cm deep near stadium",
    reporterName: "Rescue Patrol",
    token: "demo-admin-token",
  });
  const hazId = hazReport.data?.id;
  record("API: POST /api/report-hazard (with type normalization)", hazReport.status === 200 && Boolean(hazId), `Hazard ID: ${hazId}`);

  // 10. Hazard Verification and Dismissal
  if (hazId) {
    const vHaz = await api(`/api/hazards/${hazId}/verify`, "POST", { verifiedBy: "coordinator_user" });
    record(`API: POST /api/hazards/:id/verify`, vHaz.status === 200, `Status: verified`);

    const dHaz = await api(`/api/hazards/${hazId}/dismiss`, "POST", { token: "demo-admin-token" });
    record(`API: POST /api/hazards/:id/dismiss`, dHaz.status === 200 && dHaz.data?.success, `Status: dismissed`);
  }

  // 10b. Volunteer Registration
  const regVol = await api("/api/volunteers", "POST", {
    uid: `vol_${salt}`,
    name: `Field Volunteer ${salt}`,
    phone: "+91 98309 99887",
    email: `volunteer_${salt}@relief.gov`,
    resourceType: "vehicle_4x4",
    lat: 22.58,
    lng: 88.42,
  });
  record("API: POST /api/volunteers", regVol.status === 200 && regVol.data?.success, `Registered UID: ${regVol.data?.volunteer?.uid}`);

  // 10c. Volunteer Listing (Admin Queue)
  const listVol = await api("/api/volunteers?status=pending");
  const foundPending = Array.isArray(listVol.data?.volunteers) && listVol.data.volunteers.some((v) => v.uid === `vol_${salt}`);
  record("API: GET /api/volunteers?status=pending", listVol.status === 200 && foundPending, `Pending Queue: ${listVol.data?.pendingCount}`);

  // 11. Volunteer Credential Verification
  const vVol = await api("/api/verify-volunteer", "POST", {
    volunteerUid: `vol_${salt}`,
    token: "demo-admin-token",
  });
  record("API: POST /api/verify-volunteer", vVol.status === 200 && Boolean(vVol.data?.verifiedId), `Credential: ${vVol.data?.verifiedId}`);

  // 11b. Verified Volunteer in Fleet Roster
  const listVerVol = await api("/api/volunteers?status=verified");
  const foundVerified = Array.isArray(listVerVol.data?.volunteers) && listVerVol.data.volunteers.some((v) => v.uid === `vol_${salt}`);
  record("API: GET /api/volunteers?status=verified", listVerVol.status === 200 && foundVerified, `Verified Fleet: ${listVerVol.data?.verifiedCount}`);

  // 12. Active Volunteer Evacuees Roster
  const volEvacs = await api("/api/volunteer/evacuees");
  record("API: GET /api/volunteer/evacuees", volEvacs.status === 200 && Array.isArray(volEvacs.data?.evacuees), `Active Evacuees: ${volEvacs.data?.evacuees?.length}`);

  // 13. Volunteer Dispatch Assignment
  const dispVol = await api("/api/dispatch-volunteer", "POST", {
    volunteerId: `vol_${salt}`,
    sosAlertId: createdEvacueeId || "sos_demo_1",
    token: "demo-admin-token",
  });
  record("API: POST /api/dispatch-volunteer", dispVol.status === 200 && dispVol.data?.success, `Dispatched to: ${dispVol.data?.sosAlertId}`);

  // 14. Camp Registration
  const campReg = await api("/api/shelters", "POST", {
    name: `Community Shelter ${salt}`,
    lat: 22.575,
    lng: 88.425,
    totalCapacity: 250,
    contactNumber: "+91 98305 12345",
    address: "Community Hall, Sector 2",
  });
  const newCampId = campReg.data?.shelter?.id || campReg.data?.id;
  record("API: POST /api/shelters (new shelter registration)", campReg.status === 200 && Boolean(newCampId), `Camp ID: ${newCampId}`);

  // 15. Admin Camp Approval & Supply Seeding
  if (newCampId) {
    const apprv = await api("/api/admin/approve-shelter", "POST", {
      shelterId: newCampId,
      token: "demo-admin-token",
    });
    record("API: POST /api/admin/approve-shelter", apprv.status === 200 && apprv.data?.success, `Approved`);
  }

  // 16. AI Incident Commander Agent HUD (ReAct Loop)
  const icRes = await api("/api/ai/incident-commander", "POST", {
    situationReport: "Water surge in Sector 4 is 55cm. Stranded families reported.",
  });
  record("API: POST /api/ai/incident-commander", icRes.status === 200 && Boolean(icRes.data?.directive || icRes.data?.finalDirective), `Directive: ${String(icRes.data?.directive || icRes.data?.finalDirective?.evacuationNotice).slice(0, 50)}...`);

  // 17. AI Auto-Dispatcher (Urgency & Vehicle Matching)
  const autoDisp = await api("/api/ai/auto-dispatch", "POST", {
    autoCommit: false,
  });
  record("API: POST /api/ai/auto-dispatch", autoDisp.status === 200 && Array.isArray(autoDisp.data?.recommendations), `Recommendations: ${autoDisp.data?.recommendations?.length}`);

  // 18. AI Multilingual Evacuee Voice & Text NLP Intake
  const voiceExt = await api("/api/ai/extract-evacuee-info", "POST", {
    transcript: "Mera naam Ramesh Kumar hai. Hum 4 log hain. Dadi ko insulin chahiye.",
    locale: "hi",
  });
  record("API: POST /api/ai/extract-evacuee-info", voiceExt.status === 200 && Boolean(voiceExt.data?.fullName || voiceExt.data?.name), `Extracted: ${voiceExt.data?.fullName || voiceExt.data?.name} (family size: ${voiceExt.data?.familySize})`);

  // 19. AI SOS Triage (Single & Bulk)
  const sosTr = await api("/api/ai/triage-sos", "POST", {
    sosList: [
      { id: "sos_alert_1", message: "Water rising chest deep, infant trapped on roof" },
      { id: "sos_alert_2", message: "Need dry food rations" },
    ],
  });
  record("API: POST /api/ai/triage-sos", sosTr.status === 200 && Array.isArray(sosTr.data?.triaged), `Triaged Count: ${sosTr.data?.triaged?.length}`);

  // 20. AI Shelter Overflow & Headroom Forecast
  const shForecast = await api("/api/ai/forecast-shelter", "POST", {
    shelterId: testShelterId,
    currentOccupancy: 150,
    totalCapacity: 400,
  });
  record("API: POST /api/ai/forecast-shelter", shForecast.status === 200 && Boolean(shForecast.data?.predictedOverflowRisk), `Risk: ${shForecast.data?.predictedOverflowRisk}, HoursToFull: ${shForecast.data?.predictedHoursToFull}`);

  // 21. AI Supply Depletion & Transfer Optimizer
  const supPred = await api("/api/ai/supply-prediction", "POST", {
    shelterId: testShelterId,
  });
  record("API: POST /api/ai/supply-prediction", supPred.status === 200 && Boolean(supPred.data?.analysis), `Critical Alerts: ${supPred.data?.criticalAlerts?.length}`);

  // 22. AI Weather Telemetry Alert Refresh
  const wxAlert = await api("/api/ai/refresh-weather-alert", "POST", {
    token: "demo-admin-token",
  });
  record("API: POST /api/ai/refresh-weather-alert", wxAlert.status === 200 && Boolean(wxAlert.data?.severity), `Severity: ${wxAlert.data?.severity} (${wxAlert.data?.headline?.slice(0, 45)}...)`);

  // 23. AI Voucher Anomaly & Anti-Fraud Scanner
  const vcAnom = await api("/api/ai/flag-voucher-anomalies", "POST", {
    vouchers: [
      { code: "V-101", shopId: "Shop_A" },
      { code: "V-101", shopId: "Shop_B" },
    ],
  });
  record("API: POST /api/ai/flag-voucher-anomalies", vcAnom.status === 200 && Array.isArray(vcAnom.data?.anomalies), `Anomalies: ${vcAnom.data?.anomalies?.length}`);

  // 24. AI Multimodal Hazard Computer Vision Analysis
  const cvRes = await api("/api/ai/analyze-hazard-image", "POST", {
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    sampleScenarioId: "flooded_street",
  });
  record("API: POST /api/ai/analyze-hazard-image", cvRes.status === 200 && Boolean(cvRes.data?.hazardType), `Type: ${cvRes.data?.hazardType}, Depth: ${cvRes.data?.waterDepth?.estimatedCm}cm`);

  console.log(`\n>>> PASS ${passNumber} SUB-TOTAL: ${passedCount} PASSED / ${failedCount} FAILED <<<\n`);
}

async function main() {
  await runPass(1);
  await runPass(2); // Cross-check twice as requested!

  console.log("\n==========================================================================");
  console.log(`=== FINAL AUDIT RESULT: ${passedCount} PASSED / ${failedCount} FAILED OUT OF ${results.length} CHECKS ===`);
  console.log("==========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Audit fatal error:", err);
  process.exit(1);
});
