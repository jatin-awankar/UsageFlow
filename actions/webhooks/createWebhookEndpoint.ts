"use server";

import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { createWebhookSchema } from "@/lib/validators";
import { createEndpointForOwner } from "@/lib/webhooks/create-endpoint";
import { Role } from "@prisma/client";

export async function createWebhookEndpoint(userId: string, orgId: string, data: { url: string; events: string[] }) {
  void userId;
  const parsed = createWebhookSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid webhook data", status: 400 };
  const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER]);
  try {
    const endpoint = await createEndpointForOwner(orgId, user.id, parsed.data.url, parsed.data.events);
    return { success: true, data: endpoint };
  } catch {
    return { success: false, error: "Failed to create webhook endpoint", statusCode: 500 };
  }
}
