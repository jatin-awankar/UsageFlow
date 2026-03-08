"use server";

import { generateApiKey, hashApiKey } from "@/lib/apiKeys/generateKey";
import { writeAuditLog } from "@/lib/audit";
import { permissions } from "@/lib/authz/permissions";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { createWebhookEvent } from "@/actions/webhooks/createWebhookEvent";


export async function createApiKey(
  name: string,
  userId: string,
  orgId: string
) {
  if (!name || name.length < 2) {
    return {
      success: false,
      error: "API key name too short or invalid",
      statusCode: 400,
    };
  }

  await requireRole(userId, orgId, permissions.createApiKey);

  const rawKey = generateApiKey();
  const hashedKey = hashApiKey(rawKey);

  const existing = await prisma.apiKey.findFirst({
    where: { name, orgId }
  })

  if (existing) {
    return { success: false, error: "Duplicate ApiKey name", statusCode: 400 }
  }

  try {
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        hashedKey,
        orgId,
      },
    });

    const sideEffects = await Promise.allSettled([
      writeAuditLog({
        orgId,
        userId,
        action: "API_KEY_CREATED",
        entity: "ApiKey",
        entityId: apiKey.id,
        metadata: { name },
      }),
      createWebhookEvent(orgId, "api_key.created", {
        apiKeyId: apiKey.id,
        name,
      }),
    ]);

    const sideEffectErrors = sideEffects.filter(
      (item): item is PromiseRejectedResult => item.status === "rejected"
    );

    if (sideEffectErrors.length > 0) {
      console.error("API key created, but side effects failed", sideEffectErrors);
    }

    return { success: true, data: { id: apiKey.id, rawKey } };
  } catch (err) {
    console.error("Error creating ApiKey", err);
    return { success: false, error: "Error creating ApiKey", statusCode: 400 };
  }
}
