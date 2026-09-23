"use client";

import { idbGet, idbGetAll, idbSet, idbDelete, STORES } from "./idb-storage";

const STORAGE_KEY = "RELIEF_FAMILY_PASSES_VAULT_V1";

/**
 * Get all registered family passes stored in IndexedDB (with sync cache fallback)
 */
export function getSavedFamilyPasses() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load cached family passes:", err);
    return [];
  }
}

/**
 * Asynchronously fetch all passes directly from IndexedDB
 */
export async function getSavedFamilyPassesAsync() {
  const passes = await idbGetAll(STORES.FAMILY_PASSES);
  if (passes && passes.length > 0) {
    // Update local cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
    } catch {}
    return passes;
  }
  return getSavedFamilyPasses();
}

/**
 * Save a new family pass to IndexedDB + sync cache
 */
export function saveFamilyPass(pass) {
  if (typeof window === "undefined" || !pass) return;
  try {
    const passes = getSavedFamilyPasses();
    const id = pass.id || `pass-${Date.now()}`;
    const newEntry = {
      ...pass,
      id,
      savedAt: pass.savedAt || new Date().toISOString(),
    };

    // Filter out if existing with same id, then prepend
    const updated = [newEntry, ...passes.filter((p) => p.id !== id && p.voucherCode !== pass.voucherCode)];
    
    // 1. Sync cache (for 0ms instant render)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch {}

    // 2. High-capacity IndexedDB persistence
    idbSet(STORES.FAMILY_PASSES, newEntry).catch((err) => {
      console.warn("IndexedDB saveFamilyPass error:", err);
    });

    return newEntry;
  } catch (err) {
    console.warn("Failed to save family pass:", err);
  }
}

/**
 * Delete a family pass from IndexedDB + sync cache
 */
export function deleteFamilyPass(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const passes = getSavedFamilyPasses();
    const filtered = passes.filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}

    // Delete from IndexedDB
    idbDelete(STORES.FAMILY_PASSES, id).catch(() => {});

    return filtered;
  } catch (err) {
    console.warn("Failed to delete family pass:", err);
  }
}
