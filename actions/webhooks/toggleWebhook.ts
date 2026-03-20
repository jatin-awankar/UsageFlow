// app/actions/toggleWebhook.ts
"use server";

import prisma from "@/lib/prisma";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";

export async function toggleWebhook(
  userId: string,
  orgId: string,
  webhookEndpointId: string,
  active: boolean,
) {
  void userId;

  const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);

  try {
    const result = await prisma.webhookEndpoint.updateMany({
      where: { id: webhookEndpointId, orgId },
      data: { active },
    });

    if (result.count === 0) {
      return { success: false, error: "Webhook endpoint not found" };
    }

    await writeAuditLog({
      orgId,
      userId: user.id,
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
