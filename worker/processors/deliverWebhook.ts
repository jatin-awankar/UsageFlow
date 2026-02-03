import axios from "axios";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getBackoffDelay } from "@/lib/webhooks/backoff";
import { MAX_WEBHOOK_ATTEMPTS } from "@/lib/webhooks/retryConfig";

export async function processWebhook(eventId: string) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) return;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      orgId: event.orgId,
      active: true,
      events: { has: event.type },
    },
  });

  for (const endpoint of endpoints) {
    // 🔍 Get last attempt for this event + endpoint
    const lastAttempt = await prisma.webhookDelivery.findFirst({
      where: {
        webhookEventId: event.id,
        endpointId: endpoint.id,
      },
      orderBy: { attempt: "desc" },
    });

    const nextAttempt = lastAttempt ? lastAttempt.attempt + 1 : 1;

    // ⛔ Stop retrying
    if (nextAttempt > MAX_WEBHOOK_ATTEMPTS) continue;

    // ⏱ Apply backoff
    if (nextAttempt > 1) {
      const delay = getBackoffDelay(nextAttempt);
      await new Promise((res) => setTimeout(res, delay));
    }

    const payload = JSON.stringify(event.payload);
    const start = Date.now();

    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(payload)
      .digest("hex");

    try {
      const res = await axios.post(endpoint.url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-UsageFlow-Signature": signature,
        },
        timeout: 5000,
      });

      await prisma.webhookDelivery.create({
        data: {
          webhookEventId: event.id,
          endpointId: endpoint.id,
          attempt: nextAttempt,
          status: "SUCCESS",
          responseCode: res.status,
          responseBody: res.statusText,
          durationMs: Date.now() - start,
        },
      });
    } catch (err) {
      await prisma.webhookDelivery.create({
        data: {
          webhookEventId: event.id,
          endpointId: endpoint.id,
          attempt: nextAttempt,
          status: "FAILED",
          responseCode: (typeof err === 'object' && err !== null && 'response' in err && typeof (err as Record<string, unknown>).response === 'object' && (err as { response?: { status?: number } }).response?.status)
            ? (err as { response?: { status?: number } }).response!.status!
            : 500,
          responseBody:
            err instanceof Error ? err.message : JSON.stringify(err),
          durationMs: Date.now() - start,
        },
      });
    }
  }
}
