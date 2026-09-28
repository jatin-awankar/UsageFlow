"use server";

import { Role } from "@prisma/client";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { rotateEndpointSecretForOwner } from "@/lib/webhooks/rotate-secret";

export async function rotateWebhookSecret(orgId: string, endpointId: string) {
  const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER]);
  return rotateEndpointSecretForOwner(orgId, endpointId, user.id);
}
