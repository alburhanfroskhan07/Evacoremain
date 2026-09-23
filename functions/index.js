const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Core update handler for shelter occupancy clamping.
 * Exported for direct testability and invoked by the Firestore trigger.
 */
async function handleShelterOccupancyUpdate(change, context) {
  const afterData = change.after.data();
  if (!afterData) return null;

  const currentOccupancy = afterData.currentOccupancy;
  const rawCapacity =
    afterData.capacity !== undefined
      ? afterData.capacity
      : afterData.totalCapacity;
  const capacity = typeof rawCapacity === "number" ? rawCapacity : null;

  // Floor clamp: prevent negative occupancy
  if (typeof currentOccupancy === "number" && currentOccupancy < 0) {
    const shelterId = context?.params?.shelterId || "unknown";
    console.warn(
      `[AUDIT] Shelter ${shelterId} occupancy dropped below zero (${currentOccupancy}). Clamping to 0 with audit timestamp.`
    );

    return change.after.ref.update({
      currentOccupancy: 0,
      _clampedAt: admin.firestore.FieldValue.serverTimestamp(),
      _clampedFrom: currentOccupancy,
    });
  }

  // Ceiling clamp: prevent exceeding capacity (when capacity is a valid number)
  if (
    typeof currentOccupancy === "number" &&
    typeof capacity === "number" &&
    currentOccupancy > capacity
  ) {
    const shelterId = context?.params?.shelterId || "unknown";
    console.warn(
      `[AUDIT] Shelter ${shelterId} occupancy exceeded capacity (${currentOccupancy} > ${capacity}). Clamping to capacity with audit timestamp.`
    );

    return change.after.ref.update({
      currentOccupancy: capacity,
      _clampedAt: admin.firestore.FieldValue.serverTimestamp(),
      _clampedFrom: currentOccupancy,
    });
  }

  return null;
}

/**
 * Firestore Cloud Function Trigger: shelters/{shelterId} onUpdate
 */
const clampShelterOccupancy = functions.firestore
  .document("shelters/{shelterId}")
  .onUpdate(handleShelterOccupancyUpdate);

module.exports = {
  clampShelterOccupancy,
  handleShelterOccupancyUpdate,
};
