"use server";

import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validators";

export async function createOrganization(input: unknown) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const name = parsed.data.name.trim();
  const normalizedName = name.toLowerCase();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize create requests for equivalent org names.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedName}))`;

      const existingOrg = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Organization" WHERE LOWER(name) = ${normalizedName} LIMIT 1
      `;

      if (existingOrg.length > 0) {
        return {
          success: false,
          error: "An organization with this name already exists",
        } as const;
      }

      const org = await tx.organization.create({
        data: {
          name,
          memberships: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: "ORG_CREATED",
          entity: "Organization",
          entityId: org.id,
          metadata: { name: org.name },
        },
      });

      return { success: true, data: org } as const;
    });

    return result;
  } catch (error) {
    // Handle Prisma unique constraint errors as a fallback
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, error: "An organization with this name already exists" };
    }
    return { success: false, error: "Failed to create organization" };
  }
}
