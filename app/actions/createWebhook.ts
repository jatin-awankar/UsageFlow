import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/validators";

export async function createWebhook(
  input: unknown,
  userId: string,
  orgId: string
) {
  const parsed = createWebhookSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("Invalid webhook URL", 400);
  }

  await requireRole(userId, orgId, permissions.createWebhook);

  return prisma.webhookEndpoint.create({
    data: {
      url: parsed.data.url,
      secret: crypto.randomUUID(),
      orgId,
    },
  });
}
