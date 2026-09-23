"use client";

/**
 * High-Capacity IndexedDB Storage Manager for EVACORE
 *
 * Provides structured, asynchronous, 50MB+ persistent storage for:
 * 1. Family Passes & Offline QR Credentials
 * 2. Offline Evacuee / SOS / Redemption Queues
 * 3. Delta-Based Shelter Occupancy Mutations
 * 4. Local Merchant Voucher Anti-Collision Cache
 */

const DB_NAME = "ReliefTracker_IDB_v1";
const DB_VERSION = 2;

const STORES = {
  FAMILY_PASSES: "family_passes",
  OFFLINE_QUEUE: "offline_queue",
  VOUCHERS: "vouchers",
  OCCUPANCY_DELTAS: "occupancy_deltas",
  HOSPITALS: "hospitals_cache",
};

let dbPromise = null;

function getDB() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!window.indexedDB) {
    console.warn("IndexedDB not supported on this browser, falling back to localStorage.");
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.FAMILY_PASSES)) {
          db.createObjectStore(STORES.FAMILY_PASSES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.VOUCHERS)) {
          db.createObjectStore(STORES.VOUCHERS, { keyPath: "code" });
        }
        if (!db.objectStoreNames.contains(STORES.OCCUPANCY_DELTAS)) {
          db.createObjectStore(STORES.OCCUPANCY_DELTAS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.HOSPITALS)) {
          db.createObjectStore(STORES.HOSPITALS, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("IndexedDB open error:", request.error);
        resolve(null);
      };
    });
  }

  return dbPromise;
}

export async function idbGet(storeName, key) {
  const db = await getDB();
  if (!db) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(`${storeName}_${key}`);
        return raw ? JSON.parse(raw) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function idbGetAll(storeName) {
  const db = await getDB();
  if (!db) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(`IDB_FALLBACK_${storeName}`);
        return raw ? JSON.parse(raw) : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

export async function idbSet(storeName, value) {
  const db = await getDB();
  if (!db) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const all = JSON.parse(window.localStorage.getItem(`IDB_FALLBACK_${storeName}`) || "[]");
        const keyField = storeName === STORES.VOUCHERS ? "code" : "id";
        const filtered = all.filter((item) => item[keyField] !== value[keyField]);
        filtered.unshift(value);
        window.localStorage.setItem(`IDB_FALLBACK_${storeName}`, JSON.stringify(filtered));
      }
      return value;
    } catch {
      return value;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve(value);
    }
  });
}

export async function idbDelete(storeName, key) {
  const db = await getDB();
  if (!db) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const all = JSON.parse(window.localStorage.getItem(`IDB_FALLBACK_${storeName}`) || "[]");
        const keyField = storeName === STORES.VOUCHERS ? "code" : "id";
        const filtered = all.filter((item) => item[keyField] !== key);
        window.localStorage.setItem(`IDB_FALLBACK_${storeName}`, JSON.stringify(filtered));
      }
    } catch {}
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbClear(storeName) {
  const db = await getDB();
  if (!db) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(`IDB_FALLBACK_${storeName}`);
      }
    } catch {}
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export { STORES };
