import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validators";

export async function createOrganization(input: unknown, userId: string) {
  const parsed = createOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const name = parsed.data.name.trim();

  // Check for duplicate organization name (case-insensitive)
  const existingOrg = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Organization" WHERE LOWER(name) = LOWER(${name}) LIMIT 1
  `;

  if (existingOrg && existingOrg.length > 0) {
    return { success: false, error: "An organization with this name already exists" };
  }

  try {
    const org = await prisma.organization.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    await writeAuditLog({
      orgId: org.id,
      userId,
      action: "ORG_CREATED",
      entity: "Organization",
      entityId: org.id,
      metadata: { name: org.name },
    });

    return { success: true, data: org };
  } catch (error) {
    // Handle Prisma unique constraint errors as a fallback
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { error: "An organization with this name already exists" };
    }
    return { success: false, error: "Failed to create organization" };
  }
}
