// /actions/getAuditLogs.ts
"use server";

import prisma from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/authz/requireRole";

export async function getAuditLogs({
  userId,
  orgId,
  pageSize = 5,
  cursor, // Optional unique ID of the last item from the previous page
  direction = "next",
}: {
  userId: string;
  orgId: string;
  pageSize?: number;
  cursor?: string;
  direction?: "next" | "prev";
}) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  const isNext = direction === "next";

  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    // A negative 'take' fetches items BEFORE the cursor
    take: isNext ? pageSize + 1 : -(pageSize + 1),
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      action: true,
      entity: true,
      metadata: true,
      createdAt: true,
    },
  });

  // If we went backward, Prisma returns items in reverse order. Fix it:
  const sortedLogs = isNext ? logs : [...logs].reverse();

  const hasMore = sortedLogs.length > pageSize;
  const data = hasMore
    ? (isNext ? sortedLogs.slice(0, -1) : sortedLogs.slice(1))
    : sortedLogs;

  return {
    data,
    prevCursor: data.length > 0 ? data[0].id : null,
    nextCursor: data.length > 0 ? data[data.length - 1].id : null,
    hasPrev: cursor ? (isNext || hasMore) : false, // Logic to show/hide buttons
    hasNext: isNext ? hasMore : true,
  };
}
