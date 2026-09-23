/**
 * End-to-End Test for Firestore Cloud Function `clampShelterOccupancy`
 *
 * Simulates and verifies the exact Firestore onUpdate trigger behavior:
 * 1. Floor Clamp: capacity: 50, currentOccupancy: 45 + increment(-50) = -5 -> clamps to 0, _clampedFrom: -5
 * 2. Ceiling Clamp: capacity: 50, currentOccupancy: 45 + increment(20) = 65 -> clamps to 50, _clampedFrom: 65
 * 3. Infinite Recursion Guard: Confirms the function halts on the subsequent invocation without re-triggering.
 */

const { handleShelterOccupancyUpdate } = require("../functions/index.js");

class MockDocumentReference {
  constructor(initialData) {
    this.data = { ...initialData };
    this.updateLog = [];
  }

  async update(fields) {
    this.updateLog.push({ ...fields });
    this.data = { ...this.data, ...fields };
    return this.data;
  }
}

function createChange(beforeData, afterData, docRef) {
  return {
    before: {
      data: () => ({ ...beforeData }),
      ref: docRef,
    },
    after: {
      data: () => ({ ...afterData }),
      ref: docRef,
    },
  };
}

async function runTests() {
  console.log("==================================================================");
  console.log(" STARTING CLOUD FUNCTION 'clampShelterOccupancy' END-TO-END TEST");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // ─────────────────────────────────────────────────────────────
  // TEST CASE 1: Floor Clamp (Negative Occupancy underflow)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ TEST 1: Floor Clamp Test (increment(-50) on 45/50)");
  {
    const initialDoc = { capacity: 50, currentOccupancy: 45, name: "Salt Lake Camp A" };
    const docRef = new MockDocumentReference(initialDoc);

    // Initial state -> update applied: 45 - 50 = -5
    const updatedDocState = { ...initialDoc, currentOccupancy: -5 };
    const change1 = createChange(initialDoc, updatedDocState, docRef);
    const context = { params: { shelterId: "test-shelter-floor-01" } };

    console.log(" [Invocation 1] Simulating delta write resulting in currentOccupancy = -5...");
    await handleShelterOccupancyUpdate(change1, context);

    if (
      docRef.data.currentOccupancy === 0 &&
      docRef.data._clampedFrom === -5 &&
      docRef.data._clampedAt !== undefined
    ) {
      console.log(" ✅ Invocation 1 clamped currentOccupancy to 0 with _clampedFrom = -5");
    } else {
      console.error(" ❌ Invocation 1 failed to clamp properly:", docRef.data);
      failed++;
    }

    // Now test Invocation 2: Trigger fires again on the clamped document
    console.log(" [Invocation 2] Cloud Function re-triggered by clamp update (currentOccupancy: 0)...");
    const change2 = createChange(updatedDocState, docRef.data, docRef);
    const result2 = await handleShelterOccupancyUpdate(change2, context);

    if (result2 === null && docRef.updateLog.length === 1) {
      console.log(" ✅ Invocation 2 returned null without further writes (Infinite recursion prevented!)");
      passed++;
    } else {
      console.error(" ❌ Invocation 2 improperly executed an extra update:", docRef.updateLog);
      failed++;
    }
  }

  console.log("\n──────────────────────────────────────────────────────────────────\n");

  // ─────────────────────────────────────────────────────────────
  // TEST CASE 2: Ceiling Clamp (Exceeding Capacity overflow)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ TEST 2: Ceiling Clamp Test (increment(+20) on 45/50)");
  {
    const initialDoc = { capacity: 50, currentOccupancy: 45, name: "Howrah Relief Centre" };
    const docRef = new MockDocumentReference(initialDoc);

    // Initial state -> update applied: 45 + 20 = 65
    const updatedDocState = { ...initialDoc, currentOccupancy: 65 };
    const change1 = createChange(initialDoc, updatedDocState, docRef);
    const context = { params: { shelterId: "test-shelter-ceiling-02" } };

    console.log(" [Invocation 1] Simulating delta write resulting in currentOccupancy = 65 (capacity: 50)...");
    await handleShelterOccupancyUpdate(change1, context);

    if (
      docRef.data.currentOccupancy === 50 &&
      docRef.data._clampedFrom === 65 &&
      docRef.data._clampedAt !== undefined
    ) {
      console.log(" ✅ Invocation 1 clamped currentOccupancy to capacity (50) with _clampedFrom = 65");
    } else {
      console.error(" ❌ Invocation 1 failed to clamp properly:", docRef.data);
      failed++;
    }

    // Test Invocation 2: Trigger fires again on the clamped document
    console.log(" [Invocation 2] Cloud Function re-triggered by clamp update (currentOccupancy: 50)...");
    const change2 = createChange(updatedDocState, docRef.data, docRef);
    const result2 = await handleShelterOccupancyUpdate(change2, context);

    if (result2 === null && docRef.updateLog.length === 1) {
      console.log(" ✅ Invocation 2 returned null without further writes (Infinite recursion prevented!)");
      passed++;
    } else {
      console.error(" ❌ Invocation 2 improperly executed an extra update:", docRef.updateLog);
      failed++;
    }
  }

  console.log("\n──────────────────────────────────────────────────────────────────\n");

  // ─────────────────────────────────────────────────────────────
  // TEST CASE 3: Schema Edge Case (Missing / Undefined capacity)
  // ─────────────────────────────────────────────────────────────
  console.log("▶ TEST 3: Schema Edge Case (Missing / Undefined capacity)");
  {
    const initialDoc = { currentOccupancy: 45, name: "Uncapped Camp" };
    const docRef = new MockDocumentReference(initialDoc);

    const updatedDocState = { ...initialDoc, currentOccupancy: 120 };
    const change = createChange(initialDoc, updatedDocState, docRef);
    const context = { params: { shelterId: "test-shelter-uncapped" } };

    console.log(" [Invocation 1] Simulating write with currentOccupancy = 120 and undefined capacity...");
    const result = await handleShelterOccupancyUpdate(change, context);

    if (result === null && docRef.updateLog.length === 0) {
      console.log(" ✅ Correctly skipped ceiling clamp silently when capacity is missing.");
      passed++;
    } else {
      console.error(" ❌ Failed: Threw error or clamped with invalid capacity.");
      failed++;
    }
  }

  console.log("\n==================================================================");
  console.log(` TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
