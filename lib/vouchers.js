import "server-only";
import { admin, getDb } from "@/lib/firebase-admin";

export const VOUCHER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VOUCHER_LIFETIME_MS = 72 * 60 * 60 * 1000;

// Shared server-side voucher registry (survives when Firestore Admin credentials are not set)
globalThis.__VOUCHER_STORE__ = globalThis.__VOUCHER_STORE__ || new Map();
const voucherStore = globalThis.__VOUCHER_STORE__;

// Pre-seed demo test vouchers
if (!voucherStore.has("DEMO-VOUCHER-UNUSED")) {
  voucherStore.set("DEMO-VOUCHER-UNUSED", {
    code: "DEMO-VOUCHER-UNUSED",
    evacueeName: "Demo Evacuee (Priya Sharma)",
    status: "unused",
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + VOUCHER_LIFETIME_MS).toISOString(),
    redeemedAt: null,
    redeemedByShopId: null,
  });
}
if (!voucherStore.has("DEMO-VOUCHER-USED")) {
  voucherStore.set("DEMO-VOUCHER-USED", {
    code: "DEMO-VOUCHER-USED",
    evacueeName: "Demo Evacuee (Rahul Sen)",
    status: "used",
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + VOUCHER_LIFETIME_MS).toISOString(),
    redeemedAt: new Date(Date.now() - 1800000).toLocaleTimeString(),
    redeemedByShopId: "District Relief Distribution Depot #4",
  });
}
if (!voucherStore.has("DEMO-VOUCHER-EXPIRED")) {
  voucherStore.set("DEMO-VOUCHER-EXPIRED", {
    code: "DEMO-VOUCHER-EXPIRED",
    evacueeName: "Demo Evacuee (Amitava Roy)",
    status: "expired",
    issuedAt: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    redeemedAt: null,
    redeemedByShopId: null,
  });
}

export function getStoredVoucher(code) {
  if (!code) return null;
  return voucherStore.get(code.trim().toUpperCase()) || null;
}

export function saveStoredVoucher(code, data) {
  if (!code) return;
  const key = code.trim().toUpperCase();
  voucherStore.set(key, { ...voucherStore.get(key), ...data, code: key });
}

/**
 * Random unguessable voucher code. Alphabet excludes ambiguous characters
 * (0/O, 1/I, L) so codes can be read/typed by humans and OCR'd reliably.
 */
export function generateVoucherCode(length = 10) {
  const alphabet = VOUCHER_ALPHABET;
  let result = "";

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(length);
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }

  return result;
}

/**
 * Server-only voucher issuance.
 * Creates a 'vouchers' doc with status 'unused' and expiresAt 72 hours from now.
 * Saves to both Cloud Firestore and local server voucher ledger.
 */
export async function generateVoucher(evacueeId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VOUCHER_LIFETIME_MS);
  const code = generateVoucherCode();

  let evacueeName = null;

  try {
    const db = getDb();
    try {
      const evacueeDoc = await db.collection("evacuees").doc(evacueeId).get();
      if (evacueeDoc.exists) {
        evacueeName = evacueeDoc.data()?.name ?? null;
      }
    } catch {}

    await db.collection("vouchers").doc().set({
      code,
      evacueeId,
      evacueeName,
      status: "unused",
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      redeemedAt: null,
      redeemedByShopId: null,
    });
  } catch (err) {
    console.warn("Voucher Firestore save notice:", err?.message);
  }

  // Always record in server-side voucher ledger
  saveStoredVoucher(code, {
    code,
    evacueeId,
    evacueeName,
    status: "unused",
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    redeemedAt: null,
    redeemedByShopId: null,
  });

  return { voucherCode: code, expiresAt: expiresAt.toISOString() };
}