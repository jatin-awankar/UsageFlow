import prisma from "@/lib/prisma";

export function listWebhookEndpoints(orgId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, events: true, active: true, createdAt: true },
  });
}

export function listWebhookDeliveryLogs(orgId: string) {
  return prisma.webhookDelivery.findMany({
    where: { endpoint: { orgId } },
    select: { id: true, status: true, createdAt: true, responseCode: true,
      attempt: true, cycle: true, durationMs: true, startedAt: true,
      webhookEvent: { select: { type: true } }, endpoint: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listWebhookDeliveryLogsForActor(orgId: string, actorId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true },
  });
  if (!membership || !["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role))
    throw new Error("WEBHOOK_LOGS_FORBIDDEN");
  return prisma.webhookDelivery.findMany({
    where: { endpoint: { orgId }, webhookEvent: {
      orgId, ...(membership.role === "OWNER" ? {} : { billingRecordVersionId: null }),
    } },
    select: { id: true, status: true, createdAt: true, responseCode: true,
      attempt: true, cycle: true, durationMs: true, startedAt: true,
      webhookEvent: { select: { type: true } }, endpoint: { select: { id: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
}

export async function listBillingWebhookEventsForOwner(orgId: string, actorId: string) {
  const owner = await prisma.membership.findUnique({ where: { userId_orgId: { userId: actorId, orgId } }, select: { role: true } });
  if (owner?.role !== "OWNER") throw new Error("OWNER_REQUIRED");
  return listBillingWebhookEvents(orgId);
}

export function listBillingWebhookEvents(orgId: string) {
  return prisma.webhookEvent.findMany({
    where: { orgId, billingRecordVersionId: { not: null },
      type: { in: ["invoice.finalized", "invoice.revised"] } },
    select: { id: true, type: true, status: true, createdAt: true,
      targetEndpointIds: true, billingWebhookWork: { where: { endpoint: { orgId } },
        select: { endpointId: true, dueAt: true, attemptCount: true,
          cycle: true, completedAt: true, terminal: true,
          } },
      deliveries: { where: { endpoint: { orgId } },
        select: { endpointId: true, cycle: true, attempt: true, status: true,
          responseCode: true, responseBody: true, durationMs: true, startedAt: true, createdAt: true },
        orderBy: [{ cycle: "asc" }, { attempt: "asc" }] },
      billingWebhookReplays: { where: { orgId, endpoint: { orgId } },
        select: { endpointId: true, cycle: true, replayedAt: true },
        orderBy: { cycle: "asc" } },
      },
    orderBy: { createdAt: "desc" }, take: 100,
  }).then((events) => events.map((event) => ({ ...event,
    deliveries: event.deliveries.map(({ responseBody, ...attempt }) => ({ ...attempt,
      safeError: responseBody && ["Request timed out", "Connection failed",
        "Outcome uncertain after worker interruption", "Endpoint disabled"].includes(responseBody)
        ? responseBody : null,
    })),
  })));
}
