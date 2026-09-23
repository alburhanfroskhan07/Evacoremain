"use client";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_SUPPLY_ITEMS = [
  { itemId: "drinking_water", itemName: "Drinking Water", status: "adequate" },
  { itemId: "food", itemName: "Food", status: "adequate" },
  { itemId: "baby_formula", itemName: "Baby Formula", status: "adequate" },
  { itemId: "first_aid", itemName: "First Aid / Medicine", status: "adequate" },
  { itemId: "blankets", itemName: "Blankets", status: "adequate" },
  { itemId: "oxygen", itemName: "Oxygen", status: "adequate" },
];

/**
 * Subscribe to supply items for a specific shelter
 */
export function subscribeToShelterSupplies(shelterId, callback) {
  if (!db || !shelterId) return () => {};

  try {
    const suppliesCol = collection(db, "shelters", shelterId, "supplies");
    return onSnapshot(suppliesCol, (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_SUPPLY_ITEMS);
        return;
      }

      const map = new Map(snapshot.docs.map((d) => [d.id, { itemId: d.id, ...d.data() }]));
      const items = DEFAULT_SUPPLY_ITEMS.map((def) => {
        const existing = map.get(def.itemId);
        return existing
          ? { itemId: def.itemId, itemName: def.itemName, status: existing.status || "adequate" }
          : def;
      });

      callback(items);
    }, (err) => {
      console.warn("Supplies subscription notice:", err);
      callback(DEFAULT_SUPPLY_ITEMS);
    });
  } catch (err) {
    console.warn("Supplies subscription init error:", err);
    callback(DEFAULT_SUPPLY_ITEMS);
    return () => {};
  }
}

/**
 * Update supply item status for a shelter
 */
export async function updateSupplyStatus(shelterId, itemId, itemName, status, uid) {
  if (!db || !shelterId || !itemId) return;

  const ref = doc(db, "shelters", shelterId, "supplies", itemId);
  await setDoc(ref, {
    itemId,
    itemName,
    status,
    updatedAt: serverTimestamp(),
    updatedBy: uid || null,
  }, { merge: true });
}
