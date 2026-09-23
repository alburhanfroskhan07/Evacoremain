"use client";

import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Subscribe to live reunification alerts from Firestore with API fallback
 */
export function subscribeToReunificationAlerts(callback) {
  if (!db) {
    fetchReunificationAlerts().then(callback).catch(() => callback([]));
    return () => {};
  }

  try {
    const q = collection(db, "reunification_alerts");
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          fetchReunificationAlerts().then(callback);
          return;
        }
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(list);
      },
      (err) => {
        console.warn("Reunification subscription notice, using API:", err);
        fetchReunificationAlerts().then(callback);
      }
    );
  } catch (err) {
    console.warn("Reunification listener error:", err);
    fetchReunificationAlerts().then(callback);
    return () => {};
  }
}

/**
 * Fetch all alerts via API
 */
export async function fetchReunificationAlerts() {
  try {
    const res = await fetch("/api/reunification/alerts");
    const data = await res.json().catch(() => ({}));
    return data.alerts || [];
  } catch (err) {
    console.warn("Fetch alerts failed:", err);
    return [];
  }
}

/**
 * Upload an evacuee's photo captured at a shelter intake to the cloud repository
 */
export async function uploadShelterSighting(payload) {
  const res = await fetch("/api/shelter-sightings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to upload shelter intake photo.");
  }
  return data;
}

/**
 * Fetch all shelter intake sightings (optionally filtered by shelterId)
 */
export async function fetchShelterSightings(shelterId = null) {
  try {
    const url = shelterId ? `/api/shelter-sightings?shelterId=${encodeURIComponent(shelterId)}` : "/api/shelter-sightings";
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    return data.sightings || [];
  } catch (err) {
    console.warn("Fetch shelter sightings failed:", err);
    return [];
  }
}

/**
 * Subscribe to live shelter intake sightings from Firestore with API fallback
 */
export function subscribeToShelterSightings(callback, shelterId = null) {
  if (!db) {
    fetchShelterSightings(shelterId).then(callback).catch(() => callback([]));
    return () => {};
  }

  try {
    const q = collection(db, "shelter_sightings");
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          fetchShelterSightings(shelterId).then(callback);
          return;
        }
        let list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (shelterId) {
          list = list.filter((item) => item.shelterId === shelterId);
        }
        callback(list);
      },
      (err) => {
        console.warn("Shelter sightings listener error, using API fallback:", err);
        fetchShelterSightings(shelterId).then(callback);
      }
    );
  } catch (err) {
    fetchShelterSightings(shelterId).then(callback);
    return () => {};
  }
}

/**
 * Run AI photo match scan against area photos / preset scenarios
 */
export async function runAIPhotoMatch(payload) {
  const res = await fetch("/api/ai/match-family-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to process AI photo match scan.");
  }
  return data;
}

/**
 * Record Coordinator / Admin decision: "mila" or "nahi_mila"
 * Safely handles fallback alert ID if unassigned.
 */
export async function recordReunificationDecision({ alertId, decision, notes = "", verifiedBy = "Coordinator", role = "coordinator" }) {
  if (!decision) {
    throw new Error("Decision ('mila' or 'nahi_mila') is required.");
  }

  const effectiveId = alertId || `reunif_${Date.now()}`;

  const res = await fetch(`/api/reunification/${encodeURIComponent(effectiveId)}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, notes, verifiedBy, role }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to record reunification decision.");
  }
  return data;
}
