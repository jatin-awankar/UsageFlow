// src/lib/auth.ts
import prisma from "@/lib/prisma";

/**
 * TEMPORARY AUTH HELPER
 * ---------------------
 * This simulates an authenticated user.
 * We will replace this with NextAuth / Clerk later.
 */
export async function getCurrentUser() {
  /**
   * ⚠️ TEMPORARY:
   * Pick the first user from DB.
   * This is ONLY for development & analytics verification.
   */
  const user = await prisma.user.findFirst();

  if (!user) return null;

  /**
   * Also attach a currentOrgId
   * (again temporary, until org selector exists)
   */
  const membership = await prisma.membership.findFirst({
    where: {
        orgId: {
          in: await prisma.aggregatedUsage.findMany({
            select: { orgId: true },
            distinct: ["orgId"],
          }).then(rows => rows.map(r => r.orgId)),
        },
      },
  });

  if (!membership) return null;

  return {
    id: user.id,
    email: user.email,
    currentOrgId: membership.orgId,
  };
}
