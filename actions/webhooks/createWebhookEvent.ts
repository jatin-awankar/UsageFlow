"use server";

import { createWebhookEventRecord } from "@/lib/webhooks/events";

export async function createWebhookEvent(
  orgId: string,
  type: string,
  payload: unknown
) {
  return createWebhookEventRecord(orgId, type, payload);
}
