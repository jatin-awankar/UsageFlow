import axios from "axios";
import crypto from "crypto";
import { WebhookDeliveryStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  enqueueWebhookDeliveriesForEvent,
  enqueueWebhookRetryJob,
  refreshWebhookEventStatus,
} from "@/lib/webhooks/events";
import { MAX_WEBHOOK_ATTEMPTS } from "@/lib/webhooks/retryConfig";

function getErrorStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as Record<string, unknown>).response === "object" &&
    (error as { response?: { status?: number } }).response?.status
  ) {
    return (error as { response?: { status?: number } }).response!.status!;
  }

  return 500;
}

function getErrorBody(error: unknown) {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

async function upsertWebhookDelivery(args: {
  webhookEventId: string;
  endpointId: string;
  attempt: number;
  status: WebhookDeliveryStatus;
  responseCode?: number;
  responseBody?: string;
  durationMs?: number;
}) {
  const {
    webhookEventId,
    endpointId,
    attempt,
    status,
    responseCode,
    responseBody,
    durationMs,
  } = args;

  await prisma.webhookDelivery.upsert({
    where: {
      webhookEventId_endpointId_attempt: {
        webhookEventId,
        endpointId,
        attempt,
      },
    },
    update: {
      status,
      responseCode,
      responseBody,
      durationMs,
    },
    create: {
      webhookEventId,
      endpointId,
      attempt,
      status,
      responseCode,
      responseBody,
      durationMs,
    },
  });
}

async function processWebhookEndpoint(
  webhookEventId: string,
  endpointId: string,
  attempt: number
) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
    select: {
      id: true,
      orgId: true,
      type: true,
      payload: true,
      targetEndpointIds: true,
    },
  });

  if (!event) {
    return;
  }

  if (
    event.targetEndpointIds.length > 0 &&
    !event.targetEndpointIds.includes(endpointId)
  ) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: {
      id: endpointId,
    },
    select: {
      id: true,
      orgId: true,
      url: true,
      secret: true,
      active: true,
      events: true,
    },
  });

  if (
    !endpoint ||
    !endpoint.active ||
    endpoint.orgId !== event.orgId ||
    !endpoint.events.includes(event.type)
  ) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  const lastAttempt = await prisma.webhookDelivery.findFirst({
    where: {
      webhookEventId,
      endpointId,
    },
    orderBy: { attempt: "desc" },
    select: {
      attempt: true,
      status: true,
    },
  });

  if (lastAttempt?.status === WebhookDeliveryStatus.SUCCESS) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  const latestAttemptNumber = lastAttempt?.attempt ?? 0;

  if (latestAttemptNumber >= attempt) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  if (latestAttemptNumber !== attempt - 1) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  if (attempt > MAX_WEBHOOK_ATTEMPTS) {
    await refreshWebhookEventStatus(webhookEventId);
    return;
  }

  const payload = JSON.stringify(event.payload);
  const start = Date.now();
  const signature = crypto
    .createHmac("sha256", endpoint.secret)
    .update(payload)
    .digest("hex");

  try {
    const response = await axios.post(endpoint.url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-UsageFlow-Signature": signature,
      },
      timeout: 5000,
    });

    await upsertWebhookDelivery({
      webhookEventId,
      endpointId,
      attempt,
      status: WebhookDeliveryStatus.SUCCESS,
      responseCode: response.status,
      responseBody: response.statusText,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    await upsertWebhookDelivery({
      webhookEventId,
      endpointId,
      attempt,
      status: WebhookDeliveryStatus.FAILED,
      responseCode: getErrorStatusCode(error),
      responseBody: getErrorBody(error),
      durationMs: Date.now() - start,
    });

    if (attempt < MAX_WEBHOOK_ATTEMPTS) {
      await enqueueWebhookRetryJob({
        webhookEventId,
        endpointId,
        attempt: attempt + 1,
      });
    }
  }

  await refreshWebhookEventStatus(webhookEventId);
}

export async function processWebhook(
  webhookEventId: string,
  endpointId?: string,
  attempt = 1
) {
  if (!endpointId) {
    await enqueueWebhookDeliveriesForEvent(webhookEventId);
    return;
  }

  await processWebhookEndpoint(webhookEventId, endpointId, attempt);
}
