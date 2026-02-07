import { getMembership } from "@/lib/authz/getMembership";
import { Role } from "@prisma/client";

export async function requireRole(
  userId: string,
  orgId: string,
  allowedRoles: Role[]
) {
  const membership = await getMembership(userId, orgId);

  if (!membership) {
    throw new Error("NOT_A_MEMBER");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error("INSUFFICIENT_ROLE");
  }

  return membership;
}
