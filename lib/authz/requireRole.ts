import { AppError } from "@/lib/errors";
import { getMembership } from "@/lib/authz/getMembership";
import { Role } from "@/generated/prisma/enums";

export async function requireRole(
  userId: string,
  orgId: string,
  allowedRoles: Role[]
) {
  const membership = await getMembership(userId, orgId);

  if (!membership) {
    throw new AppError("Not a member of this organization", 403);
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  return membership;
}
