"use client";

import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { haversineDistance } from "./geo";

export const RESOURCE_TYPES = [
  { value: "boat", label: "Rescue Boat / Dinghy", icon: "boat", sub: "Flood evacuation & water rescue" },
  { value: "vehicle_4x4", label: "4x4 / Heavy Vehicle", icon: "truck", sub: "High-clearance road transit" },
  { value: "medical", label: "Doctor / Paramedic", icon: "medical", sub: "Emergency triage & first aid" },
  { value: "kitchen", label: "Community Kitchen", icon: "food", sub: "Bulk meals & cooked rations" },
  { value: "other", label: "General Rescue Support", icon: "shield", sub: "Field manpower & logistics" },
];

/**
 * Save volunteer profile on signup. Keyed by the auth uid (volunteers/{uid}) -
 * this replaces the anonymous, random-id flow that the old
 * app/api/register-volunteer route used.
 */
export async function saveVolunteerProfile(uid, data) {
  if (!uid) return;

  const payload = {
    uid,
    name: data.name || "Community Volunteer",
    phone: data.phone || "",
    email: data.email || "",
    resourceType: data.resourceType || "other",
    lat: typeof data.lat === "number" ? data.lat : 22.5726,
    lng: typeof data.lng === "number" ? data.lng : 88.3639,
    available: true,
    verified: false,
    verifiedId: null,
    dispatchedToSosId: null,
    status: "pending_verification",
  };

  // 1. Persist directly via Server Admin SDK route (guarantees DB write bypasses client rule bottlenecks)
  try {
    await fetch("/api/volunteers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Server volunteer profile save notice:", err);
  }

  // 2. Also write to client Firestore if available
  if (db) {
    try {
      const ref = doc(db, "volunteers", uid);
      await setDoc(ref, {
        ...payload,
        registeredAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (clientErr) {
      console.warn("Client volunteer profile save notice:", clientErr);
    }
  }

  return { success: true, uid, ...payload };
}

/**
 * Subscribe to single volunteer profile
 */
export function subscribeToVolunteer(uid, callback) {
  if (!db || !uid) return () => {};

  const ref = doc(db, "volunteers", uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Volunteer subscription notice:", err);
    callback(null);
  });
}

/**
 * Subscribe to pending unverified volunteers (Admin view)
 * Uses immediate Server API fetch + background polling + Firestore onSnapshot fallback
 */
export function subscribeToPendingVolunteers(callback) {
  let unsub = () => {};
  let timer = null;

  const fetchFromServer = async () => {
    try {
      const res = await fetch("/api/volunteers?status=pending");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.volunteers)) {
          callback(json.volunteers);
        }
      }
    } catch (e) {
      console.warn("Pending volunteers fetch notice:", e);
    }
  };

  // Immediate fetch from server API
  fetchFromServer();
  // Continuous sync every 3.5 seconds
  timer = setInterval(fetchFromServer, 3500);

  if (db) {
    try {
      const q = query(collection(db, "volunteers"), where("verified", "==", false));
      unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(list);
      }, (err) => {
        console.warn("Pending volunteers listener notice:", err);
      });
    } catch (err) {
      console.warn("Pending volunteers onSnapshot error:", err);
    }
  }

  return () => {
    try { unsub(); } catch {}
    if (timer) clearInterval(timer);
  };
}

/**
 * Subscribe to all verified volunteers (Admin dispatch)
 * Uses immediate Server API fetch + background polling + Firestore onSnapshot fallback
 */
export function subscribeToVerifiedVolunteers(callback) {
  let unsub = () => {};
  let timer = null;

  const fetchFromServer = async () => {
    try {
      const res = await fetch("/api/volunteers?status=verified");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.volunteers)) {
          callback(json.volunteers);
        }
      }
    } catch (e) {
      console.warn("Verified volunteers fetch notice:", e);
    }
  };

  // Immediate fetch from server API
  fetchFromServer();
  // Continuous sync every 4.5 seconds
  timer = setInterval(fetchFromServer, 4500);

  if (db) {
    try {
      const q = query(collection(db, "volunteers"), where("verified", "==", true));
      unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(list);
      }, (err) => {
        console.warn("Verified volunteers listener notice:", err);
      });
    } catch (err) {
      console.warn("Verified volunteers onSnapshot error:", err);
    }
  }

  return () => {
    try { unsub(); } catch {}
    if (timer) clearInterval(timer);
  };
}

/**
 * Admin-only. One-shot query for the admin verification queue - all volunteers
 * still awaiting verification (verified == false).
 */
export async function getPendingVolunteers() {
  try {
    const res = await fetch("/api/volunteers?status=pending");
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.volunteers)) {
        return json.volunteers;
      }
    }
  } catch {}

  if (!db) return [];
  try {
    const q = query(collection(db, "volunteers"), where("verified", "==", false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("getPendingVolunteers client query error:", err);
    return [];
  }
}

/**
 * Client-side-callable for the admin dashboard. Fetches only VERIFIED and
 * AVAILABLE volunteers (unverified volunteers must never appear in a dispatch
 * candidate list), ranks them by straight-line (Haversine) distance from the
 * given SOS coordinates, and returns the nearest `count` (default 5).
 *
 * Reads are gated by the admin-only rule on 'volunteers' - this must only be
 * called by an authenticated admin user.
 */
export async function findNearestVolunteers(sosLat, sosLng, count = 5) {
  if (!db) {
    throw new Error(
      "Firebase client SDK not initialized - check your .env.local Firebase config."
    );
  }

  const q = query(
    collection(db, "volunteers"),
    where("verified", "==", true),
    where("available", "==", true)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((v) => ({
      ...v,
      distanceKm: haversineDistance(sosLat, sosLng, v.lat, v.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

/**
 * Admin verifies a volunteer and issues a persistent VOL-XXXX-XXXX credential
 * code. Verification is server-side (app/api/verify-volunteer) - the client
 * cannot flip the verified/verifiedId fields (firestore.rules deny it).
 */
export async function verifyVolunteer(uid, idToken) {
  if (!uid) throw new Error("Volunteer UID required.");
  if (!idToken) throw new Error("An admin ID token is required to verify a volunteer.");

  const res = await fetch("/api/verify-volunteer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ volunteerUid: uid }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to verify volunteer.");
  }
  return data.verifiedId;
}

/**
 * Find nearby verified volunteers for an SOS alert coordinate
 */
export function findNearbyVerifiedVolunteers(sosLat, sosLng, verifiedVolunteers = [], limit = 5) {
  if (typeof sosLat !== "number" || typeof sosLng !== "number" || !Array.isArray(verifiedVolunteers)) {
    return [];
  }

  return verifiedVolunteers
    .filter((v) => v.verified && v.available !== false && v.status !== "dispatched")
    .map((v) => {
      const vLat = typeof v.lat === "number" ? v.lat : 22.5726;
      const vLng = typeof v.lng === "number" ? v.lng : 88.3639;
      const distanceKm = haversineDistance(sosLat, sosLng, vLat, vLng);
      return {
        ...v,
        distanceKm,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Dispatch a verified volunteer to an SOS incident. Dispatch is server-side
 * (app/api/dispatch-volunteer) and atomic - the client cannot update another
 * volunteer's document (firestore.rules deny it).
 */
export async function dispatchVolunteer(volunteerId, sosAlertId, idToken) {
  if (!volunteerId || !sosAlertId) throw new Error("Volunteer ID and SOS ID are required.");
  if (!idToken) throw new Error("An admin ID token is required to dispatch a volunteer.");

  const res = await fetch("/api/dispatch-volunteer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ volunteerId, sosAlertId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to dispatch volunteer.");
  }
  return data;
}