"use server";

import { requireCurrentUser } from "@/lib/auth/session";
import { replayBillingWebhookForActor } from "@/lib/webhooks/replay-billing";

export async function replayBillingWebhook(input: {
  orgId: string;
  eventId: string;
  endpointId: string;
  idempotencyKey: string;
  reason: string;
}) {
  const actor = await requireCurrentUser();
  return replayBillingWebhookForActor(input, actor.id);
}
