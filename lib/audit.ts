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
