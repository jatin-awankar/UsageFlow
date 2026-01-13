import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { createPlanSchema } from "@/lib/validators";

export async function createPlan(
  input: unknown,
  userId: string,
  orgId: string
) {
  const parsed = createPlanSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  await requireRole(userId, orgId, permissions.createPlan);

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

  // await writeAuditLog({
  //   orgId,
  //   userId,
  //   action: "PLAN_UPDATED",
  //   entity: "Plan",
  //   entityId: plan.id,
  // });  

  return plan;
}
