"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { queueOfflineHazard } from "./offline-sync";

export const HAZARD_TYPES = [
  { type: "waterlogged", label: "Waterlogged Road", subText: "Deep or flowing floodwater", color: "bg-[#0284C7] border-[#0284C7] text-white" },
  { type: "bridge_closed", label: "Bridge Closed", subText: "Structural damage or overflow", color: "bg-[#DC2626] border-[#DC2626] text-white" },
  { type: "fallen_tree", label: "Fallen Tree", subText: "Blocked road or passage", color: "bg-[#D97706] border-[#D97706] text-white" },
  { type: "power_line", label: "Power Line Down", subText: "Live wire hazard", color: "bg-[#7C3AED] border-[#7C3AED] text-white" },
];

/**
 * Report a new hazard to Firestore
 */
export async function reportHazard({ type, lat, lng, reportedBy = "evacuee", aiAnalysis = null }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Valid coordinates are required.");
  }

  try {
    const res = await fetch("/api/report-hazard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, lat, lng, aiAnalysis }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to submit hazard report.");
    }

    return { id: data.id || `haz-${Date.now()}`, type, lat, lng, status: "active", aiAnalysis, aiVerified: Boolean(data.aiVerified) };
  } catch (err) {
    console.warn("Hazard report network error, queuing offline:", err.message);
    const queued = queueOfflineHazard({ type, lat, lng, aiAnalysis });
    return { ...queued, isOfflineQueued: true };
  }
}

/**
 * Subscribe to active hazards
 */
export function subscribeToHazards(callback) {
  if (!db) return () => {};

  try {
    const q = query(
      collection(db, "hazards"),
      where("status", "==", "active")
    );

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(list);
    }, (err) => {
      console.warn("Hazards subscription notice:", err);
      callback([]);
    });
  } catch (err) {
    console.warn("Hazards subscription error:", err);
    callback([]);
    return () => {};
  }
}

/**
 * Verify a hazard still exists (+1 crowd verification)
 */
export async function verifyHazard(hazardId) {
  if (!hazardId) return { success: false };

  try {
    const res = await fetch(`/api/hazards/${encodeURIComponent(hazardId)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to verify hazard.");
    }
    return { success: true, verifiedCount: data.verifiedCount };
  } catch (apiErr) {
    console.warn("Verify hazard API notice, attempting fallback:", apiErr.message);
    if (db) {
      try {
        const ref = doc(db, "hazards", hazardId);
        await updateDoc(ref, {
          verifiedCount: increment(1),
        });
        return { success: true };
      } catch (directErr) {
        console.warn("Client direct write prevented by rules:", directErr.message);
      }
    }
    return { success: true, optimistic: true };
  }
}

/**
 * Mark a hazard as resolved / cleared (Road cleared, tree removed, water drained)
 */
export async function resolveHazard(hazardId, { resolvedBy = "coordinator" } = {}) {
  if (!hazardId) return { success: false };

  try {
    const res = await fetch(`/api/hazards/${encodeURIComponent(hazardId)}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedBy }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to resolve hazard.");
    }
    return { success: true, status: "resolved" };
  } catch (apiErr) {
    console.warn("Resolve hazard API notice, attempting fallback:", apiErr.message);
    if (db) {
      try {
        const ref = doc(db, "hazards", hazardId);
        await updateDoc(ref, {
          status: "resolved",
          cleared: true,
          resolvedAt: serverTimestamp(),
        });
        return { success: true, status: "resolved" };
      } catch (directErr) {
        console.warn("Client direct write prevented by rules:", directErr.message);
      }
    }
    return { success: true, status: "resolved", optimistic: true };
  }
}

/**
 * Dismiss a false hazard (Admin only)
 */
export async function dismissHazard(hazardId) {
  if (!hazardId) return { success: false };

  try {
    const res = await fetch(`/api/hazards/${encodeURIComponent(hazardId)}/dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "demo-admin-token" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to dismiss hazard.");
    }
    return { success: true, status: "dismissed" };
  } catch (apiErr) {
    console.warn("Dismiss hazard API notice, attempting fallback:", apiErr.message);
    if (db) {
      try {
        const ref = doc(db, "hazards", hazardId);
        await updateDoc(ref, {
          status: "dismissed",
          dismissedAt: serverTimestamp(),
        });
        return { success: true, status: "dismissed" };
      } catch (directErr) {
        console.warn("Client direct write prevented by rules:", directErr.message);
      }
    }
    return { success: true, status: "dismissed", optimistic: true };
  }
}
