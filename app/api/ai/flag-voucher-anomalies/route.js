import { NextResponse } from "next/server";
import { queryOpenRouter } from "@/lib/openrouter";
import { admin, getDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MAX_REDEMPTIONS_CHECKED = 500;

const SYSTEM_PROMPT = `You are a fraud analyst for a disaster-relief voucher system.
Below are recent voucher redemptions grouped by shop, including each redemption's timestamp and the evacuee's registered location. Identify statistically unusual redemption patterns - for example many redemptions by the same shop in a very short window, implausibly fast consecutive redemptions, or bursts at unusual hours.
Respond with ONLY a JSON object of exactly this shape:
{ "flagged": [ { "voucherId": string, "flagReason": string } ] }
Only flag genuinely suspicious individual vouchers. Use the exact voucherIds provided. If the patterns look normal, return an empty "flagged" array. No markdown fences, no preamble.`;

function toIso(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toMillis(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function formatCoord(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "unknown";
}

/**
 * GET /api/ai/flag-voucher-anomalies
 *
 * Pulls vouchers redeemed in the last 24h, groups them by redeemedByShopId,
 * and asks OpenRouter LLM to flag statistically unusual redemption patterns. Flagged
 * vouchers get isFlagged: true + flagReason written back via the Admin SDK.
 */
export async function GET() {
  const db = getDb();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - LOOKBACK_MS);

  const snap = await db
    .collection("vouchers")
    .where("redeemedAt", ">=", cutoff)
    .limit(MAX_REDEMPTIONS_CHECKED)
    .get();

  const vouchers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const voucherIds = new Set(vouchers.map((v) => v.id));

  if (vouchers.length === 0) {
    return NextResponse.json(
      { flagged: [], checkedCount: 0, shopCount: 0 },
      { status: 200 }
    );
  }

  // Attach the evacuee's registration coordinates as a proxy for "issued at"
  // location (the voucher schema itself has no location).
  const evacueeIds = [...new Set(vouchers.map((v) => v.evacueeId).filter(Boolean))];
  const evacueeCoords = new Map();
  await Promise.all(
    evacueeIds.map(async (evacueeId) => {
      try {
        const eSnap = await db.collection("evacuees").doc(evacueeId).get();
        if (eSnap.exists) {
          const d = eSnap.data();
          evacueeCoords.set(evacueeId, { lat: d.lat, lng: d.lng });
        }
      } catch {
        // Best-effort enrichment - a missing evacuee just means "unknown".
      }
    })
  );

  // Group by redeemedByShopId.
  const groups = new Map();
  for (const v of vouchers) {
    const shopId = v.redeemedByShopId || "unknown";
    if (!groups.has(shopId)) groups.set(shopId, []);
    groups.get(shopId).push(v);
  }

  const groupEntries = [...groups.entries()]
    .map(([shopId, list]) => ({
      shopId,
      list: list.sort((a, b) => toMillis(a.redeemedAt) - toMillis(b.redeemedAt)),
    }))
    .sort((a, b) => b.list.length - a.list.length);

  const prompt = groupEntries
    .map(({ shopId, list }) => {
      const lines = list.map((v) => {
        const coords = v.evacueeId ? evacueeCoords.get(v.evacueeId) : null;
        const loc = coords
          ? `(${formatCoord(coords.lat)}, ${formatCoord(coords.lng)})`
          : "unknown";
        return `  - voucher: ${v.id}, redeemed at ${toIso(v.redeemedAt) ?? "unknown"}, evacuee registered at ${loc}`;
      });
      return `Shop: ${shopId} - ${list.length} redemptions\n${lines.join("\n")}`;
    })
    .join("\n\n");

  let flagged = [];
  try {
    const parsed = await queryOpenRouter({
      prompt: `Recent voucher redemptions (last 24 hours):\n\n${prompt}`,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.2,
      responseFormatJson: true,
    });

    const flaggedInput = Array.isArray(parsed?.flagged) ? parsed.flagged : [];

    flagged = flaggedInput
      .filter(
        (f) =>
          f &&
          typeof f.voucherId === "string" &&
          voucherIds.has(f.voucherId)
      )
      .map((f) => ({
        voucherId: f.voucherId,
        flagReason: String(f.flagReason ?? "Unusual redemption pattern.").slice(0, 300),
      }));
  } catch (aiErr) {
    console.warn("AI voucher anomaly detector fallback to statistical heuristic:", aiErr?.message);
    // Algorithmic statistical anomaly detection
    const shopTimestamps = new Map();
    flagged = [];
    for (const v of vouchers) {
      const sId = v.redeemedByShopId || "unknown";
      const ts = toMillis(v.redeemedAt);
      if (!shopTimestamps.has(sId)) shopTimestamps.set(sId, []);
      const history = shopTimestamps.get(sId);
      // If 3 redemptions happened within 2 minutes at the same shop
      const recentCount = history.filter((t) => ts - t < 120000).length;
      if (recentCount >= 2) {
        flagged.push({
          voucherId: v.id,
          flagReason: "Rapid redemption burst: multiple vouchers claimed within 120 seconds at the same merchant.",
        });
      }
      history.push(ts);
    }
  }

  if (flagged.length > 0) {
    try {
      const batch = db.batch();
      for (const { voucherId, flagReason } of flagged) {
        batch.update(db.collection("vouchers").doc(voucherId), {
          isFlagged: true,
          flagReason,
          flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch {}
  }

  return NextResponse.json(
    {
      success: true,
      flagged,
      anomalies: flagged,
      checkedCount: vouchers.length,
      shopCount: groupEntries.length,
    },
    { status: 200 }
  );
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.vouchers) && body.vouchers.length > 0) {
      // Direct analysis of provided vouchers list
      const seen = new Map();
      const anomalies = [];
      for (const v of body.vouchers) {
        const key = v.code || v.voucherId || v.id;
        if (seen.has(key)) {
          anomalies.push({
            voucherId: key,
            code: key,
            flagReason: `Rapid concurrent redemption detected across shop ${seen.get(key)} and ${v.shopId || "unknown"}.`,
          });
        } else {
          seen.set(key, v.shopId || "shop");
        }
      }
      return NextResponse.json({
        success: true,
        flagged: anomalies,
        anomalies,
        checkedCount: body.vouchers.length,
      });
    }
  } catch {}
  return GET();
}