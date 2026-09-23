/**
 * Voucher double-redemption concurrency test.
 *
 * Fires N rapid, concurrent redemption requests for the SAME voucher code and
 * asserts exactly one succeeds. The server-side redemption is a Firestore
 * transaction (app/api/redeem-voucher/route.js), so concurrent attempts should
 * be serialized and only the first should win.
 *
 * Usage:
 *   node scripts/test-voucher-concurrency.js <voucher-code> [base-url] [requests]
 *
 *   <voucher-code>  a currently-UNUSED voucher code (e.g. RELIEF-A1B2-C3D4)
 *   [base-url]      app base URL, default http://localhost:3000
 *   [requests]      number of concurrent attempts, default 4
 *
 * Exit code 0 = PASS (exactly one success), 1 = FAIL.
 */

const VOUCHER_CODE = process.argv[2];
const BASE_URL = process.argv[3] || "http://localhost:3000";
const CONCURRENT = Number(process.argv[4] || 4);

if (!VOUCHER_CODE) {
  console.error(
    "Usage: node scripts/test-voucher-concurrency.js <voucher-code> [base-url] [requests]"
  );
  process.exit(1);
}

async function redeem(shopId) {
  const res = await fetch(`${BASE_URL}/api/redeem-voucher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: VOUCHER_CODE, shopId }),
  });
  const body = await res.json().catch(() => ({}));
  return { httpStatus: res.status, ...body };
}

async function main() {
  console.log(
    `Firing ${CONCURRENT} concurrent redemptions for "${VOUCHER_CODE}" → ${BASE_URL}/api/redeem-voucher`
  );

  const attempts = await Promise.all(
    Array.from({ length: CONCURRENT }, (_, i) =>
      redeem(`shop-concurrency-${i + 1}`)
    )
  );

  attempts.forEach((a, i) => {
    console.log(`  attempt ${i + 1}: HTTP ${a.httpStatus} status="${a.status}" message="${a.message}"`);
  });

  const successes = attempts.filter(
    (a) => a.httpStatus === 200 && a.status === "success"
  );
  const alreadyUsed = attempts.filter((a) => a.httpStatus === 409);

  const pass = successes.length === 1 && alreadyUsed.length === CONCURRENT - 1;
  console.log(
    pass
      ? `\nPASS - exactly 1 success, ${alreadyUsed.length} rejected as already-used.`
      : `\nFAIL - expected 1 success, got ${successes.length} (${alreadyUsed.length} already-used).`
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Test errored:", err?.message ?? err);
  process.exit(1);
});