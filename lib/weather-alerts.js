"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Subscribe to the single live meteorological alert document (district_alerts/current)
 */
export function subscribeToWeatherAlert(callback) {
  if (!db) return () => {};

  const alertRef = doc(db, "district_alerts", "current");
  return onSnapshot(alertRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      let lastUpdatedStr = "";
      if (data.lastUpdated?.toDate) {
        lastUpdatedStr = data.lastUpdated.toDate().toISOString();
      } else if (data.lastUpdated?.seconds) {
        lastUpdatedStr = new Date(data.lastUpdated.seconds * 1000).toISOString();
      } else if (typeof data.lastUpdated === "string") {
        lastUpdatedStr = data.lastUpdated;
      } else {
        lastUpdatedStr = String(Date.now());
      }

      callback({
        id: snap.id,
        severity: data.severity || "none",
        headline: data.headline || "",
        lastUpdated: lastUpdatedStr,
        weather: data.weather || null,
        source: data.source || "IMD / OpenWeatherMap",
      });
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Weather alert subscription notice:", err);
    callback(null);
  });
}

/**
 * Admin triggers manual weather alert refresh
 */
export async function triggerWeatherRefresh(idToken) {
  const res = await fetch("/api/ai/refresh-weather-alert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Refresh failed with status ${res.status}`);
  }

  return res.json();
}
