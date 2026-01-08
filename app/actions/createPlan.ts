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

  return prisma.plan.create({
    data: {
      ...parsed.data,
      orgId,
    },
  });
}
