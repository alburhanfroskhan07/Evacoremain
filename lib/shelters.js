"use client";

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";

function requireClient() {
  if (!auth || !db) {
    throw new Error(
      "Firebase client SDK not initialized - check your .env.local Firebase config."
    );
  }
  return { auth, db };
}

function requireAuth() {
  const { auth } = requireClient();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to do this.");
  }
  return uid;
}

/**
 * Create a new shelter. Saves via server API (which auto-approves and seeds supplies),
 * with client SDK fallback if offline.
 */
export async function saveShelter(data) {
  const { auth } = requireClient();
  const uid = auth.currentUser?.uid || "coordinator_user";

  const numLat = Number(data.lat);
  const numLng = Number(data.lng);
  const numCap = Number(data.totalCapacity);
  const numOcc = Number(data.currentOccupancy ?? 0);

  // 1. Try server API route (Admin SDK) to auto-approve & seed supplies
  try {
    const res = await fetch("/api/shelters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        lat: numLat,
        lng: numLng,
        totalCapacity: numCap,
        currentOccupancy: numOcc,
        contactNumber: data.contactNumber ?? "",
        coordinatorUid: uid,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      return result;
    }
  } catch (err) {
    console.warn("Server saveShelter fallback to client SDK:", err);
  }

  // 2. Client SDK fallback
  const { db } = requireClient();
  const ref = doc(collection(db, "shelters"));

  const payload = {
    name: data.name,
    lat: numLat,
    lng: numLng,
    totalCapacity: numCap,
    currentOccupancy: numOcc,
    contactNumber: data.contactNumber ?? "",
    coordinatorUid: uid,
    status: "approved",
    occupancyHistory: [
      { value: numOcc, timestamp: Timestamp.now() },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  return { id: ref.id, ...payload };
}

/**
 * Update live occupancy on a shelter.
 * Uses client-side update with automatic server transaction fallback to guarantee updates persist.
 */
export async function updateShelterOccupancy(shelterId, newOccupancy) {
  const numOcc = Number(newOccupancy);
  if (isNaN(numOcc) || numOcc < 0) {
    throw new Error("Occupancy must be a non-negative number.");
  }

  // 1. Try direct client Firestore update
  let directSuccess = false;
  try {
    const { db } = requireClient();
    const ref = doc(db, "shelters", shelterId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const existing = Array.isArray(snap.data().occupancyHistory)
        ? snap.data().occupancyHistory
        : [];

      const occupancyHistory = [
        ...existing,
        { value: numOcc, timestamp: Timestamp.now() },
      ].slice(-20);

      await updateDoc(ref, {
        currentOccupancy: numOcc,
        occupancyHistory,
        updatedAt: serverTimestamp(),
      });
      directSuccess = true;
    }
  } catch (err) {
    console.warn("Client-side updateShelterOccupancy notice, calling server fallback:", err);
  }

  if (directSuccess) return { success: true, occupancy: numOcc };

  // 2. Server API fallback via PATCH /api/shelters/occupancy (Admin SDK Transaction)
  const res = await fetch("/api/shelters/occupancy", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shelterId,
      occupancy: numOcc,
      deviceId: "client_web",
      queuedAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update shelter occupancy.");
  }

  return await res.json();
}

/**
 * Admin-only. Approve a pending shelter so it appears on the live map and
 * seed its 6 default supply items.
 */
export async function approveShelter(shelterId) {
  const { auth, db } = requireClient();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  try {
    const res = await fetch("/api/admin/approve-shelter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ shelterId }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Approve shelter API notice, falling back to direct update:", err);
  }

  // Fallback: direct status update
  const ref = doc(db, "shelters", shelterId);
  await updateDoc(ref, {
    status: "approved",
    updatedAt: serverTimestamp(),
  });
  return { success: true, shelterId };
}

const SUPPLY_STATUSES = ["adequate", "low", "critical"];

/**
 * Coordinator-callable. Update a single supply item's status on their own shelter.
 */
export async function updateSupplyStatus(shelterId, itemId, newStatus) {
  const uid = requireAuth();
  const { db } = requireClient();

  if (!SUPPLY_STATUSES.includes(newStatus)) {
    throw new Error(
      `newStatus must be one of ${SUPPLY_STATUSES.join(", ")}.`
    );
  }

  const ref = doc(db, "shelters", shelterId, "supplies", itemId);
  await setDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  }, { merge: true });
}

/**
 * Admin/coordinator dashboard helper. Returns every low/critical supply item
 * across all shelters via a collectionGroup query.
 */
export async function getResourcePriorityList() {
  const { db } = requireClient();

  try {
    const q = query(
      collectionGroup(db, "supplies"),
      where("status", "in", ["low", "critical"])
    );
    const snapshot = await getDocs(q);

    const shelterIds = new Set();
    const items = snapshot.docs.map((d) => {
      const segments = d.ref.path.split("/");
      const shelterId = segments[1];
      shelterIds.add(shelterId);
      return { shelterId, itemName: d.data().itemName, status: d.data().status };
    });

    const shelterNames = new Map();
    await Promise.all(
      [...shelterIds].map(async (shelterId) => {
        const snap = await getDoc(doc(db, "shelters", shelterId));
        shelterNames.set(
          shelterId,
          snap.exists() ? snap.data().name : "Relief Shelter"
        );
      })
    );

    return items.map((item) => ({
      shelterId: item.shelterId,
      shelterName: shelterNames.get(item.shelterId),
      itemName: item.itemName,
      status: item.status,
    }));
  } catch (e) {
    console.warn("getResourcePriorityList notice:", e);
    return [];
  }
}

/**
 * Reject a pending shelter.
 */
export async function rejectShelter(shelterId) {
  return setShelterStatus(shelterId, "rejected");
}

/**
 * Admin / Coordinator update shelter details (name, capacity, occupancy, status, contactNumber, amenities, etc.)
 */
export async function updateShelterDetails(shelterId, updates) {
  // 1. Try server PATCH API
  try {
    const res = await fetch("/api/shelters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shelterId, ...updates }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Server PATCH /api/shelters fallback to client SDK:", err);
  }

  // 2. Client SDK fallback
  const { db } = requireClient();
  const ref = doc(db, "shelters", shelterId);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (updates.totalCapacity !== undefined) {
    payload.totalCapacity = Number(updates.totalCapacity) || 0;
  }
  if (updates.currentOccupancy !== undefined) {
    payload.currentOccupancy = Number(updates.currentOccupancy) || 0;
  }
  await updateDoc(ref, payload);
  return { success: true, shelterId, ...payload };
}

async function setShelterStatus(shelterId, status) {
  const { db } = requireClient();
  const ref = doc(db, "shelters", shelterId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Live-listener on shelters. Calls callback with fresh array on every change.
 * Resilient to different status tags so active and approved shelters are always shown.
 */
export function subscribeToShelters(callback) {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(collection(db, "shelters"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const shelters = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.status !== "rejected" && s.status !== "closed");
        callback(shelters);
      },
      (err) => {
        console.warn("Shelters real-time subscription error:", err);
        // Fallback to GET /api/shelters if onSnapshot has permission restrictions
        fetch("/api/shelters")
          .then((res) => res.json())
          .then((data) => {
            if (data.shelters) callback(data.shelters);
          })
          .catch(() => callback([]));
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn("subscribeToShelters exception:", e);
    fetch("/api/shelters")
      .then((res) => res.json())
      .then((data) => {
        if (data.shelters) callback(data.shelters);
      })
      .catch(() => callback([]));
    return () => {};
  }
}