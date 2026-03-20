// app/actions/debug/testAuditLog.ts
"use server";

import { writeAuditLog } from "@/lib/audit";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import { Role } from "@prisma/client";

export async function testAuditLog(orgId: string, userId: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEBUG_ACTION_DISABLED");
  }

  void userId;

  const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN]);

  await writeAuditLog({
    orgId,
    userId: user.id,
    action: "DEBUG_TEST",
    entity: "Test",
    metadata: { hello: "world" },
  });
}
