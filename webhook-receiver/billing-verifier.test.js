import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyBillingRequest } from "./billing-verifier.js";

test("billing signatures allow five minutes of clock skew in either direction", () => {
  const now = 1_800_000_000;
  const secret = "test-secret";
  const body = Buffer.from(JSON.stringify({
    id: "boundary-event",
    type: "invoice.finalized",
    createdAt: "2026-09-29T00:00:00.000Z",
    organizationId: "test-org",
    billingRecordVersionId: "test-version",
    payload: { amount: "1.000" },
  }));

  function verifyAt(offset) {
    const timestamp = String(now + offset);
    const signature = `v1=${createHmac("sha256", secret).update(timestamp).update(".").update(body).digest("hex")}`;
    return verifyBillingRequest(body, timestamp, signature, secret, now);
  }

  for (const offset of [-300, 0, 300]) {
    assert.equal(verifyAt(offset)?.id, "boundary-event");
  }
  for (const offset of [-301, 301]) {
    assert.equal(verifyAt(offset), null);
  }
});
