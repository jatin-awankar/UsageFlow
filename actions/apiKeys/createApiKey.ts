import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashkey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(
  name: string,
  userId: string,
  orgId: string
) {
  if (!name || name.length < 2) {
    throw new AppError("API key name too short or invalid", 400);
  }

  await requireRole(userId, orgId, permissions.createApiKey);

  const rawKey = crypto.randomUUID();
  const hashedKey = hashkey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      hashedKey,
      orgId,
    },
  });

  await writeAuditLog({
    orgId,
    userId,
    action: "API_KEY_CREATED",
    entity: "ApiKey",
    entityId: apiKey.id,
    metadata: { name: apiKey.name },
  });
  
  // await writeAuditLog({
  //   orgId,
  //   userId,
  //   action: "API_KEY_REVOKED",
  //   entity: "ApiKey",
  //   entityId: apiKey.id,
  // });    

  return rawKey;
}
