// app/actions/debug/testAuditLog.ts
"use server";

import { writeAuditLog } from "@/lib/audit";

export async function testAuditLog(orgId: string, userId: string) {
  await writeAuditLog({
    orgId,
    userId,
    action: "DEBUG_TEST",
    entity: "Test",
    metadata: { hello: "world" },
  });
}
