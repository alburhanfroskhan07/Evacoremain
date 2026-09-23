"use client";

import { idbGet, idbGetAll, idbSet, idbDelete, idbClear, STORES } from "./idb-storage";
import { haversineDistance } from "./geo";

export const DEFAULT_OFFLINE_SHELTERS = [
  {
    id: "shelter_salt_lake",
    name: "Salt Lake Central Relief Camp",
    lat: 22.5867,
    lng: 88.4178,
    totalCapacity: 400,
    currentOccupancy: 85,
    contactNumber: "+91 98301 11223",
    status: "approved",
  },
  {
    id: "shelter_howrah",
    name: "Howrah Municipal Relief Center",
    lat: 22.5958,
    lng: 88.2636,
    totalCapacity: 350,
    currentOccupancy: 340,
    contactNumber: "+91 98302 22334",
    status: "approved",
  },
  {
    id: "shelter_kolkata_central",
    name: "Kolkata High School Shelter",
    lat: 22.5629,
    lng: 88.3572,
    totalCapacity: 250,
    currentOccupancy: 110,
    contactNumber: "+91 98303 33445",
    status: "approved",
  },
];

export const STORAGE_KEYS = {
  EVACUEES: "offline_evacuees_queue",
  SOS: "offline_sos_queue",
  OCCUPANCY_DELTAS: "offline_occupancy_deltas",
  REDEMPTIONS: "offline_redemptions_queue",
  CACHED_VOUCHERS: "offline_vouchers_vault",
  DEVICE_ID: "offline_device_id",
  HAZARDS: "offline_hazards_queue",
};

export function getApiUrl(path) {
  if (typeof window !== "undefined" && window.location?.origin) {
    return path;
  }
  const base = process.env.BASE_URL || "http://localhost:3000";
  return `${base}${path}`;
}

export function getQueue(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setQueue(key, data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage setQueue error:", e);
  }
}

export function getDeviceId() {
  if (typeof window === "undefined") return "device_unknown";
  try {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return "device_fallback";
  }
}

export function generateClientVoucherCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "OFF-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getLocalVouchers() {
  return getQueue(STORAGE_KEYS.CACHED_VOUCHERS);
}

/**
 * Queue an evacuee registration when offline, and compute nearest available relief shelter
 */
export function queueOfflineEvacuee(formData) {
  const localVoucherCode = generateClientVoucherCode();
  const deviceId = getDeviceId();

  const userLat = typeof formData.lat === "number" ? formData.lat : 22.5726;
  const userLng = typeof formData.lng === "number" ? formData.lng : 88.3639;

  // Find nearest available shelter offline
  let matchedShelter = null;
  let nearestDistance = Infinity;

  for (const s of DEFAULT_OFFLINE_SHELTERS) {
    const free = s.totalCapacity - s.currentOccupancy;
    if (free > 0) {
      const d = haversineDistance(userLat, userLng, s.lat, s.lng);
      if (d < nearestDistance) {
        nearestDistance = d;
        matchedShelter = s;
      }
    }
  }

  const queueItem = {
    id: "offline_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    type: "evacuee",
    formData,
    voucherCode: localVoucherCode,
    deviceId,
    assignedShelterId: matchedShelter?.id || null,
    queuedAt: new Date().toISOString(),
  };

  const queue = getQueue(STORAGE_KEYS.EVACUEES);
  queue.push(queueItem);
  setQueue(STORAGE_KEYS.EVACUEES, queue);

  // High-capacity IDB queue
  idbSet(STORES.OFFLINE_QUEUE, queueItem).catch(() => {});

  // Save the generated offline voucher to local vault immediately
  saveVoucherToLocalVault({
    code: localVoucherCode,
    evacueeName: formData.name || "Family Representative",
    status: "active",
    value: "Standard Ration (Offline Pass)",
    isOffline: true,
  });

  return {
    offline: true,
    isOffline: true,
    voucherCode: localVoucherCode,
    evacueeId: queueItem.id,
    evacueeName: formData.name,
    assignedShelterId: matchedShelter?.id || "shelter_salt_lake",
    assignedShelterName: matchedShelter?.name || "Salt Lake Central Relief Camp",
    assignedShelterLat: matchedShelter?.lat || 22.5867,
    assignedShelterLng: matchedShelter?.lng || 88.4178,
    assignedShelterContact: matchedShelter?.contactNumber || "+91 98301 11223",
    assignedShelterCapacity: matchedShelter?.totalCapacity || 400,
    assignedShelterOccupancy: matchedShelter?.currentOccupancy || 85,
    distanceKm: nearestDistance !== Infinity ? Number(nearestDistance.toFixed(1)) : 1.2,
    durationSeconds: nearestDistance !== Infinity ? Math.round((nearestDistance / 20) * 3600) : 600,
    routeGeometry: matchedShelter ? [[userLng, userLat], [matchedShelter.lng, matchedShelter.lat]] : null,
  };
}

/**
 * Queue an emergency SOS alert when offline
 */
export function queueOfflineSOS(sosPayload) {
  const queueItem = {
    id: "offline_sos_" + Date.now(),
    type: "sos",
    payload: sosPayload,
    deviceId: getDeviceId(),
    queuedAt: new Date().toISOString(),
  };

  const queue = getQueue(STORAGE_KEYS.SOS);
  queue.push(queueItem);
  setQueue(STORAGE_KEYS.SOS, queue);

  idbSet(STORES.OFFLINE_QUEUE, queueItem).catch(() => {});
  return queueItem;
}

/**
 * Queue an offline delta-based shelter occupancy edit with Client-Side Clamping
 */
export function queueOfflineOccupancyDelta(optionsOrShelterId, maybeDelta) {
  let shelterId, delta, shelterName, currentOccupancy, totalCapacity;
  if (typeof optionsOrShelterId === "object" && optionsOrShelterId !== null) {
    ({ shelterId, delta, shelterName, currentOccupancy, totalCapacity } = optionsOrShelterId);
  } else {
    shelterId = optionsOrShelterId;
    delta = maybeDelta;
  }

  const numDelta = Number(delta) || 0;
  const currentVal = typeof currentOccupancy === "number" ? currentOccupancy : null;
  const maxCap = typeof totalCapacity === "number" && totalCapacity > 0 ? totalCapacity : null;

  // Calculate client-side clamped delta against latest known values
  let safeDelta = numDelta;
  if (currentVal !== null) {
    const projected = currentVal + numDelta;
    if (projected < 0) {
      safeDelta = -currentVal;
    } else if (maxCap !== null && projected > maxCap) {
      safeDelta = maxCap - currentVal;
    }
  }

  const deltaItem = {
    id: `delta_${shelterId}_${Date.now()}`,
    type: "occupancy_delta",
    shelterId,
    shelterName: shelterName || "Camp",
    delta: safeDelta,
    originalDelta: numDelta,
    currentOccupancy: currentVal,
    totalCapacity: maxCap,
    deviceId: getDeviceId(),
    queuedAt: new Date().toISOString(),
  };

  const queue = getQueue(STORAGE_KEYS.OCCUPANCY_DELTAS);
  queue.push(deltaItem);
  setQueue(STORAGE_KEYS.OCCUPANCY_DELTAS, queue);

  idbSet(STORES.OCCUPANCY_DELTAS, deltaItem).catch(() => {});
  return deltaItem;
}

/**
 * Queue a merchant voucher redemption when offline with Optimistic Anti-Double-Redemption Lock
 */
export function queueOfflineRedemption(voucherCode, shopName = "Relief Partner Store") {
  const normalizedCode = voucherCode.trim().toUpperCase();
  const queue = getQueue(STORAGE_KEYS.REDEMPTIONS);

  // Check if already redeemed on this device (Anti-double redemption guard)
  const isAlreadyQueued = queue.some((item) => item.voucherCode === normalizedCode);
  if (isAlreadyQueued) {
    throw new Error(`Voucher ${normalizedCode} was already redeemed at this station.`);
  }

  const queueItem = {
    id: "offline_redeem_" + Date.now(),
    type: "redemption",
    status: "redeemed_offline",
    voucherCode: normalizedCode,
    shopName,
    deviceId: getDeviceId(),
    redeemedAt: new Date().toISOString(),
  };

  queue.push(queueItem);
  setQueue(STORAGE_KEYS.REDEMPTIONS, queue);
  idbSet(STORES.OFFLINE_QUEUE, queueItem).catch(() => {});

  // Update cached vault item status if present
  const vouchers = getLocalVouchers();
  const found = vouchers.find((v) => v.code === queueItem.voucherCode);
  if (found) {
    found.status = "redeemed";
    found.redeemedByShopName = shopName;
    found.redeemedOfflineAt = queueItem.redeemedAt;
    setQueue(STORAGE_KEYS.CACHED_VOUCHERS, vouchers);
  }

  return queueItem;
}

/**
 * Queue an offline road/flood hazard report
 */
export function queueOfflineHazard(hazardPayload) {
  const deviceId = getDeviceId();
  const queueItem = {
    id: "offline_haz_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    type: hazardPayload.type,
    lat: hazardPayload.lat,
    lng: hazardPayload.lng,
    aiAnalysis: hazardPayload.aiAnalysis || null,
    aiVerified: Boolean(hazardPayload.aiAnalysis),
    deviceId,
    queuedAt: new Date().toISOString(),
    status: "active",
    verifiedCount: 1,
  };

  const queue = getQueue(STORAGE_KEYS.HAZARDS);
  queue.push(queueItem);
  setQueue(STORAGE_KEYS.HAZARDS, queue);
  idbSet(STORES.OFFLINE_QUEUE, queueItem).catch(() => {});

  return queueItem;
}

/**
 * Save a newly generated or assigned voucher to the local offline vault
 */
export function saveVoucherToLocalVault(voucher) {
  if (!voucher || !voucher.code) return;
  try {
    idbSet(STORES.VOUCHERS, voucher.code, {
      ...voucher,
      savedAt: new Date().toISOString(),
    }).catch(() => {});

    const vouchers = getLocalVouchers();
    const existingIdx = vouchers.findIndex((v) => v.code === voucher.code);
    if (existingIdx >= 0) {
      vouchers[existingIdx] = { ...vouchers[existingIdx], ...voucher };
    } else {
      vouchers.unshift(voucher);
    }
    setQueue(STORAGE_KEYS.CACHED_VOUCHERS, vouchers);
  } catch (e) {
    console.warn("Could not save voucher to local offline vault:", e);
  }
}

/**
 * Get total pending offline counts
 */
export function getOfflineCounts() {
  const evacuees = getQueue(STORAGE_KEYS.EVACUEES).length;
  const sos = getQueue(STORAGE_KEYS.SOS).length;
  const redemptions = getQueue(STORAGE_KEYS.REDEMPTIONS).length;
  const deltas = getQueue(STORAGE_KEYS.OCCUPANCY_DELTAS).length;
  const hazards = getQueue(STORAGE_KEYS.HAZARDS).length;
  return {
    total: evacuees + sos + redemptions + deltas + hazards,
    evacuees,
    sos,
    redemptions,
    deltas,
    occupancy: deltas,
    occupancyDeltas: deltas,
    hazards,
  };
}

/**
 * Clear all pending offline queues and IDB stores
 */
export function clearAllOfflineData() {
  if (typeof window === "undefined") return;
  setQueue(STORAGE_KEYS.EVACUEES, []);
  setQueue(STORAGE_KEYS.SOS, []);
  setQueue(STORAGE_KEYS.REDEMPTIONS, []);
  setQueue(STORAGE_KEYS.OCCUPANCY_DELTAS, []);
  setQueue(STORAGE_KEYS.HAZARDS, []);
  try {
    idbClear(STORES.OFFLINE_QUEUE).catch(() => {});
    idbClear(STORES.OCCUPANCY_DELTAS).catch(() => {});
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent("offline-sync-completed", {
        detail: { synced: 0, errors: 0, cleared: true },
      })
    );
  } catch {}
}

/**
 * Synchronize all offline queues to the cloud with Delta Conflict Merging & Poisoned Record Protection
 */
export async function syncAllOfflineData() {
  if (typeof window === "undefined") {
    return { success: false, reason: "Server environment", synced: 0, syncedCount: 0 };
  }

  // Network probe if navigator reports offline
  if (!window.navigator.onLine) {
    try {
      const probe = await fetch("/api/shelters", { method: "GET", cache: "no-store" });
      if (!probe.ok && probe.status >= 500) {
        return { success: false, reason: "Still offline", synced: 0, syncedCount: 0 };
      }
    } catch {
      return { success: false, reason: "Still offline", synced: 0, syncedCount: 0 };
    }
  }

  let syncedCount = 0;
  const errors = [];
  const collisionFlags = [];

  // 1. Sync Evacuees
  const evacueeQueue = getQueue(STORAGE_KEYS.EVACUEES);
  if (evacueeQueue.length > 0) {
    const remaining = [];
    for (const item of evacueeQueue) {
      if (!item || !item.formData || !item.formData.name) {
        syncedCount++;
        idbDelete(STORES.OFFLINE_QUEUE, item?.id).catch(() => {});
        continue;
      }
      try {
        const res = await fetch(getApiUrl("/api/register-evacuee"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.formData),
        });
        if (res.ok || res.status === 429 || res.status === 409 || res.status === 400) {
          // If ok or already registered/duplicate (429/409) or bad request (400),
          // resolve and remove from offline queue so it does not block the queue
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 3) {
            syncedCount++;
            idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
          } else {
            remaining.push(item);
          }
        }
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 3) {
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          remaining.push(item);
        }
        errors.push(err.message);
      }
    }
    setQueue(STORAGE_KEYS.EVACUEES, remaining);
  }

  // 2. Sync SOS alerts
  const sosQueue = getQueue(STORAGE_KEYS.SOS);
  if (sosQueue.length > 0) {
    const remaining = [];
    for (const item of sosQueue) {
      if (!item || !item.payload || typeof item.payload.lat !== "number" || typeof item.payload.lng !== "number") {
        syncedCount++;
        idbDelete(STORES.OFFLINE_QUEUE, item?.id).catch(() => {});
        continue;
      }
      try {
        const { raiseSOS } = await import("@/lib/sos");
        await raiseSOS({
          ...item.payload,
          isOfflineQueued: true,
          queuedAt: item.queuedAt,
          deviceId: item.deviceId,
        });
        syncedCount++;
        idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 3) {
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          remaining.push(item);
        }
        errors.push(err.message);
      }
    }
    setQueue(STORAGE_KEYS.SOS, remaining);
  }

  // 3. Sync Redemptions with Double-Redemption Collision Detection
  const redemptionQueue = getQueue(STORAGE_KEYS.REDEMPTIONS);
  if (redemptionQueue.length > 0) {
    const remaining = [];
    for (const item of redemptionQueue) {
      if (!item || !item.voucherCode) {
        syncedCount++;
        idbDelete(STORES.OFFLINE_QUEUE, item?.id).catch(() => {});
        continue;
      }
      try {
        const res = await fetch(getApiUrl("/api/redeem-voucher"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: item.voucherCode,
            voucherCode: item.voucherCode,
            shopId: item.shopName,
            shopName: item.shopName,
            deviceId: item.deviceId,
            redeemedAt: item.redeemedAt,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status === 409 || res.status === 410 || res.status === 400 || data.isDuplicateRedemption) {
          // Success, or already used/expired/duplicate: mark as settled
          if (data.isDuplicateRedemption || res.status === 409) {
            collisionFlags.push({
              voucherCode: item.voucherCode,
              shopName: item.shopName,
              redeemedAt: item.redeemedAt,
              message: data.message || data.error || "Flagged for coordinator review (Already Used / Double Redemption)",
            });
          }
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 3) {
            syncedCount++;
            idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
          } else {
            remaining.push(item);
          }
        }
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 3) {
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          remaining.push(item);
        }
        errors.push(err.message);
      }
    }
    setQueue(STORAGE_KEYS.REDEMPTIONS, remaining);
  }

  // 4. Sync Occupancy Deltas (Additive Non-destructive Merge)
  const deltaQueue = getQueue(STORAGE_KEYS.OCCUPANCY_DELTAS);
  if (deltaQueue.length > 0) {
    const remaining = [];
    for (const item of deltaQueue) {
      if (!item || !item.shelterId) {
        syncedCount++;
        idbDelete(STORES.OCCUPANCY_DELTAS, item?.id).catch(() => {});
        continue;
      }
      try {
        const res = await fetch(getApiUrl("/api/shelters/occupancy"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shelterId: item.shelterId,
            delta: item.delta,
            deviceId: item.deviceId,
            queuedAt: item.queuedAt,
          }),
        });
        if (res.ok || res.status === 404 || res.status === 400) {
          syncedCount++;
          idbDelete(STORES.OCCUPANCY_DELTAS, item.id).catch(() => {});
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 3) {
            syncedCount++;
            idbDelete(STORES.OCCUPANCY_DELTAS, item.id).catch(() => {});
          } else {
            remaining.push(item);
          }
        }
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 3) {
          syncedCount++;
          idbDelete(STORES.OCCUPANCY_DELTAS, item.id).catch(() => {});
        } else {
          remaining.push(item);
        }
        errors.push(err.message);
      }
    }
    setQueue(STORAGE_KEYS.OCCUPANCY_DELTAS, remaining);
  }

  // 5. Sync Offline Road & Flood Hazards
  const hazardQueue = getQueue(STORAGE_KEYS.HAZARDS);
  if (hazardQueue.length > 0) {
    const remaining = [];
    for (const item of hazardQueue) {
      if (!item || !item.type) {
        syncedCount++;
        idbDelete(STORES.OFFLINE_QUEUE, item?.id).catch(() => {});
        continue;
      }
      try {
        const res = await fetch(getApiUrl("/api/report-hazard"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            lat: item.lat,
            lng: item.lng,
            aiAnalysis: item.aiAnalysis,
          }),
        });
        if (res.ok || res.status === 400 || res.status === 429) {
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 3) {
            syncedCount++;
            idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
          } else {
            remaining.push(item);
          }
        }
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts >= 3) {
          syncedCount++;
          idbDelete(STORES.OFFLINE_QUEUE, item.id).catch(() => {});
        } else {
          remaining.push(item);
        }
        errors.push(err.message);
      }
    }
    setQueue(STORAGE_KEYS.HAZARDS, remaining);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("offline-sync-completed", {
        detail: { synced: syncedCount, errors: errors.length },
      })
    );
  }

  return {
    success: errors.length === 0,
    synced: syncedCount,
    syncedCount,
    errors,
    collisionFlags,
  };
}
