import { getMembership } from "@/lib/authz/getMembership";
import { Role } from "@prisma/client";

export async function requireRole(
  userId: string,
  orgId: string,
  allowedRoles: Role[]
) {
  const membership = await getMembership(userId, orgId);

  if (!membership) {
    return { success: false, error: "Not a member of this organization", status: 403 };
  }

  if (!allowedRoles.includes(membership.role)) {
    return { success: false, error: "Insufficient permissions", status: 403 };
  }

  return membership;
}
