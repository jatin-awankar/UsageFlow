import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { createPlanSchema } from "@/lib/validators";

export async function createPlan(
  userId: string,
  orgId: string,
  data: {
    name: string;
    basePrice: number;
    billingPeriod: "MONTHLY";
  }
) {
  const parsed = createPlanSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Invalid Plan data", status: 400 };
  }

  await requireRole(userId, orgId, permissions.createPlan);

  try {
    const plan = await prisma.plan.create({
      data: {
        ...parsed.data,
        orgId,
      },
    });

    await writeAuditLog({
      orgId,
      userId,
      action: "PLAN_CREATED",
      entity: "Plan",
      entityId: plan.id,
      metadata: {
        name: plan.name,
        basePrice: plan.basePrice,
      },
    });

    return plan;
  } catch (err) {
    console.log(err);
    return { success: false, error: "Error Creating Plan" };
  }
}
