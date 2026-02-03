// app/actions/createWebhookEndpoint.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";
import { createWebhookSchema } from "@/lib/validators";
import { Role } from "@prisma/client";

export async function createWebhookEndpoint(
  userId: string,
  orgId: string,
  data: {
    url: string;
    events: string[];
  },
) {
  // 1️⃣ Validate input
  const parsed = createWebhookSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("Invalid webhook data", 400);
  }

  const { url, events } = parsed.data;

  // 2️⃣ Authorization
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  const secret = crypto.randomBytes(32).toString("hex");

  // 3️⃣ Create webhook endpoint
  try {
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        orgId,
        url,
        events,
        secret,
        active: true,
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
        data: {
          url: webhook.url,
          events: webhook.events,
        },
      },
    });

    return { success: true, data: webhook };
  } catch (error) {
    console.error("Failed to create webhook endpoint", error);
    return {
      sucess: false,
      error: "Failed to create webhook endpoint",
      statusCode: 500,
    };
  }
}
