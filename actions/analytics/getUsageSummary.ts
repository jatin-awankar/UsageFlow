"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

/**
 * Returns aggregated usage per metric for an organization.
 * This reads ONLY from aggregated_usage (fast, scalable).
 */
export async function getUsageSummary(
  userId: string,
  orgId: string
) {
  // 🔐 Authorization: all org members can view usage
  await requireRole(userId, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  const usage = await prisma.aggregatedUsage.findMany({
    where: { orgId },
    orderBy: { metricKey: "asc" },
  });

  return usage.map((row) => ({
    metric: row.metricKey,
    total: row.total,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    orgId: orgId,
  }));
}
