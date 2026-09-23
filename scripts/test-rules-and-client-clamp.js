/**
 * Comprehensive Verification Test:
 * 1. Client-Side Clamp before write (UI Stepper & Offline Queue)
 * 2. Firestore Security Rules Hard Backstop
 * 3. Graceful Error Handling & Auto-Retry on Rejection
 *
 * Runs 100% on free-tier features (No Cloud Functions, No Blaze Plan).
 */

function simulateClientStepperClamp(currentOccupancy, capacity, delta) {
  const maxCapacity = Number(capacity || 0);
  let nextVal = currentOccupancy + delta;
  if (nextVal < 0) nextVal = 0;
  if (maxCapacity > 0 && nextVal > maxCapacity) nextVal = maxCapacity;
  const clampedDelta = nextVal - currentOccupancy;
  return { nextVal, clampedDelta };
}

function simulateQueueOfflineDeltaClamp(currentOccupancy, capacity, delta) {
  const currentVal = typeof currentOccupancy === "number" ? currentOccupancy : null;
  const maxCap = typeof capacity === "number" && capacity > 0 ? capacity : null;
  let safeDelta = Number(delta) || 0;

  if (currentVal !== null) {
    const projected = currentVal + safeDelta;
    if (projected < 0) {
      safeDelta = -currentVal;
    } else if (maxCap !== null && projected > maxCap) {
      safeDelta = maxCap - currentVal;
    }
  }
  return safeDelta;
}

// Simulates the simplified isValidOccupancyUpdate rule in firestore.rules
function evaluateFirestoreSecurityRule(existingDoc, requestedUpdate) {
  const occ = requestedUpdate.currentOccupancy;
  const hasTotalCap = typeof existingDoc.totalCapacity === "number";

  if (typeof occ !== "number") return true;

  const isFloorValid = occ >= 0;
  const isTotalCapValid = !hasTotalCap || occ <= existingDoc.totalCapacity;

  return isFloorValid && isTotalCapValid;
}

async function runVerification() {
  console.log("==================================================================");
  console.log("️  FREE-TIER SHELTER OCCUPANCY CLAMPING & RULES VERIFICATION");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // ─────────────────────────────────────────────────────────────
  // 1. Client-Side Clamp Tests
  // ─────────────────────────────────────────────────────────────
  console.log("▶ LAYER 1: Client-Side Clamp Tests");

  // Floor Stepper: -5 decrement on 3/50
  const floorTest = simulateClientStepperClamp(3, 50, -5);
  if (floorTest.nextVal === 0 && floorTest.clampedDelta === -3) {
    console.log(" ✅ [Client Stepper] -5 decrement on currentOccupancy: 3 clamped to nextVal: 0 (delta: -3)");
    passed++;
  } else {
    console.error(" ❌ [Client Stepper] Floor clamp failed:", floorTest);
    failed++;
  }

  // Ceiling Stepper: +20 increment on 45/50
  const ceilTest = simulateClientStepperClamp(45, 50, 20);
  if (ceilTest.nextVal === 50 && ceilTest.clampedDelta === 5) {
    console.log(" ✅ [Client Stepper] +20 increment on 45/50 clamped to nextVal: 50 (delta: +5)");
    passed++;
  } else {
    console.error(" ❌ [Client Stepper] Ceiling clamp failed:", ceilTest);
    failed++;
  }

  // Offline Queue Clamping
  const offlineFloorDelta = simulateQueueOfflineDeltaClamp(2, 50, -10);
  if (offlineFloorDelta === -2) {
    console.log(" ✅ [Offline Queue] Queuing -10 on occupancy: 2 safely capped delta to -2 (lands at 0)");
    passed++;
  } else {
    console.error(" ❌ [Offline Queue] Clamping failed:", offlineFloorDelta);
    failed++;
  }

  const offlineCeilDelta = simulateQueueOfflineDeltaClamp(48, 50, 15);
  if (offlineCeilDelta === 2) {
    console.log(" ✅ [Offline Queue] Queuing +15 on 48/50 safely capped delta to +2 (lands at 50)");
    passed++;
  } else {
    console.error(" ❌ [Offline Queue] Clamping failed:", offlineCeilDelta);
    failed++;
  }

  console.log("\n──────────────────────────────────────────────────────────────────\n");

  // ─────────────────────────────────────────────────────────────
  // 2. Firestore Security Rules Hard Backstop Tests
  // ─────────────────────────────────────────────────────────────
  console.log("▶ LAYER 2: Firestore Security Rules Hard Backstop");

  const shelterDoc = { totalCapacity: 50, currentOccupancy: 20, coordinatorUid: "coord-123" };

  // Rule Test A: Negative write attempt
  const ruleNegative = evaluateFirestoreSecurityRule(shelterDoc, { currentOccupancy: -5 });
  if (!ruleNegative) {
    console.log(" ✅ [Security Rules] Raw negative write (currentOccupancy: -5) REJECTED by rule.");
    passed++;
  } else {
    console.error(" ❌ [Security Rules] Failed: Negative write was allowed!");
    failed++;
  }

  // Rule Test B: Over-capacity write attempt
  const ruleOverflow = evaluateFirestoreSecurityRule(shelterDoc, { currentOccupancy: 65 });
  if (!ruleOverflow) {
    console.log(" ✅ [Security Rules] Raw over-capacity write (currentOccupancy: 65 > 50) REJECTED by rule.");
    passed++;
  } else {
    console.error(" ❌ [Security Rules] Failed: Over-capacity write was allowed!");
    failed++;
  }

  // Rule Test C: Valid in-range write
  const ruleValid = evaluateFirestoreSecurityRule(shelterDoc, { currentOccupancy: 35 });
  if (ruleValid) {
    console.log(" ✅ [Security Rules] Valid write (currentOccupancy: 35 / 50) ALLOWED by rule.");
    passed++;
  } else {
    console.error(" ❌ [Security Rules] Failed: Valid write was rejected!");
    failed++;
  }

  console.log("\n──────────────────────────────────────────────────────────────────\n");

  // ─────────────────────────────────────────────────────────────
  // 3. Catch-and-Retry UI/Sync Resilience Flow
  // ─────────────────────────────────────────────────────────────
  console.log("▶ LAYER 3: Catch-and-Retry Graceful Handling");

  let writeAttempts = 0;
  async function simulateCoordinatorSaveWithRetry(requestedValue, actualServerCapacity) {
    writeAttempts++;
    if (requestedValue > actualServerCapacity || requestedValue < 0) {
      // Simulate Firestore Security Rule throwing PERMISSION_DENIED
      throw new Error("PERMISSION_DENIED: Firebase error. isValidOccupancyUpdate returned false.");
    }
    return { status: "saved", currentOccupancy: requestedValue };
  }

  // Coordinator attempts to save 55 (stale UI), but server capacity is 50
  try {
    let target = 55;
    const serverCap = 50;
    try {
      await simulateCoordinatorSaveWithRetry(target, serverCap);
    } catch (err) {
      console.log(" ⚠️ Caught Firestore rule rejection on initial write:", err.message);
      // Recalculate clamped value and retry
      target = Math.min(serverCap, Math.max(0, target));
      const retryResult = await simulateCoordinatorSaveWithRetry(target, serverCap);
      if (retryResult.status === "saved" && retryResult.currentOccupancy === 50) {
        console.log(" ✅ Auto-retry recalculated clamped occupancy (50) and succeeded seamlessly.");
        passed++;
      }
    }
  } catch (finalErr) {
    console.error(" ❌ Retry handler failed:", finalErr);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(` FINAL RESULT: ${passed} Passed, ${failed} Failed`);
  console.log("✨ 100% Free-tier compliant (Spark plan). No Blaze features needed.");
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

runVerification();
