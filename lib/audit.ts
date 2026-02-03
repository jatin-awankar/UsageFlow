import { prisma } from "@/lib/prisma";

type AuditInput = {
  orgId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog({
  orgId,
  userId,
  action,
  entity,
  entityId,
  metadata,
}: AuditInput) {

  // const orgExists = await prisma.organization.findUnique({
  //   where: { id: orgId },
  //   select: { id: true },
  // });

  // if (!orgExists) {
  //   console.error("Audit log skipped: org not found", { orgId });
  //   return;
  // }

  await prisma.auditLog.create({
    data: {
      orgId,
      userId,
      action,
      entity,
      entityId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
