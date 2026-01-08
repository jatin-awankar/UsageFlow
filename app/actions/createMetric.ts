import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { createMetricSchema } from "@/lib/validators";

export async function createMetric(
  input: unknown,
  userId: string,
  orgId: string
) {
  const parsed = createMetricSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("Invalid input", 400);
  }

  // Authorization
  await requireRole(userId, orgId, permissions.createMetric);

  // Business Logic
  return prisma.metric.create({
    data: {
      ...parsed.data,
      orgId,
    },
  });
}
