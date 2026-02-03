import { getMembership } from "@/lib/authz/getMembership";
import { Role } from "@prisma/client";

export async function requireRole(
  userId: string,
  orgId: string,
  allowedRoles: Role[]
) {
  const membership = await getMembership(userId, orgId);

  if (!membership) {
    // throw new AppError("Not a member of this organization", 403);
    return { ok: false, error: "NOT_MEMBER" };
  }

  if (!allowedRoles.includes(membership.role)) {
    // throw new AppError("Insufficient permissions", 403);
    return { ok: false, error: "INSUFFICIENT_ROLE" };
  }

  return membership;
}
