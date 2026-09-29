import { createHmac, timingSafeEqual } from "node:crypto";

// Pass the HTTP body Buffer unchanged. Verify before parsing or normalizing JSON.
export function verifyBillingRequest(rawBody, timestampHeader, signatureHeader, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || typeof timestampHeader !== "string" ||
      !/^(0|[1-9][0-9]*)$/.test(timestampHeader) || typeof signatureHeader !== "string" ||
      !/^v1=[0-9a-f]{64}$/.test(signatureHeader) || typeof secret !== "string" || !secret) return null;
  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return null;
  const expected = createHmac("sha256", secret).update(timestampHeader).update(".").update(rawBody).digest();
  const supplied = Buffer.from(signatureHeader.slice(3), "hex");
  if (!timingSafeEqual(expected, supplied)) return null;
  try {
    const event = JSON.parse(rawBody.toString("utf8"));
    if (!event || typeof event !== "object" || Array.isArray(event) ||
        typeof event.id !== "string" || !event.id ||
        !["invoice.finalized", "invoice.revised"].includes(event.type) ||
        typeof event.createdAt !== "string" || !Number.isFinite(Date.parse(event.createdAt)) ||
        typeof event.organizationId !== "string" || !event.organizationId ||
        typeof event.billingRecordVersionId !== "string" || !event.billingRecordVersionId ||
        !event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) return null;
    return event;
  } catch { return null; }
}

// Keep only one previous key. Expiry is exclusive at the exact 24-hour mark.
export function verifyRotatingBillingRequest(rawBody, timestampHeader, signatureHeader,
    currentSecret, previousSecret, previousSecretExpiresAt, now = new Date()) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const current = verifyBillingRequest(rawBody, timestampHeader, signatureHeader, currentSecret, nowSeconds);
  if (current) return current;
  if (!previousSecret || !previousSecretExpiresAt || now.getTime() >= new Date(previousSecretExpiresAt).getTime()) return null;
  return verifyBillingRequest(rawBody, timestampHeader, signatureHeader, previousSecret, nowSeconds);
}
