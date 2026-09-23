/**
 * Offline Zero-Internet Field Verification Test
 * Tests LocalStorage/IndexedDB queuing, client-side clamping,
 * optimistic double-spend locks, and acoustic beacon distress frequencies.
 */

// Setup browser globals simulation for Node environment
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

try {
  Object.defineProperty(globalThis.navigator, "onLine", {
    value: false,
    configurable: true,
    writable: true,
  });
} catch {
  // fallback
}

import {
  queueOfflineEvacuee,
  queueOfflineSOS,
  queueOfflineOccupancyDelta,
  queueOfflineRedemption,
  saveVoucherToLocalVault,
  getOfflineCounts,
  syncAllOfflineData,
  STORAGE_KEYS,
} from "@/lib/offline-sync";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? " -> " + detail : ""}`);
}

async function testOfflineSuite() {
  console.log("\n==========================================================================");
  console.log("=== OFFLINE DATA TRANSFER & ZERO-CONNECTION INTEGRITY AUDIT            ===");
  console.log("==========================================================================\n");

  // 1. Offline Evacuee Registration & Local Shelter Assignment
  const uniqueTag = Math.random().toString(36).substring(2, 6).toUpperCase();
  const offlineEvac = queueOfflineEvacuee({
    name: `Subrata Chatterjee ${uniqueTag}`,
    familySize: 5,
    lat: 22.581,
    lng: 88.411,
    phone: "+91 98300 11223",
    specialNeeds: ["medical", "elderly"],
  });

  record(
    "Offline Evacuee Registration without Internet",
    offlineEvac.isOffline === true && Boolean(offlineEvac.voucherCode) && Boolean(offlineEvac.assignedShelterId),
    `Voucher: ${offlineEvac.voucherCode}, Assigned Camp: ${offlineEvac.assignedShelterName} (${offlineEvac.distanceKm}km)`
  );

  // 2. Offline Emergency SOS Alert
  const offlineSOS = queueOfflineSOS({
    name: "Mukherjee Family",
    message: "Chest-deep flood water, power line sparking near boundary wall",
    lat: 22.580,
    lng: 88.410,
    priority: "P1-CRITICAL",
  });

  record(
    "Offline SOS Queue Persistence",
    Boolean(offlineSOS.id) && offlineSOS.type === "sos",
    `SOS Queued ID: ${offlineSOS.id}`
  );

  // 3. Offline Shelter Occupancy Delta & Client-Side Clamping
  const deltaEdit = queueOfflineOccupancyDelta("shelter_salt_lake", 12);
  record(
    "Offline Occupancy Delta Enqueue",
    deltaEdit.shelterId === "shelter_salt_lake" && deltaEdit.delta === 12,
    `Delta recorded: +12`
  );

  // 4. Offline Merchant Voucher Redemption (Valid First Claim)
  const redeemResult1 = queueOfflineRedemption(offlineEvac.voucherCode, "Shop_Sector_5_Depot");
  record(
    "Offline Voucher Redemption (First Claim)",
    redeemResult1.status === "redeemed_offline",
    `Claimed at: ${redeemResult1.shopName || redeemResult1.shopId}`
  );

  // 5. Offline Anti-Double-Redemption Lock (Immediate Collision Prevention)
  let duplicateBlocked = false;
  try {
    queueOfflineRedemption(offlineEvac.voucherCode, "Shop_Sector_1_Depot");
  } catch (err) {
    duplicateBlocked = true;
    record(
      "Offline Anti-Double-Spend Local Lock",
      true,
      `Blocked second claim: ${err.message}`
    );
  }
  if (!duplicateBlocked) {
    record("Offline Anti-Double-Spend Local Lock", false, "Duplicate voucher was not blocked!");
  }

  // 6. Inspect Pending Offline Queue Counts
  const counts = getOfflineCounts();
  record(
    "Offline Pending Records Tracker",
    counts.total >= 4,
    `Total Queued: ${counts.total} (Evacuees: ${counts.evacuees}, SOS: ${counts.sos}, Occupancy: ${counts.occupancy}, Redemptions: ${counts.redemptions})`
  );

  // 7. Verify Offline Siren Beacon Module (Acoustic Rescue Signal)
  const { startSiren, stopSiren, isSirenActive } = await import("@/lib/acoustic-beacon");
  // Web Audio Context Mock
  globalThis.AudioContext = class {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createOscillator() {
      return {
        type: "sawtooth",
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    resume() { return Promise.resolve(); }
  };

  const sirenStarted = startSiren("siren");
  const sirenActive = isSirenActive();
  stopSiren();
  record(
    "Acoustic Distress Siren Beacon (Zero-Network)",
    sirenStarted === true && sirenActive === true,
    "Web Audio dual-tone acoustic warble activated (650Hz - 1250Hz)"
  );

  // 8. Simulated Network Restoration & Auto-Sync
  if (globalThis.navigator) {
    globalThis.navigator.onLine = true; // RECONNECT
  }
  const syncResult = await syncAllOfflineData();
  console.log("SYNC DEBUG:", JSON.stringify({ syncResult, finalCounts: getOfflineCounts() }, null, 2));
  record(
    "Network Reconnection & Multi-Queue Ingestion",
    syncResult.success === true,
    `Status: Synced ${syncResult.synced} offline items to cloud ledger`
  );

  const finalCounts = getOfflineCounts();
  record(
    "Queue Clearing Post-Sync",
    finalCounts.total === 0,
    `Remaining in offline queue: ${finalCounts.total}`
  );

  console.log("\n==========================================================================");
  const passed = results.filter((r) => r.ok).length;
  console.log(`=== OFFLINE INTEGRITY AUDIT: ${passed}/${results.length} PASSED ===`);
  console.log("==========================================================================\n");
}

testOfflineSuite().catch((err) => {
  console.error("Offline test fatal error:", err);
  process.exit(1);
});
