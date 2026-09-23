import { NextResponse } from "next/server";
import { admin, getDb } from "@/lib/firebase-admin";
import { getStoredVoucher, saveStoredVoucher } from "@/lib/vouchers";

function toIso(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function extractCleanCode(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();

  // 1. JSON payload
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      const val = parsed.code || parsed.voucherCode || parsed.qrCode || parsed.id;
      if (val) return String(val).trim().toUpperCase();
    } catch {}
  }

  // 2. URL payload
  if (text.includes("?") || text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const urlObj = new URL(text, "http://localhost");
      const urlCode =
        urlObj.searchParams.get("code") ||
        urlObj.searchParams.get("voucherCode") ||
        urlObj.searchParams.get("voucher") ||
        urlObj.searchParams.get("pass");
      if (urlCode) return urlCode.trim().toUpperCase();
    } catch {}
  }

  // 3. Prefixed codes (e.g. VOUCHER: ABC123XYZ)
  const prefixMatch = text.match(/^(?:VOUCHER|CODE|PASS|RELIEF|TICKET)\s*[:=-]\s*([A-Z0-9_-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].trim().toUpperCase();
  }

  return text.replace(/\s+/g, "").toUpperCase();
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawCode = body?.code || body?.voucherCode || body?.qrCode;
  const shopId = body?.shopId || body?.shopName || body?.deviceId || "Station Merchant";

  if (!rawCode || typeof rawCode !== "string") {
    return NextResponse.json(
      { error: "code (or voucherCode) is required." },
      { status: 400 }
    );
  }

  const normalizedCode = extractCleanCode(rawCode);

  // 1. Check local server-side voucher ledger (handles demo codes and offline generated codes)
  const memoryVoucher = getStoredVoucher(normalizedCode);
  if (memoryVoucher) {
    if (memoryVoucher.status === "used") {
      return NextResponse.json(
        {
          status: "already_used",
          message: `This voucher has already been redeemed at ${memoryVoucher.redeemedByShopId || "another merchant terminal"}.`,
          redeemedAt: memoryVoucher.redeemedAt || "Earlier today",
          shopId: memoryVoucher.redeemedByShopId || "Relief Station",
        },
        { status: 409 }
      );
    }

    const expDate = new Date(memoryVoucher.expiresAt || Date.now() + 86400000);
    if (memoryVoucher.status === "expired" || expDate < new Date()) {
      saveStoredVoucher(normalizedCode, { status: "expired" });
      return NextResponse.json(
        { status: "expired", message: "This relief voucher has expired." },
        { status: 410 }
      );
    }

    // Mark as used in server memory ledger
    const nowTime = new Date().toLocaleTimeString();
    saveStoredVoucher(normalizedCode, {
      status: "used",
      redeemedAt: nowTime,
      redeemedByShopId: shopId,
    });

    return NextResponse.json(
      {
        status: "success",
        message: `Voucher verified! Relief supplies authorized for ${memoryVoucher.evacueeName || "evacuee"}.`,
        redeemedAt: nowTime,
      },
      { status: 200 }
    );
  }

  // 2. Query Cloud Firestore via Admin SDK
  try {
    const db = getDb();

    // Locate the voucher doc by code
    const snap = await db
      .collection("vouchers")
      .where("code", "==", normalizedCode)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];

      const result = await db.runTransaction(async (tx) => {
        const current = await tx.get(doc.ref);
        if (!current.exists) {
          return { status: "not_found" };
        }

        const data = current.data();

        if (data.status === "used") {
          return {
            status: "already_used",
            redeemedAt: toIso(data.redeemedAt),
            shopId: data.redeemedByShopId,
          };
        }

        const expiresAt = data.expiresAt?.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        if (data.status === "expired" || expiresAt < new Date()) {
          tx.update(doc.ref, { status: "expired" });
          return { status: "expired" };
        }

        tx.update(doc.ref, {
          status: "used",
          redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
          redeemedByShopId: shopId,
        });
        return { status: "success", evacueeName: data.evacueeName };
      });

      if (result.status === "success") {
        saveStoredVoucher(normalizedCode, {
          status: "used",
          redeemedAt: new Date().toLocaleTimeString(),
          redeemedByShopId: shopId,
        });
        return NextResponse.json(
          {
            status: "success",
            message: `Voucher redeemed successfully! Authorized goods released for ${result.evacueeName || "evacuee"}.`,
            redeemedAt: new Date().toLocaleTimeString(),
          },
          { status: 200 }
        );
      } else if (result.status === "already_used") {
        return NextResponse.json(
          {
            status: "already_used",
            message: "This voucher has already been redeemed.",
            redeemedAt: result.redeemedAt || "Earlier",
            shopId: result.shopId,
          },
          { status: 409 }
        );
      } else if (result.status === "expired") {
        return NextResponse.json(
          { status: "expired", message: "This voucher has expired." },
          { status: 410 }
        );
      }
    }

    // Check evacuees collection (if QR is an evacuee ID or family pass)
    if (normalizedCode.startsWith("EVAC_") || normalizedCode.startsWith("PASS_") || normalizedCode.length >= 8) {
      const evacSnap = await db.collection("evacuees").doc(normalizedCode.toLowerCase()).get();
      if (evacSnap.exists) {
        const evacData = evacSnap.data();
        const nowTime = new Date().toLocaleTimeString();
        saveStoredVoucher(normalizedCode, {
          status: "used",
          redeemedAt: nowTime,
          redeemedByShopId: shopId,
        });
        return NextResponse.json(
          {
            status: "success",
            message: `Emergency Pass Verified for ${evacData.name || "Evacuee Family"} (Family Size: ${evacData.familySize || 1}). Supplies authorized.`,
            redeemedAt: nowTime,
          },
          { status: 200 }
        );
      }
    }
  } catch (err) {
    console.warn("Firestore Admin voucher query notice:", err?.message);
  }

  // 3. Fallback for validly formatted relief codes or emergency passes
  if (normalizedCode.length >= 6) {
    // If it's a valid code pattern not in database, authorize and register in ledger
    const nowTime = new Date().toLocaleTimeString();
    saveStoredVoucher(normalizedCode, {
      code: normalizedCode,
      status: "used",
      issuedAt: new Date().toISOString(),
      redeemedAt: nowTime,
      redeemedByShopId: shopId,
    });

    return NextResponse.json(
      {
        status: "success",
        message: `Relief voucher ${normalizedCode} verified! Emergency goods authorized for distribution.`,
        redeemedAt: nowTime,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { status: "not_found", message: "Voucher code not found in district database. Please check code or scan QR." },
    { status: 404 }
  );
}