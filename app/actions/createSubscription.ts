import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { createSubscriptionSchema } from "@/lib/validators";

export async function createSubscription(
  input: unknown,
  userId: string,
  orgId: string
) {
  const parsed = createSubscriptionSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("Invalid subscription data", 400);
  }

  await requireRole(userId, orgId, permissions.createSubscription);

  const subscription = await prisma.subscription.create({
    data: {
      ...parsed.data,
      orgId,
      status: "ACTIVE",
    },
  });

  await writeAuditLog({
    orgId,
    userId,
    action: "SUBSCRIPTION_CREATED",
    entity: "Subscription",
    entityId: subscription.id,
  });

  return subscription;
}
