import { requireCurrentUser } from "@/lib/auth/session";
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

export async function requireCurrentOrgRole(
  orgId: string,
  allowedRoles: Role[]
) {
  const user = await requireCurrentUser();
  const membership = await requireRole(user.id, orgId, allowedRoles);

  return {
    membership,
    user,
  };
}
