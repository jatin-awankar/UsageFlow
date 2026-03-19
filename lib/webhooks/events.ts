import {
  Prisma,
  WebhookDeliveryStatus,
  WebhookEventStatus,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { usageQueue } from "@/lib/queue";
import { getBackoffDelay } from "./backoff";
import { MAX_WEBHOOK_ATTEMPTS } from "./retryConfig";

const DELIVERY_JOB_NAME = "DELIVER_WEBHOOK";

type WebhookEventSnapshot = {
  id: string;
  orgId: string;
  type: string;
  status: WebhookEventStatus;
  targetEndpointIds: string[];
};

function normalizeJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function getWebhookDeliveryJobId(
  webhookEventId: string,
  endpointId: string,
  attempt: number
) {
  return `deliver-webhook:${webhookEventId}:${endpointId}:${attempt}`;
}

async function loadActiveEndpointIds(orgId: string, type: string) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      orgId,
      active: true,
      events: { has: type },
    },
    select: {
      id: true,
    },
  });

  return endpoints.map((endpoint) => endpoint.id);
}

async function updateWebhookEventTargets(
  event: WebhookEventSnapshot,
  targetEndpointIds: string[]
) {
  const nextStatus =
    targetEndpointIds.length > 0
      ? WebhookEventStatus.PENDING
      : WebhookEventStatus.DELIVERED;

  await prisma.webhookEvent.update({
    where: {
      id: event.id,
    },
    data: {
      status: nextStatus,
      targetEndpointIds,
    },
  });

  return targetEndpointIds;
}

export async function resolveWebhookTargetEndpointIds(
  event: WebhookEventSnapshot
) {
  if (event.targetEndpointIds.length > 0) {
    return event.targetEndpointIds;
  }

  if (event.status !== WebhookEventStatus.PENDING) {
    return event.targetEndpointIds;
  }

  const targetEndpointIds = await loadActiveEndpointIds(event.orgId, event.type);
  return updateWebhookEventTargets(event, targetEndpointIds);
}

export async function enqueueWebhookDeliveryJob({
  webhookEventId,
  endpointId,
  attempt,
  delayMs = 0,
}: {
  webhookEventId: string;
  endpointId: string;
  attempt: number;
  delayMs?: number;
}) {
  return usageQueue.add(
    DELIVERY_JOB_NAME,
    {
      webhookEventId,
      endpointId,
      attempt,
    },
    {
      delay: Math.max(0, delayMs),
      jobId: getWebhookDeliveryJobId(webhookEventId, endpointId, attempt),
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
}

export async function enqueueWebhookRetryJob({
  webhookEventId,
  endpointId,
  attempt,
}: {
  webhookEventId: string;
  endpointId: string;
  attempt: number;
}) {
  return enqueueWebhookDeliveryJob({
    webhookEventId,
    endpointId,
    attempt,
    delayMs: getBackoffDelay(attempt),
  });
}

export async function refreshWebhookEventStatus(webhookEventId: string) {
  const event = await prisma.webhookEvent.findUnique({
    where: {
      id: webhookEventId,
    },
    select: {
      id: true,
      orgId: true,
      type: true,
      status: true,
      targetEndpointIds: true,
    },
  });

  if (!event) {
    return null;
  }

  const snapshotTargetEndpointIds = await resolveWebhookTargetEndpointIds(event);

  if (snapshotTargetEndpointIds.length === 0) {
    if (event.status === WebhookEventStatus.FAILED) {
      return WebhookEventStatus.FAILED;
    }

    if (event.status !== WebhookEventStatus.DELIVERED) {
      await prisma.webhookEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: WebhookEventStatus.DELIVERED,
        },
      });
    }

    return WebhookEventStatus.DELIVERED;
  }

  const activeTrackedEndpoints = await prisma.webhookEndpoint.findMany({
    where: {
      id: {
        in: snapshotTargetEndpointIds,
      },
      active: true,
      events: { has: event.type },
      orgId: event.orgId,
    },
    select: {
      id: true,
    },
  });

  const trackedEndpointIds = activeTrackedEndpoints.map((endpoint) => endpoint.id);

  const latestDeliveries = trackedEndpointIds.length
    ? await prisma.webhookDelivery.findMany({
        where: {
          webhookEventId,
          endpointId: {
            in: trackedEndpointIds,
          },
        },
        orderBy: [{ endpointId: "asc" }, { attempt: "desc" }],
        select: {
          endpointId: true,
          attempt: true,
          status: true,
        },
      })
    : [];

  const latestByEndpointId = new Map<
    string,
    {
      attempt: number;
      status: WebhookDeliveryStatus;
    }
  >();

  for (const delivery of latestDeliveries) {
    if (!latestByEndpointId.has(delivery.endpointId)) {
      latestByEndpointId.set(delivery.endpointId, {
        attempt: delivery.attempt,
        status: delivery.status,
      });
    }
  }

  let hasPending = false;
  let hasFailure = false;

  for (const endpointId of trackedEndpointIds) {
    const latestDelivery = latestByEndpointId.get(endpointId);

    if (!latestDelivery) {
      hasPending = true;
      continue;
    }

    if (latestDelivery.status === WebhookDeliveryStatus.SUCCESS) {
      continue;
    }

    if (latestDelivery.attempt < MAX_WEBHOOK_ATTEMPTS) {
      hasPending = true;
      continue;
    }

    hasFailure = true;
  }

  const nextStatus = hasPending
    ? WebhookEventStatus.PENDING
    : hasFailure
      ? WebhookEventStatus.FAILED
      : WebhookEventStatus.DELIVERED;

  if (
    event.status !== nextStatus ||
    trackedEndpointIds.length !== snapshotTargetEndpointIds.length
  ) {
    await prisma.webhookEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: nextStatus,
        targetEndpointIds: trackedEndpointIds,
      },
    });
  }

  return nextStatus;
}

export async function enqueueWebhookDeliveriesForEvent(webhookEventId: string) {
  const event = await prisma.webhookEvent.findUnique({
    where: {
      id: webhookEventId,
    },
    select: {
      id: true,
      orgId: true,
      type: true,
      status: true,
      targetEndpointIds: true,
    },
  });

  if (!event) {
    return { enqueued: 0, targetEndpointIds: [] as string[] };
  }

  const targetEndpointIds = await resolveWebhookTargetEndpointIds(event);

  if (targetEndpointIds.length === 0) {
    await refreshWebhookEventStatus(event.id);
    return { enqueued: 0, targetEndpointIds };
  }

  await usageQueue.addBulk(
    targetEndpointIds.map((endpointId) => ({
      name: DELIVERY_JOB_NAME,
      data: {
        webhookEventId: event.id,
        endpointId,
        attempt: 1,
      },
      opts: {
        jobId: getWebhookDeliveryJobId(event.id, endpointId, 1),
        removeOnComplete: true,
        removeOnFail: true,
      },
    }))
  );

  await refreshWebhookEventStatus(event.id);

  return {
    enqueued: targetEndpointIds.length,
    targetEndpointIds,
  };
}

export async function createWebhookEventRecord(
  orgId: string,
  type: string,
  payload: unknown
) {
  const targetEndpointIds = await loadActiveEndpointIds(orgId, type);

  const event = await prisma.webhookEvent.create({
    data: {
      orgId,
      type,
      payload: normalizeJsonValue(payload),
      status:
        targetEndpointIds.length > 0
          ? WebhookEventStatus.PENDING
          : WebhookEventStatus.DELIVERED,
      targetEndpointIds,
    },
  });

  if (targetEndpointIds.length > 0) {
    await usageQueue.addBulk(
      targetEndpointIds.map((endpointId) => ({
        name: DELIVERY_JOB_NAME,
        data: {
          webhookEventId: event.id,
          endpointId,
          attempt: 1,
        },
        opts: {
          jobId: getWebhookDeliveryJobId(event.id, endpointId, 1),
          removeOnComplete: true,
          removeOnFail: true,
        },
      }))
    );
  }

  return event;
}
