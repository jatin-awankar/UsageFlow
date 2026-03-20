"use server"

import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { createMetricSchema } from "@/lib/validators";

export async function createMetric(
  userId: string,
  orgId: string,
  data: {
    name: string;
    key: string;
    unit: string;
  }
) {
  const parsed = createMetricSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Invalid Metric data", status: 400 };
  }

  void userId;

  const { user } = await requireCurrentOrgRole(orgId, permissions.createMetric);

  const normalizedKey = parsed.data.key.trim().toUpperCase();
  const normalizedName = parsed.data.name.trim();
  const normalizedUnit = parsed.data.unit.trim();

  // Business Logic
  const existing = await prisma.metric.findFirst({
    where: {
      orgId,
      key: normalizedKey,
    },
  });

  if (existing) {
    return { success: false, error: "Metric key already exists" };
  }

  try {
    const metric = await prisma.metric.create({
      data: {
        name: normalizedName,
        key: normalizedKey,
        unit: normalizedUnit,
        orgId,
      },
    });

    await writeAuditLog({
      orgId,
      userId: user.id,
      action: "METRIC_CREATED",
      entity: "Metric",
      entityId: metric.id,
      metadata: { key: metric.key },
    });

    return { success: true, data: metric };
  } catch (err) {
    console.log(err);
    return { success: false, error: "Metric key already exists" };
  }
}
