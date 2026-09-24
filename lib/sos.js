"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

function getClientDb() {
  return db;
}

/**
 * Raise an SOS alert (Master PRD Section 7 & Section 4).
 * Accessible to ANY user (authenticated or unauthenticated public).
 * Saves to `sos_alerts` as status: "open" and triggers AI triage classification.
 */
export async function raiseSOS({ lat, lng, message }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("lat and lng are required.");
  }

  const firestoreDb = getClientDb();
  let alertId = `sos-${Date.now()}`;

  const payload = {
    lat,
    lng,
    message: message ?? null,
    status: "open",
    category: "other",
    urgencyLevel: "medium",
    raisedAt: new Date().toISOString(),
  };

  if (firestoreDb) {
    try {
      const ref = doc(collection(firestoreDb, "sos_alerts"));
      alertId = ref.id;
      await setDoc(ref, {
        lat,
        lng,
        message: message ?? null,
        status: "open",
        raisedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore client write error (continuing with API fallback):", err);
    }
  }

  // Triage (F8): chain AI classification in background
  const triageUrl = (typeof window !== "undefined" && window.location?.origin)
    ? "/api/ai/triage-sos"
    : `${process.env.BASE_URL || "http://localhost:3000"}/api/ai/triage-sos`;
  fetch(triageUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, message }),
  }).catch((e) => console.warn("Background AI triage notice:", e));

  return { id: alertId, ...payload };
}

/**
 * Live-listener on SOS alerts, newest first. Returns an unsubscribe function.
 */
export function subscribeToSOSAlerts(callback) {
  const firestoreDb = getClientDb();
  if (!firestoreDb) return () => {};

  try {
    const q = query(
      collection(firestoreDb, "sos_alerts"),
      orderBy("raisedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(alerts);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("SOS subscription error:", err);
    return () => {};
  }
}

/**
 * Mark an SOS alert as resolved in Firestore
 */
export async function resolveSOS(alertId) {
  if (!alertId) return;
  const firestoreDb = getClientDb();
  if (firestoreDb) {
    try {
      const ref = doc(firestoreDb, "sos_alerts", alertId);
      await updateDoc(ref, {
        status: "resolved",
        isLiveTracking: false,
        resolvedAt: serverTimestamp(),
      });
    } catch {}
  }
}

/**
 * Update live location coordinates for an active SOS distress alert.
 * Uses both direct Firestore write and the Admin SDK API fallback.
 */
export async function updateSOSLocation({ alertId, lat, lng, accuracy, speed, heading }) {
  if (!alertId || typeof lat !== "number" || typeof lng !== "number") return null;

  const firestoreDb = getClientDb();
  if (firestoreDb) {
    try {
      const ref = doc(firestoreDb, "sos_alerts", alertId);
      await updateDoc(ref, {
        lat,
        lng,
        liveLat: lat,
        liveLng: lng,
        accuracy: typeof accuracy === "number" ? accuracy : null,
        speed: typeof speed === "number" ? speed : null,
        heading: typeof heading === "number" ? heading : null,
        isLiveTracking: true,
        lastLiveLocationUpdate: serverTimestamp(),
      });
    } catch (err) {
      // Handled by API call fallback below
    }
  }

  // Ensure persistent backend update via Admin API
  try {
    const res = await fetch("/api/sos/update-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, lat, lng, accuracy, speed, heading }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Live SOS location update network note:", err);
  }
  return null;
}