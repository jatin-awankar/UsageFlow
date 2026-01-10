// app/actions/createWebhookEndpoint.ts

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";
import { createWebhookSchema } from "@/lib/validators";
import { Role } from "@/generated/prisma/enums";

export async function createWebhookEndpoint(
  input: unknown,
  userId: string,
  orgId: string
) {
  // 1️⃣ Validate input
  const parsed = createWebhookSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Invalid webhook data", 400);
  }

  // 2️⃣ Authorization
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  // 3️⃣ Create webhook endpoint
  const webhook = await prisma.webhookEndpoint.create({
    data: {
      url: parsed.data.url,
      events: parsed.data.events,
      secret: crypto.randomUUID(),
      orgId,
    },
  });

  // 4️⃣ Audit log (THIS WAS MISSING)
  await writeAuditLog({
    orgId,
    userId,
    action: "WEBHOOK_CREATED",
    entity: "WebhookEndpoint",
    entityId: webhook.id,
    metadata: {
      url: webhook.url,
      events: webhook.events,
    },
  });

  return webhook;
}
