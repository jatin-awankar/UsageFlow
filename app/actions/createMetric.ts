import { writeAuditLog } from "@/lib/audit";
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
  const metric = await prisma.metric.create({
    data: {
      ...parsed.data,
      orgId,
    },
  });

  await writeAuditLog({
    orgId,
    userId,
    action: "METRIC_CREATED",
    entity: "Metric",
    entityId: metric.id,
    metadata: { key: metric.key },
  });

  // await writeAuditLog({
  //   orgId,
  //   userId,
  //   action: "METRIC_UPDATED",
  //   entity: "Metric",
  //   entityId: metric.id,
  // });  

  return metric;
}
