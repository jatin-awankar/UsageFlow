// app/actions/createWebhookEndpoint.ts

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import crypto from "crypto";
import { createWebhookSchema } from "@/lib/validators";
import { Role } from "@/generated/prisma/enums";

export async function createWebhookEndpoint(
  input: unknown,
  userId: string,
  orgId: string
) {
  const parsed = createWebhookSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Invalid webhook data", 400);
  }

  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  return prisma.webhookEndpoint.create({
    data: {
      url: parsed.data.url,
      events: parsed.data.events,
      secret: crypto.randomUUID(),
      orgId,
    },
  });
}
