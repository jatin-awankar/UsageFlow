// app/actions/toggleWebhook.ts
"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";

export async function toggleWebhook(
  userId: string,
  orgId: string,
  webhookEndpointId: string,
  active: boolean,
) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  try {
    await prisma.webhookEndpoint.updateMany({
      where: { id: webhookEndpointId, orgId },
      data: { active },
    });

    await writeAuditLog({
      orgId,
      userId,
      action: active
        ? "WEBHOOK_ACTIVATED"
        : "WEBHOOK_DEACTIVATED",
      entity: "WebhookEndpoint",
      entityId: webhookEndpointId,
    });

    return { success: true, message: "Updated successfully" };
  } catch (err) {
    console.log("Something went wrong", err);
    return { success: false, error: "Something went wrong" }
  }

}
